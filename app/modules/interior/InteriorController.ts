import debug from 'debug'
import { Request, Response } from 'express'
import sharp from 'sharp'
import Utils from '../../utils/Utils'
import { ResponseOptions } from '../../utils/responses'
import InteriorRepository, { calculateImgSha } from './InteriorRepository'

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

      // TODO: Clean up logs, this log for example puts to much output
      // debug('mdesign:interior:controller')(`Got interiors: ${JSON.stringify(data)}`)

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

      debug('mdesign:interior:controller')(`Got interior: ${id}`)

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
        throw new Error('Please provide an image')
      }

      const { room, style, captchaToken } = req.body

      if (!captchaToken) {
        throw new Error('Please provide captcha token')
      }

      if (!room || !style) {
        throw new Error('Please provide room type and style')
      }

      const userIp = req.socket.remoteAddress

      if (!userIp) {
        throw new Error('No user remote IP address found')
      }

      if (!Utils.captchaVerify(captchaToken, userIp)) {
        throw new Error('Captcha verification failed')
      }

      const imgSharp = sharp(req.file.buffer)

      const imgMeta = await imgSharp.metadata()

      if (!imgMeta.width || !imgMeta.height || imgMeta.width > 1024 || imgMeta.height > 1024) {
        throw new Error(
          'Image is not of correct dimensions, please provide image with width <= 1024 and height <= 1024'
        )
      }

      const imageBase64 = (await imgSharp.toBuffer()).toString('base64')

      const imageName = calculateImgSha(`${imageBase64}+${room}+${style}`)

      // Create initial record for interior in database
      const interiorDoc = await InteriorRepository.createRecord(imageName, room, style)

      // As soon as we register record in database we return the id to user
      res.ok(interiorDoc)

      // Upload original image to google storage
      debug('mdesign:cloud-storage')('Uploading original interior image to google storage')

      await InteriorRepository.saveImageToGCP(imageName, imageBase64)

      // Saving each image to google storage will be additional 2% progress
      interiorDoc.progress! += 2

      await interiorDoc.save()

      /**
       * Start image generation using stable diffusion model
       */
      InteriorRepository.createDiffusionPredictions(interiorDoc, imageBase64, req.file.mimetype, room, style)

      debug('mdesign:ai:stable-diffusion')(
        `Started image generation using stable diffusion on ${imageBase64.substring(
          0,
          50
        )}... with room: ${room} and style: ${style}`
      )
    } catch (err: any) {
      // If response is already sent, we can't send another response
      if (!res.headersSent) {
        res.catchError(err)
      } else {
        // Handle error when res.ok got sent but rest of the function failed to execute
        debug('mdesign:interior:controller')(`Error occurred while creating interior: ${err.message}`)
      }
    }
  }

  /**
   *
   * @param req
   * @param res
   */
  static async createInteriorCallback(req: Request, res: Response & ResponseOptions) {
    try {
      await InteriorRepository.createInteriorCallback(req)
    } catch (err: any) {
      debug('mdesign:interior:controller')(`Error occurred while processing create interior callback: ${err.message}`)
    }

    res.ok('Ok')
  }
}

export default InteriorController
