import { Storage } from '@google-cloud/storage'
import got from 'got'
import { createHash } from 'node:crypto'
import path from 'node:path'
import Util from 'node:util'
import config from '../../../config'
import { InteriorType, Render } from './InteriorTypes'

class InteriorRepository {
  // GCP Bucket for uploading interior images
  static #bucket = new Storage({
    projectId: config.googleCloudStorage.projectId,
    keyFilename: path.join(config.googleCloudStorage.serviceAccountKey),
  }).bucket(config.googleCloudStorage.bucketName)

  static async getInteriors() {
    return []
  }

  static saveImageToGCP(image: string): string {
    const imageName = `${createHash('sha256').update(image).digest('hex')}.jpeg`
    const interiorImage = InteriorRepository.#bucket.file(`interiors/${imageName}`)
    interiorImage.save(Buffer.from(image, 'base64'))
    return imageName
  }

  static async saveToDB(inter: InteriorType) {
    const interior = { ...inter }

    if (!interior?.renders || !Array.isArray(interior.renders)) {
      throw new Error('Please provide renders')
    }

    const renders = interior.renders.slice()

    if (renders) {
      delete (interior as Partial<InteriorType>).renders
    }

    const interiorDoc = new global.db.InteriorModel(interior)

    renders.forEach((render) => {
      const renderDoc = new global.db.RenderModel({
        ...render,
        interior: interiorDoc._id,
      })

      renderDoc.save()

      interiorDoc.renders.push(renderDoc._id)
    })

    await interiorDoc.save()

    const resultInterior = (await interiorDoc.populate('renders', '-interior -id -__v')).toJSON()

    return resultInterior
  }

  static async createDiffusionPredictions(image: string, room: string, style: string): Promise<string[]> {
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
              image,
              prompt,
              inference_steps: 100,
              inference_strength: 0.65,
              inference_guidance_scale: 25,
              num_return_images: 3,
              generator_seed: -11,
            },
          ],
        },
      })
      .json<{ predictions: [][] }>()

    const diffusionPredictions = diffusionRes.predictions[0]

    return diffusionPredictions
  }

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
