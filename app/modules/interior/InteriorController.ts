import { Storage } from '@google-cloud/storage'
import debug from 'debug'
import { Request, Response } from 'express'
import got from 'got'
import { createHash } from 'node:crypto'
import path from 'node:path'
import Util from 'node:util'
import config from '../../../config'
import { ResponseOptions } from '../../utils/responses'
import InteriorRepository from './InteriorRepository'

class InteriorController {
  #interiorRepository: InteriorRepository

  constructor(interiorRepository: InteriorRepository) {
    this.#interiorRepository = interiorRepository
  }

  getInteriors = async (req: any, res: any) => {
    try {
      const data = await this.#interiorRepository.getInteriors()

      res.ok(data)
    } catch (err) {
      res.catchError(err)
    }
  }

  createInterior = async (req: Request, res: Response & ResponseOptions) => {
    try {
      if (!req.file) {
        throw new Error('Please provide an original image')
      }

      const { room, style } = req.body

      if (!room || !style) {
        throw new Error('Please provide room type and style')
      }

      const imageBase64 = Buffer.from(req.file.buffer).toString('base64')

      /**
       * NOTE: Start image generation using stable diffusion model
       */

      debug('mdesign:ai:stable-diffusion')(
        `Starting image generation using stable diffusion on ${imageBase64} with room: ${room} and style: ${style}`
      )

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
                image: imageBase64,
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

      debug('mdesign:ai:stable-diffusion')(
        `Received predictions from stable diffusion model: ${diffusionPredictions.length}`
      )

      /**
       * NOTE: Start object detection using detr-resnet model on newly created renders
       */

      diffusionPredictions.forEach(async (pred) => {
        debug('mdesign:ai:detr-resnet')(`Starting object detection using det-resnet model on ${pred}`)

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

        debug('mdesign:ai:detr-resnet')(`Received predictions from detr-resnet model: ${detrPredictions}`)
      })

      /**
       * NOTE: Connect and upload files to GCP Storage
       */

      const storage = new Storage({
        projectId: config.googleCloudStorage.projectId,
        keyFilename: path.join(config.googleCloudStorage.serviceAccountKey),
      })
      const bucket = storage.bucket(config.googleCloudStorage.bucketName)

      // Upload original image to google storage
      debug('mdesign:cloud-storage')('Uploading original interior image and newly created renders to google storage')

      const interiorImage = bucket.file(`interiors/${createHash('sha256').update(imageBase64).digest('hex')}.jpeg`)
      interiorImage.save(Buffer.from(imageBase64, 'base64'))

      // Upload newly created renders to google storage
      let renderImage
      diffusionPredictions.forEach((pred) => {
        renderImage = bucket.file(
          `interiors/${createHash('sha256').update(Buffer.from(pred, 'base64').toString('binary')).digest('hex')}.jpeg`
        )
        renderImage.save(Buffer.from(pred, 'base64'))
      })

      const data = await this.#interiorRepository.createInterior()

      res.ok(data)
    } catch (err) {
      res.catchError(err)
    }
  }
}

export default new InteriorController(new InteriorRepository())
