import debug from 'debug'
import { Request, Response } from 'express'
import { ResponseOptions } from '../../utils/responses'
import InteriorRepository from './InteriorRepository'
import type { InteriorType, Render } from './InteriorTypes'

/**
 *
 */
class InteriorController {
  /**
   *
   * @param req
   * @param res
   */
  static async getInteriors(req: Request, res: Response & ResponseOptions) {
    try {
      const { limit: _limit, skip: _skip } = req.query

      if (!_limit || !_skip) {
        throw new Error('Please provide limit and skip values')
      }

      const limit = Number(_limit)
      const skip = Number(_skip)

      if (Number.isNaN(limit) || Number.isNaN(skip)) {
        throw new Error('Please provide valid limit and skip values')
      }

      debug('mdesign:interior:controller')(`Getting interiors with limit: ${limit} and skip: ${skip}`)

      const data = await InteriorRepository.getInteriors({ limit, skip })

      debug('mdesign:interior:controller')(`Got interiors: ${JSON.stringify(data)}`)

      res.ok(data)
    } catch (err) {
      res.catchError(err)
    }
  }

  /**
   *
   * @param req
   * @param res
   */
  static async createInterior(req: Request, res: Response & ResponseOptions) {
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

      const diffusionPredictions = await InteriorRepository.createDiffusionPredictions(imageBase64, room, style)

      debug('mdesign:ai:stable-diffusion')(
        `Received predictions from stable diffusion model: ${diffusionPredictions.length}`
      )

      /**
       * NOTE: Start object detection using detr-resnet model on newly created renders
       */
      debug('mdesign:ai:detr-resnet')('Starting object detection using det-resnet model')

      const detrResNetPredictions = await InteriorRepository.createDETRResNetPredictions(diffusionPredictions)

      debug('mdesign:ai:detr-resnet')(`Received predictions from detr-resnet model: ${detrResNetPredictions}`)

      /**
       * NOTE: Connect and upload files to GCP Storage
       */

      // Upload original image to google storage
      debug('mdesign:cloud-storage')('Uploading original interior image and newly created renders to google storage')

      const interiorImageName = InteriorRepository.saveImageToGCP(imageBase64)

      // Create interior object which will be sent to repository
      const interior: InteriorType = {
        room,
        style,
        image: interiorImageName,
        renders: detrResNetPredictions as Render[],
      }

      // Upload newly created renders to google storage
      diffusionPredictions.forEach((pred, ind) => {
        const renderImageName = InteriorRepository.saveImageToGCP(pred)

        interior.renders[ind].image = renderImageName
      })

      /**
       * NOTE: Save final interior object to database.
       */

      debug('mdesign:interior:db')('Saving interior object to database...')

      const data = await InteriorRepository.saveToDB(interior)

      debug('mdesign:interior:db')(`Saved new interior with renders and objects to database: ${JSON.stringify(data)}`)

      res.ok(data)
    } catch (err) {
      res.catchError(err)
    }
  }
}

export default InteriorController
