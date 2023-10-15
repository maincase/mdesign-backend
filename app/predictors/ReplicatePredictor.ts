import got from 'got'
import pick from 'lodash.pick'
import { Document } from 'mongoose'
import Replicate, { Prediction } from 'replicate'
import config from '../../config'
import { InteriorType } from '../modules/interior/InteriorTypes'
import Predictor from './Predictor'

export default class ReplicatePredictor implements Predictor {
  #replicate = new Replicate({
    auth: config.replicate.REPLICATE_API_TOKEN,
  })

  // Should we enable refiner pipe for diffusion predictions
  #enableRefiner: boolean = true

  #initialProgress: number = 1.5

  #progress?: number

  #refinerInitialProgress?: number

  /**
   * Extract step by step progress from replicate logs.
   *
   * @param str - Replicate logs
   * @returns - Array of [progress, total] pairs
   */
  #parseProgress = (str: string = '0/0'): [progress: number, total: number][] => {
    const matches = str?.match(/(\d+)\/(\d+)/gm) ?? ['0/0']

    const progresses = matches.reduce(
      (prev, curr) => {
        const p = curr.split('/')

        const part = parseInt(p[0], 10) || 0
        const total = parseInt(p[1], 10) || 0

        if (total > 0) {
          if (prev.length > 0 && prev.at(-1)![1] === total) {
            prev.at(-1)![0] = part
          } else {
            prev.push([part, total])
          }
        }

        return prev
      },
      [] as [number, number][]
    )

    return progresses
  }

  /**
   *
   */
  #diffusionProgressCallback = (interiorDoc: InteriorType & Document) => async (pred: Prediction) => {
    const progresses = this.#parseProgress(pred.logs)

    if (progresses.length === 0) {
      return
    }

    // Get we got progress array from replicate logs, extract first progress
    const [part, total] = progresses[0]

    if (part > 0 && total > 0) {
      if (part <= total && !this.#refinerInitialProgress) {
        // If we have refiner pipe enabled, then SD inference will take 60 percent of total
        const totalInferencePercent = this.#enableRefiner ? 60 : 80

        this.#progress = this.#initialProgress + (part / total) * totalInferencePercent

        if (part === total) {
          this.#refinerInitialProgress = this.#progress
        }
      }

      if (progresses.length > 1 && !!this.#progress && !!this.#refinerInitialProgress && this.#enableRefiner) {
        const [partRefiner, totalRefiner] = progresses[1]

        if (partRefiner > 0 && totalRefiner > 0 && partRefiner <= totalRefiner) {
          // If we have refiner pipe enabled, then refiner inference will take 20 percent of total
          const totalRefinerPercent = 20

          this.#progress = this.#refinerInitialProgress + (partRefiner / totalRefiner) * totalRefinerPercent
        }
      }

      if (interiorDoc.progress !== this.#progress) {
        interiorDoc.progress = this.#progress
        await interiorDoc.save()
      }
    }
  }

  /**
   *
   * @param param0
   * @returns
   */
  async createDiffusionPredictions({
    interiorDoc,
    image,
    imageMimeType,
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
    const prompt = String(config.replicate.stableDiffusion.input.prompt)
      .replaceAll('${style}', style)
      .replaceAll('${room}', room)

    const predictionURL: `${string}/${string}:${string}` = config.replicate.stableDiffusion.URL

    const output = (await this.#replicate.run(
      predictionURL,
      {
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

          ...(this.#enableRefiner
            ? {
                refine: 'expert_ensemble_refiner', // 'base_image_refiner',

                // NOTE: If `refine` is `base_image_refiner`, give `refiner_steps`
                // refiner_steps: config.replicate.stableDiffusion.input['num_inference_steps'],
              }
            : {}),
        },
      },
      this.#diffusionProgressCallback(interiorDoc)
    )) as string[]

    let predictions: string[] = []

    for (const render of await Promise.all(output.map((renderUrl) => got(renderUrl, { responseType: 'buffer' })))) {
      predictions.push(render.body.toString('base64'))
    }

    return predictions
  }

  /**
   *
   * @param renders
   */
  async *createDETRResNetPredictions(renders: string[]) {
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
