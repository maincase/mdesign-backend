import { Storage } from '@google-cloud/storage'
import got from 'got'
import path from 'node:path'
import Util from 'node:util'
import * as R from 'remeda'
import config from '../../../config'
import Utils from '../../utils/Utils'
import { InteriorType } from './InteriorTypes'

class InteriorRepository {
  // GCP Bucket for uploading interior images
  static #bucket = new Storage({
    // projectId: config.googleCloud.projectId,
    keyFilename: path.join(config.googleCloud.storage.serviceAccountKey),
  }).bucket(config.googleCloud.storage.bucketName)

  static #gcpToken

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

    const resultInteriors = await global.db.InteriorModel.find()
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
  static async updateRecord(id: string, inter: InteriorType) {
    const interior = { ...inter }

    if (!interior?.renders || !Array.isArray(interior.renders)) {
      throw new Error('Please provide renders')
    }

    const renders = interior.renders.slice()

    if (renders) {
      delete (interior as Partial<InteriorType>).renders
    }

    const interiorDoc = await global.db.InteriorModel.findById(id)

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
    ).toJSON()

    return resultInterior
  }

  /**
   *
   * @param image
   * @param room
   * @param style
   * @returns
   */
  static async createDiffusionPredictions(
    id: string,
    image: string,
    room: string,
    style: string
  ): Promise<{ id: string; renders: [] }> {
    // Format prompt with input from user
    const prompt = Util.format(config.predictionProvider.stableDiffusion.prompt, room, style)

    const predictionURL = config.predictionProvider.stableDiffusion.URL as string

    if (!this.#gcpToken) {
      this.#gcpToken = await Utils.getGCPToken()
    }

    let headers

    if (predictionURL.includes('aiplatform.googleapis.com') && !!this.#gcpToken) {
      headers = { Authorization: `Bearer ${this.#gcpToken}` }
    }

    const diffusionRes = await got
      .post(predictionURL, {
        retry: {
          limit: 0,
        },
        ...(!!headers ? { headers } : {}),
        json: {
          instances: [
            {
              id,
              image,
              prompt,
              ...R.pick(config.predictionProvider.stableDiffusion, [
                'inference_steps',
                'inference_strength',
                'inference_guidance_scale',
                'num_return_images',
                'generator_seed',
              ]),
            },
          ],
        },
      })
      .json<{ predictions: { id: string; renders: [] }[] }>()

    const diffusionPredictions = diffusionRes.predictions[0]

    return diffusionPredictions
  }

  /**
   *
   * @param renders
   */
  static async *createDETRResNetPredictions(renders: string[]) {
    const predictionURL = config.predictionProvider.detrResNet.URL as string

    if (!this.#gcpToken) {
      this.#gcpToken = await Utils.getGCPToken()
    }

    let headers

    if (predictionURL.includes('aiplatform.googleapis.com') && !!this.#gcpToken) {
      headers = { Authorization: `Bearer ${this.#gcpToken}` }
    }

    let processedCount = 0

    while (processedCount < renders.length) {
      let pred = renders[processedCount]

      processedCount += 1

      const detrRes = await got
        .post(predictionURL, {
          retry: {
            limit: 0,
          },
          ...(!!headers ? { headers } : {}),
          json: {
            instances: [
              {
                image: pred,
              },
            ],
          },
        })
        .json<{ predictions: [][] }>()

      const detrPredictions = detrRes.predictions[0]

      yield {
        objects: detrPredictions,
      }
    }
  }
}

export default InteriorRepository
