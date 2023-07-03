import { Storage } from '@google-cloud/storage'
import got from 'got'
import { createHash } from 'node:crypto'
import path from 'node:path'
import Util from 'node:util'
import * as R from 'remeda'
import config from '../../../config'
import { InteriorType, Render } from './InteriorTypes'

class InteriorRepository {
  // GCP Bucket for uploading interior images
  static #bucket = new Storage({
    projectId: config.googleCloudStorage.projectId,
    keyFilename: path.join(config.googleCloudStorage.serviceAccountKey),
  }).bucket(config.googleCloudStorage.bucketName)

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
        transform: (render) => render.toJSON(),
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
   * Create interior initial record
   *
   * @returns mongo interior document
   */
  static async createRecord() {
    const interiorDoc = new global.db.InteriorProgressModel()

    return interiorDoc.save()
  }

  /**
   *
   * @param image
   * @returns
   */
  static saveImageToGCP(image: string): string {
    const imageName = `${createHash('sha256').update(image).digest('hex')}.jpeg`
    const interiorImage = InteriorRepository.#bucket.file(`interiors/${imageName}`)
    interiorImage.save(Buffer.from(image, 'base64'))
    return imageName
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

    const diffusionRes = await got
      .post(config.predictionProvider.stableDiffusion.URL, {
        retry: {
          limit: 0,
        },
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
   * @returns
   */
  static async createDETRResNetPredictions(renders: string[]): Promise<Partial<Render>[]> {
    const detrResNetPredictions: Partial<Render>[] = Array(renders.length).fill({})

    await Promise.all(
      renders.map(async (pred, ind) => {
        const detrRes = await got
          .post(config.predictionProvider.detrResNet.URL, {
            retry: {
              limit: 0,
            },
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

        detrResNetPredictions[ind].objects = detrPredictions
      })
    )

    return detrResNetPredictions
  }
}

export default InteriorRepository
