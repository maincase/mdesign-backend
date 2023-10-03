import debug from 'debug'
import got from 'got'
import pick from 'lodash.pick'
import { Document } from 'mongoose'
import config from '../../config'
import { InteriorType } from '../modules/interior/InteriorTypes'
import Utils from '../utils/Utils'
import Predictor from './Predictor'

export default class CustomPredictor extends Predictor {
  #gcpAiPlatformHostname = 'aiplatform.googleapis.com'

  #gcpToken

  /**
   *
   * @param param0
   * @returns
   */
  async createDiffusionPredictions({
    interiorDoc,
    image,
    style,
    room,
  }: {
    interiorDoc: InteriorType & Document
    image: string
    imageMimeType?: string
    style: string
    room: string
  }) {
    // Format prompt with input from user
    const prompt = String(config.predictionProvider.stableDiffusion.prompt)
      .replaceAll('${style}', style)
      .replaceAll('${room}', room)

    const predictionURL = config.predictionProvider.stableDiffusion.URL as string

    let headers

    if (predictionURL.includes(this.#gcpAiPlatformHostname)) {
      /**
       * NOTE: We should generate new token on each request as with current app engine scaling configuration in `app.yaml` file,
       *        we only have one instance running, causing single token to be used by all requests. Time outing this token
       *        causes VertexAI no longer to process requests.
       */
      // if (!this.#gcpToken) {
      this.#gcpToken = await Utils.getGCPToken()
      // }

      if (!!this.#gcpToken) {
        headers = { Authorization: `Bearer ${this.#gcpToken}` }
      } else {
        debug('mdesign:interior:ai:stable-diffusion')("Can't get GCP token!!!")

        throw new Error("Can't get GCP token!!!")
      }
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
              id: interiorDoc.id,
              image,
              prompt,
              ...pick(config.predictionProvider.stableDiffusion, [
                'negative_prompt',
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

    return diffusionPredictions.renders
  }

  /**
   *
   * @param renders
   */
  async *createDETRResNetPredictions(renders) {
    const predictionURL = config.predictionProvider.detrResNet.URL as string

    let headers

    if (predictionURL.includes(this.#gcpAiPlatformHostname)) {
      /**
       * NOTE: We should generate new token on each request as with current app engine scaling configuration in `app.yaml` file,
       *        we only have one instance running, causing single token to be used by all requests. Time outing this token
       *        causes VertexAI no longer to process requests.
       */
      // if (!this.#gcpToken) {
      this.#gcpToken = await Utils.getGCPToken()
      // }

      if (!!this.#gcpToken) {
        headers = { Authorization: `Bearer ${this.#gcpToken}` }
      } else {
        debug('mdesign:interior:ai:detr-resnet')("Can't get GCP token!!!")

        throw new Error("Can't get GCP token!!!")
      }
    }

    let processedCount = 0

    while (processedCount < renders.length) {
      let pred = renders[processedCount]

      debug('mdesign:interior:ai:detr-resnet')(pred, predictionURL, headers)

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
