import debug from 'debug'
import { Request, Response } from 'express'
import sharp from 'sharp'
import Utils from '../../utils/Utils'
import calculateImgSha from '../../utils/calculateImgSha'
import { ResponseOptions } from '../../utils/responses'
import InteriorRepository from './InteriorRepository'

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

      if (!captchaToken && process.env.NODE_ENV !== 'development') {
        throw new Error('Please provide captcha token')
      }

      if (!room || !style) {
        throw new Error('Please provide room type and style')
      }

      const userIp = req.socket.remoteAddress

      if (!userIp) {
        throw new Error('No user remote IP address found')
      }

      if (!Utils.captchaVerify(captchaToken, userIp) && process.env.NODE_ENV !== 'development') {
        throw new Error('Captcha verification failed')
      }

      const imgSharp = sharp(req.file.buffer)

      const imgMeta = await imgSharp.metadata()

      if (!imgMeta.width || !imgMeta.height || imgMeta.width > 1024 || imgMeta.height > 1024) {
        throw new Error(
          'Image is not of correct dimensions, please provide image with width <= 1024 and height <= 1024'
        )
      }

      const imgPng = imgSharp.png({
        quality: 100,
        compressionLevel: 0,
        force: true,
      })
      // const imgPngMeta = await imgPng.metadata()
      const imgPngBase64 = (await imgPng.toBuffer()).toString('base64')

      const imgJpeg = imgSharp.jpeg({
        quality: 80,
        progressive: true,
        force: true,
      })
      // const imgJpegMeta = await imgJpeg.metadata()
      const imgJpegBase64 = (await imgJpeg.toBuffer()).toString('base64')

      const originalImageName = calculateImgSha(`${imgPngBase64}+${room}+${style}`, 'png')
      const imageName = calculateImgSha(`${imgJpegBase64}+${room}+${style}`, 'jpeg')

      // Create initial record for interior in database
      const interiorDoc = await InteriorRepository.createRecord(imageName, room, style)

      // As soon as we register record in database we return the id to user
      res.ok(interiorDoc)

      // Upload original image to google storage
      debug('mdesign:cloud-storage')('Uploading original interior image to google storage')

      await InteriorRepository.saveImageToGCP(`${interiorDoc.id}-${originalImageName}`, imgPngBase64)
      await InteriorRepository.saveImageToGCP(`${interiorDoc.id}-${imageName}`, imgJpegBase64)

      // Saving each image to google storage will be additional 2% progress
      interiorDoc.progress! += 2

      await interiorDoc.save()

      /**
       * Start image generation using stable diffusion model
       */
      InteriorRepository.createDiffusionPredictions(interiorDoc, imgPngBase64, 'image/png', room, style)

      debug('mdesign:ai:stable-diffusion')(
        `Started image generation using stable diffusion on ${interiorDoc.id}-${imageName}, with room: ${room} and style: ${style}`
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
