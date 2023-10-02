import { Storage } from '@google-cloud/storage'
import path from 'node:path'
import config from '../../../config'
import CustomPredictor from '../../predictors/CustomPredictor'
import ReplicatePredictor from '../../predictors/ReplicatePredictor'
import { InteriorType } from './InteriorTypes'

class InteriorRepository {
  // GCP Bucket for uploading interior images
  static #bucket = new Storage({
    // projectId: config.googleCloud.projectId,
    keyFilename: path.join(config.googleCloud.storage.serviceAccountKey),
  }).bucket(config.googleCloud.storage.bucketName)

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
    imageMimeType: string,
    room: string,
    style: string
  ): Promise<{ id: string; renders: string[] }> {
    let res = { id, renders: [] as string[] }

    if (!!config?.replicate?.stableDiffusion) {
      res.renders.push(...(await ReplicatePredictor.createDiffusionPredictions({ image, imageMimeType, room, style })))
    } else if (!!config?.predictionProvider?.stableDiffusion) {
      res.renders.push(...(await CustomPredictor.createDiffusionPredictions({ id, image, room, style })))
    }

    return res
  }

  /**
   *
   * @param renders
   */
  static async *createDETRResNetPredictions(renders: string[]) {
    if (!!config?.replicate?.detrResNet) {
      return yield* ReplicatePredictor.createDETRResNetPredictions(renders)
    } else if (!!config?.predictionProvider?.detrResNet) {
      return yield* CustomPredictor.createDETRResNetPredictions(renders)
    }

    return yield* []
  }
}

export default InteriorRepository
