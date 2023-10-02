import got from 'got'
import pick from 'lodash.pick'
import Replicate from 'replicate'
import config from '../../config'
import Predictor from './Predictor'

export default class ReplicatePredictor extends Predictor {
  static #replicate = new Replicate({
    auth: config.replicate.REPLICATE_API_TOKEN,
  })

  static async createDiffusionPredictions({
    image,
    imageMimeType,
    style,
    room,
  }: {
    image: string
    imageMimeType: string
    style: string
    room: string
  }) {
    // Format prompt with input from user
    const prompt = String(config.replicate.stableDiffusion.input.prompt)
      .replaceAll('${style}', style)
      .replaceAll('${room}', room)

    const predictionURL: `${string}/${string}:${string}` = config.replicate.stableDiffusion.URL

    const output = (await this.#replicate.run(predictionURL, {
      input: {
        image: `data:${imageMimeType};base64,${image}`,
        prompt,
        ...pick(config.replicate.stableDiffusion.input, [
          'negative_prompt',
          'num_inference_steps',
          'prompt_strength',
          'guidance_scale',
          'num_outputs',
          'seed',
        ]),
      },
      // webhook: 'https://example.com/your-webhook',
      // webhook_events_filter: ['completed'],
    })) as string[]

    let predictions: string[] = []

    for (const render of await Promise.all(output.map((renderUrl) => got(renderUrl, { responseType: 'buffer' })))) {
      predictions.push(render.body.toString('base64'))
    }

    return predictions
  }

  static async *createDETRResNetPredictions(renders: string[]) {
    const predictionURL: `${string}/${string}:${string}` = config.replicate.detrResNet.URL

    let processedCount = 0

    while (processedCount < renders.length) {
      let pred = renders[processedCount]

      processedCount += 1

      const output = (await this.#replicate.run(predictionURL, {
        input: {
          image: `data:image/png;base64,${pred}`,
        },
      })) as []

      yield {
        objects: output,
      }
    }
  }
}
