import debug from 'debug'
import { Document } from 'mongoose'
import config from '../../config'
import { InteriorType } from '../modules/interior/InteriorTypes'
import Utils from '../utils/Utils'
import pick from '../utils/pick'
import Predictor from './Predictor'

export default class CustomPredictor implements Predictor {
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
    const prompt = String(config.predictionProvider.mdesign.stableDiffusion.prompt)
      // eslint-disable-next-line no-template-curly-in-string
      .replaceAll('${style}', style)
      // eslint-disable-next-line no-template-curly-in-string
      .replaceAll('${room}', room)

    const predictionURL = config.predictionProvider.mdesign.stableDiffusion.URL as string

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

      if (this.#gcpToken) {
        headers = { Authorization: `Bearer ${this.#gcpToken}` }
      } else {
        debug('mdesign:interior:ai:stable-diffusion')("Can't get GCP token!!!")

        throw new Error("Can't get GCP token!!!")
      }
    }

    const diffusionRes = await (
      await fetch(predictionURL, {
        method: 'POST',
        headers: {
          // Include any headers you need. If headers variable exists, spread its contents here
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              id: interiorDoc.id,
              image,
              prompt,
              ...pick(config.predictionProvider.mdesign.stableDiffusion, [
                'negative_prompt',
                'inference_steps',
                'inference_strength',
                'inference_guidance_scale',
                'num_return_images',
                'generator_seed',
              ]),
            },
          ],
        }),
      })
    ).json()

    const diffusionPredictions = diffusionRes.predictions[0]

    return diffusionPredictions.renders
  }

  /**
   *
   * @param renders
   */
  async *createDETRResNetPredictions(
    renders: string[]
  ): AsyncGenerator<[count: number, item: { objects: [] }], void, unknown> {
    const predictionURL = config.predictionProvider.mdesign.detrResNet.URL as string

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

      if (this.#gcpToken) {
        headers = { Authorization: `Bearer ${this.#gcpToken}` }
      } else {
        debug('mdesign:interior:ai:detr-resnet')("Can't get GCP token!!!")

        throw new Error("Can't get GCP token!!!")
      }
    }

    let processedCount = 0

    while (processedCount < renders.length) {
      const pred = renders[processedCount]

      processedCount += 1

      const image = pred.match(/.*.(jpeg|png|jpg)/)
        ? `https://storage.googleapis.com/${config.googleCloud.storage.bucketName}/interiors/${pred}`
        : pred

      /* eslint-disable no-await-in-loop */
      const detrRes = await (
        await fetch(predictionURL, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              image,
            },
          }),
        })
      ).json()
      /* eslint-enable no-await-in-loop */

      const detrPredictions = detrRes.output

      yield [
        processedCount - 1,
        {
          objects: detrPredictions,
        },
      ]
    }
  }
}
