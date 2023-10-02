import debug from 'debug'
import got from 'got'
import pick from 'lodash.pick'
import config from '../../config'
import Utils from '../utils/Utils'
import Predictor from './Predictor'

export default class CustomPredictor extends Predictor {
  static #gcpAiPlatformHostname = 'aiplatform.googleapis.com'

  static #gcpToken

  static async createDiffusionPredictions({
    id,
    image,
    style,
    room,
  }: {
    id: string
    image: string
    style: string
    room: string
  }) {
    // Format prompt with input from user
    const prompt = String(config.predictionProvider.stableDiffusion.prompt)
      .replaceAll('${style}', style)
      .replaceAll('${room}', room)

    const predictionURL = config.predictionProvider.stableDiffusion.URL as string

    let headers

    if (predictionURL.includes(CustomPredictor.#gcpAiPlatformHostname)) {
      /**
       * NOTE: We should generate new token on each request as with current app engine scaling configuration in `app.yaml` file,
       *        we only have one instance running, causing single token to be used by all requests. Time outing this token
       *        causes VertexAI no longer to process requests.
       */
      // if (!this.#gcpToken) {
      CustomPredictor.#gcpToken = await Utils.getGCPToken()
      // }

      if (!!CustomPredictor.#gcpToken) {
        headers = { Authorization: `Bearer ${CustomPredictor.#gcpToken}` }
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
              id,
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

  static async *createDETRResNetPredictions(renders: string[]) {
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
