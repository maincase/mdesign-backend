import debug from 'debug'
import { Request, Response } from 'express'
import { createHash } from 'node:crypto'
import { ResponseOptions } from '../../utils/responses'
import InteriorRepository from './InteriorRepository'
import type { InteriorType, Render } from './InteriorTypes'

const calculateImgSha = (image) => `${createHash('sha256').update(image).digest('hex')}.jpeg`

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
  static async getInterior(req: Request, res: Response & ResponseOptions) {
    try {
      const { id } = req.params

      if (!id) {
        throw new Error('No interior id provided')
      }

      debug('mdesign:interior:controller')(`Getting interior with id: ${id}`)

      const data = await InteriorRepository.getInteriorById(id)

      debug('mdesign:interior:controller')(`Got interior: ${JSON.stringify(data)}`)

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

      const imageName = calculateImgSha(`${imageBase64}+${room}+${style}`)

      // Create initial record for interior in database
      const interiorDoc = await InteriorRepository.createRecord(imageName, room, style)

      // As soon as we register record in database we return the id to user
      res.ok(interiorDoc)

      /**
       * NOTE: Start image generation using stable diffusion model
       */
      debug('mdesign:ai:stable-diffusion')(
        `Starting image generation using stable diffusion on ${imageBase64} with room: ${room} and style: ${style}`
      )

      const diffusionPredictions = await InteriorRepository.createDiffusionPredictions(
        interiorDoc.id,
        imageBase64,
        room,
        style
      )

      debug('mdesign:ai:stable-diffusion')(
        `Received predictions from stable diffusion model: ${diffusionPredictions.renders.length}`
      )

      /**
       * NOTE: Start object detection using detr-resnet model on newly created renders
       */
      debug('mdesign:ai:detr-resnet')('Starting object detection using det-resnet model')

      const detrResNetPredictions = await InteriorRepository.createDETRResNetPredictions(diffusionPredictions.renders)

      debug('mdesign:ai:detr-resnet')(`Received predictions from detr-resnet model: ${detrResNetPredictions}`)

      /**
       * NOTE: Connect and upload files to GCP Storage
       */

      // Upload original image to google storage
      debug('mdesign:cloud-storage')('Uploading original interior image and newly created renders to google storage')

      await InteriorRepository.saveImageToGCP(imageName, imageBase64)

      // Create interior object which will be sent to repository
      const interior: InteriorType = {
        room,
        style,
        image: imageName,
        renders: detrResNetPredictions as Render[],
      }

      // Upload newly created renders to google storage
      for (const [ind, pred] of diffusionPredictions.renders.entries()) {
        const renderImageName = calculateImgSha(pred)

        await InteriorRepository.saveImageToGCP(renderImageName, pred)

        interior.renders[ind].image = renderImageName
      }

      debug('mdesign:interior:db')('Saving interior object to database...')

      // Save final interior object to database.
      const data = await InteriorRepository.updateRecord(interiorDoc.id, interior)

      debug('mdesign:interior:db')(`Saved new interior with renders and objects to database: ${JSON.stringify(data)}`)
    } catch (err: any) {
      // NOTE: If response is already sent, we can't send another response
      if (!res.headersSent) {
        res.catchError(err)
      } else {
        // NOTE: Handle error when res.ok got sent but rest of the function failed to execute
        debug('mdesign:interior:controller')(`Error occurred while creating interior: ${err.message}`)
      }
    }
  }
}

export default InteriorController
