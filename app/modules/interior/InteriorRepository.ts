import { Storage } from '@google-cloud/storage'
import debug from 'debug'
import pick from 'lodash.pick'
import { Document, FlattenMaps } from 'mongoose'
import { createHash } from 'node:crypto'
import path from 'node:path'
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

  // Current active interior renders
  static activeRenderDocs: Record<string, Awaited<ReturnType<typeof InteriorRepository.createRecord>>> = {}

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

    return resultInteriors
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

    return resultInterior
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
  static async updateRecord(
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
    if (!!config?.replicate?.[predKey]) {
      return new ReplicatePredictor()
    } else if (!!config?.predictionProvider?.[predKey]) {
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
    this.activeRenderDocs[interiorDoc.id] = interiorDoc

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
   * @param interiorDoc
   * @param diffusionPredictions
   */
  static async processDiffusionPredictions({ id, renders }: { id: string; renders: string[] }) {
    const interiorDoc = this.activeRenderDocs[id]

    debug('mdesign:ai:stable-diffusion')(`Received predictions from stable diffusion model: ${renders.length}`)

    // Finished with rendering new interiors, and we have total of 81.5% progress including initial db record progress
    interiorDoc.progress = 83.5

    /**
     * Start object detection using detr-resnet model on newly created renders
     */
    debug('mdesign:ai:detr-resnet')('Starting object detection using det-resnet model')

    const detrResNetPredictions: Render[] = []

    // Upload newly created renders to google storage
    for (const [ind, pred] of renders.entries()) {
      const renderImageName = calculateImgSha(pred)

      await InteriorRepository.saveImageToGCP(renderImageName, pred)

      detrResNetPredictions[ind] = {
        image: renderImageName,
      } as Render

      interiorDoc.progress += 2

      await interiorDoc.save()
    }

    for await (const [ind, pred] of InteriorRepository.createDETRResNetPredictions(
      detrResNetPredictions.map((r) => r.image)
    )) {
      detrResNetPredictions[ind].objects = pred.objects

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
    const data = await this.updateRecord(this.activeRenderDocs[interiorDoc.id], interior)

    debug('mdesign:interior:db')(`Saved new interior with renders and objects to database: ${data?._id}`)

    // After prediction is done, remove interior doc from active renders
    delete this.activeRenderDocs[interiorDoc.id]
  }

  /**
   *
   * @param renders
   */
  static async *createDETRResNetPredictions(renders: string[]) {
    // Setup the predictor
    const predictor = this.#setupPredictor('detrResNet')

    return yield* predictor.createDETRResNetPredictions(renders)
  }
}

export default InteriorRepository
