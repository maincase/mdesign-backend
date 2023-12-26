import { Storage } from '@google-cloud/storage'
import vision from '@google-cloud/vision'
import debug from 'debug'
import { Request } from 'express'
import got from 'got'
import pick from 'lodash.pick'
import { Document, FlattenMaps } from 'mongoose'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'
import config from '../../../config'
import CustomPredictor from '../../predictors/CustomPredictor'
import ReplicatePredictor from '../../predictors/ReplicatePredictor'
import { InteriorType, Render } from './InteriorTypes'

export const calculateImgSha = (image) => `${createHash('sha256').update(image).digest('hex')}.jpeg`

class InteriorRepository {
  // GCP Bucket for uploading interior images
  static #bucket = new Storage({
    // projectId: config.googleCloud.projectId,
    keyFilename: path.join(config.googleCloud.storage.serviceAccountKey),
  }).bucket(config.googleCloud.storage.bucketName)

  // Google Vision image annotator client
  static #annotatorClient = new vision.ImageAnnotatorClient({
    // projectId: config.googleCloud.projectId,
    keyFilename: path.join(config.googleCloud.storage.serviceAccountKey),
  })

  // Current active interior renders
  static #activeRenderDocs: Record<string, Awaited<ReturnType<typeof InteriorRepository.createRecord>>> = {}

  // Callback timer and queue for processing callbacks
  static #callbackTimer: NodeJS.Timeout | undefined = undefined

  static #callbackQueue: (() => void)[] = []

  /**
   *
   * @param interiorResult
   * @returns
   */
  static #filterInteriorResults(interiorResults: InteriorType[]) {
    return (interiorResults ?? []).map((interior) => ({
      ...interior,
      renders: interior.renders.map((render) => ({
        ...render,
        objects: render.objects.map((obj) => {
          if (Array.isArray(obj?.[3])) {
            const objNew = [...obj]

            // eslint-disable-next-line no-restricted-syntax
            for (const [ind, val] of (obj?.[3] ?? []).entries()) {
              const link = val?.link
              objNew[3][ind] = link
            }

            return objNew
          }

          return obj
        }),
      })),
    }))
  }

  /**
   * Get interiors with pagination
   *
   * @returns array of interiors
   */
  static async getInteriors({ limit: _limit, skip }: { limit: number; skip: number }) {
    let limit = _limit

    if (limit > config.paginationLimit) {
      limit = config.paginationLimit
    }

    const resultInteriors = await global.db.InteriorModel.find({ progress: { $eq: 100 } })
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .transform((interiors) => interiors.map((interior) => interior.toJSON()))
      .populate({
        path: 'renders',
        select: '-interior -createdAt -__v',
        transform: (render) => render?.toJSON(),
      })

    return this.#filterInteriorResults(resultInteriors)
  }

  /**
   *  Get specific interior by id
   *
   * @param id
   * @returns
   */
  static async getInteriorById(id: string) {
    const resultInterior = await global.db.InteriorModel.findById(id).populate({
      path: 'renders',
      select: '-interior -createdAt -__v',
      transform: (render) => render.toJSON(),
    })

    if (resultInterior) {
      return this.#filterInteriorResults([resultInterior.toJSON()])?.[0]
    }

    return null
  }

  /**
   *
   * @param image
   * @param room
   * @param style
   * @param initialProgress When creating interior record, record creation itself is 1.5% progress of total progress
   * @returns mongo interior document
   */
  static async createRecord(image: string, room: string, style: string, initialProgress: number = 1.5) {
    const interiorDoc = new global.db.InteriorModel()
    interiorDoc.image = image
    interiorDoc.room = room
    interiorDoc.style = style

    interiorDoc.progress = initialProgress

    return interiorDoc.save()
  }

  /**
   *
   * @param image
   * @returns
   */
  static saveImageToGCP(name: string, image: string) {
    const interiorImage = this.#bucket.file(`interiors/${name}`)

    return interiorImage.save(Buffer.from(image, 'base64'))
  }

  /**
   *
   * @param inter
   * @returns
   */
  static async #updateRecord(
    interiorDoc: Awaited<ReturnType<typeof InteriorRepository.createRecord>>,
    inter: InteriorType
  ): Promise<FlattenMaps<InteriorType & Document<InteriorType>>> {
    const interior = { ...inter }

    if (!interior?.renders || !Array.isArray(interior.renders)) {
      throw new Error('Please provide renders')
    }

    const renders = interior.renders.slice()

    if (renders) {
      delete (interior as Partial<InteriorType>).renders
    }

    if (!interiorDoc) {
      throw new Error('Interior not found')
    }

    interiorDoc.set(interior)

    renders.forEach((render) => {
      const renderDoc = new global.db.RenderModel({
        ...render,
        interior: interiorDoc.id,
      })

      renderDoc.save()

      interiorDoc.renders.push(renderDoc.id)
    })

    await interiorDoc.save()

    const resultInterior = (
      await interiorDoc.populate({
        path: 'renders',
        select: '-interior -__v -createdAt',
        transform: (render) => render.toJSON(),
      })
    ).toJSON<InteriorType & Document<InteriorType>>()

    return resultInterior
  }

  /**
   * Setup predictor based on predictor key
   *
   * @param predKey
   * @returns
   */
  static #setupPredictor(predKey: string) {
    if (config?.replicate?.[predKey]) {
      return new ReplicatePredictor()
    }

    if (config?.predictionProvider?.[predKey]) {
      return new CustomPredictor()
    }

    throw new Error('No predictor provided')
  }

  /**
   *
   * @param image
   * @param room
   * @param style
   * @returns
   */
  static createDiffusionPredictions(
    interiorDoc: Awaited<ReturnType<typeof InteriorRepository.createRecord>>,
    image: string,
    imageMimeType: string,
    room: string,
    style: string
  ) {
    // Add document to active renders
    this.#activeRenderDocs[interiorDoc.id] = interiorDoc

    // Setup the predictor
    const predictor = this.#setupPredictor('stableDiffusion')

    predictor.createDiffusionPredictions(
      predictor instanceof ReplicatePredictor
        ? { interiorDoc, image, imageMimeType, room, style }
        : { interiorDoc, image, room, style }
    )
  }

  /**
   *
   * @returns
   */
  static #startCallbackProcessing() {
    const callback = this.#callbackQueue.shift()

    if (callback) {
      this.#callbackTimer = setTimeout(() => {
        callback()

        clearTimeout(this.#callbackTimer)

        if (this.#callbackQueue.length > 0) {
          this.#startCallbackProcessing()
        } else {
          this.#callbackTimer = undefined
        }
      }, 300)
    }
  }

  /**
   *
   * @param req
   * @param res
   */
  static async createInteriorCallback(req: Request) {
    if (req.body.status === 'succeeded') {
      const { output } = req.body

      const predictions: string[] = []
      // eslint-disable-next-line no-restricted-syntax
      for (const render of await Promise.all(output.map((renderUrl) => got(renderUrl, { responseType: 'buffer' })))) {
        predictions.push(render.body.toString('base64'))
      }

      this.#callbackQueue.push(() =>
        this.#processDiffusionPredictions({
          id: req.query.id as string,
          renders: predictions,
        })
      )
    } else {
      const predictor = new ReplicatePredictor()

      const interiorDoc = this.#activeRenderDocs[req.query.id as string]

      this.#callbackQueue.push(() => predictor.diffusionProgressCallback(interiorDoc)(req.body))
    }

    if (!this.#callbackTimer) {
      this.#startCallbackProcessing()
    }
  }

  /**
   *
   */
  static async #matchObjectsToProducts(render: Render & { imageContent: string }) {
    return Promise.all(
      render.objects.map(async (obj) => {
        if (Array.isArray(obj) && obj?.length === 3 && obj?.[1] > 0.8 && obj?.[2]?.length === 4) {
          const contentSharp = sharp(Buffer.from(render.imageContent, 'base64')).extract({
            left: Math.round(obj?.[2]?.[0]),
            top: Math.round(obj?.[2]?.[1]),
            width: Math.round(obj?.[2]?.[2] ?? 0) - Math.round(obj?.[2]?.[0] ?? 0),
            height: Math.round(obj?.[2]?.[3] ?? 0) - Math.round(obj?.[2]?.[1] ?? 0),
          })

          const contentObj = (await contentSharp.toBuffer()).toString('base64')

          const [response] = await this.#annotatorClient.batchAnnotateImages({
            requests: [
              {
                image: { content: contentObj },
                features: [{ type: 'PRODUCT_SEARCH' }],
                imageContext: {
                  productSearchParams: {
                    productSet: config.googleCloud.vision.productSet,
                    productCategories: [config.googleCloud.vision.productCategory],
                    // filter: filter,
                  },
                },
              },
            ],
          })

          const similarProds = response.responses?.[0]?.productSearchResults?.results?.slice(0, 3) // return 3 most similar images

          const matchingProducts = await global.db.ProductModel.find({
            asin: {
              $in: similarProds?.map((prod) => prod.product?.displayName),
            },
          })

          if (matchingProducts.length > 0) {
            obj.push(matchingProducts?.map((prod) => pick(prod, ['_id', 'link'])))
          }
        }
      })
    )
  }

  /**
   *
   * @param interiorDoc
   * @param diffusionPredictions
   */
  static async #processDiffusionPredictions({ id, renders }: { id: string; renders: string[] }) {
    const interiorDoc = this.#activeRenderDocs[id]

    debug('mdesign:ai:stable-diffusion')(`Received predictions from stable diffusion model: ${renders.length}`)

    // Finished with rendering new interiors, and we have total of 81.5% progress including initial db record progress
    interiorDoc.progress = 83.5

    /**
     * Start object detection using detr-resnet model on newly created renders
     */
    debug('mdesign:ai:detr-resnet')('Starting object detection using det-resnet model')

    const detrResNetPredictions: Render[] = []

    // Upload newly created renders to google storage
    // eslint-disable-next-line no-restricted-syntax
    for (const [ind, pred] of renders.entries()) {
      const renderImageName = calculateImgSha(pred)

      // eslint-disable-next-line no-await-in-loop
      await this.saveImageToGCP(renderImageName, pred)

      detrResNetPredictions[ind] = {
        image: renderImageName,
        imageContent: pred,
      } as Render & { imageContent: string }

      interiorDoc.progress += 2

      // eslint-disable-next-line no-await-in-loop
      await interiorDoc.save()
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const [ind, pred] of this.#createDETRResNetPredictions(detrResNetPredictions.map((r) => r.image))) {
      detrResNetPredictions[ind].objects = pred.objects

      try {
        // Try to find matching products in google vision database to objects in new renders
        await this.#matchObjectsToProducts(detrResNetPredictions[ind] as Render & { imageContent: string })
      } catch (err) {
        debug('mdesign:ai:detr-resnet')('Error while matching objects to products', err)
      }

      // Each object prediction done on each of the new renders will be additional 3% progress
      interiorDoc.progress += 3

      await interiorDoc.save()
    }

    debug('mdesign:ai:detr-resnet')(
      `Received predictions from detr-resnet model: ${detrResNetPredictions.length} objects`
    )

    /**
     * Connect and upload files to GCP Storage
     */

    // Create interior object which will be sent to repository
    const interior: InteriorType = {
      ...pick(interiorDoc, ['room', 'style', 'image']),
      renders: detrResNetPredictions as Render[],
    }

    // Saving final record to database is additional 1.5% progress
    interior.progress = interiorDoc.progress + 1.5

    debug('mdesign:interior:db')('Saving interior object to database...')

    // Save final interior object to database.
    const data = await this.#updateRecord(this.#activeRenderDocs[interiorDoc.id], interior)

    debug('mdesign:interior:db')(`Saved new interior with renders and objects to database: ${data?.id}`)

    // After prediction is done, remove interior doc from active renders
    delete this.#activeRenderDocs[interiorDoc.id]
  }

  /**
   *
   * @param renders
   */
  static async *#createDETRResNetPredictions(renders: string[]) {
    // Setup the predictor
    const predictor = this.#setupPredictor('detrResNet')

    return yield* predictor.createDETRResNetPredictions(renders)
  }
}

export default InteriorRepository
