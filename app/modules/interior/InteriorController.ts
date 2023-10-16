import debug from 'debug'
import { Request, Response } from 'express'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import ReplicatePredictor from '../../predictors/ReplicatePredictor'
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

      const { room, style } = req.body

      if (!room || !style) {
        throw new Error('Please provide room type and style')
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

      /**
       * NOTE: Start image generation using stable diffusion model
       */
      debug('mdesign:ai:stable-diffusion')(
        `Starting image generation using stable diffusion on ${imageBase64.substring(
          0,
          50
        )}... with room: ${room} and style: ${style}`
      )

      const diffusionPredictions = await InteriorRepository.createDiffusionPredictions(
        interiorDoc,
        imageBase64,
        req.file.mimetype,
        room,
        style
      )

      debug('mdesign:ai:stable-diffusion')(
        `Received predictions from stable diffusion model: ${diffusionPredictions.renders.length}`
      )

      // NOTE: Finished with rendering new interiors, and we have total of 81.5% progress including initial db record progress
      interiorDoc.progress = 81.5

      /**
       * NOTE: Start object detection using detr-resnet model on newly created renders
       */
      debug('mdesign:ai:detr-resnet')('Starting object detection using det-resnet model')

      const detrResNetPredictions: Render[] = []

      // Upload newly created renders to google storage
      for (const [ind, pred] of diffusionPredictions.renders.entries()) {
        const renderImageName = calculateImgSha(pred)

        await InteriorRepository.saveImageToGCP(renderImageName, pred)

        detrResNetPredictions[ind] = {
          image: renderImageName,
        } as Render

        interiorDoc.progress += 2

        await interiorDoc.save()
      }

      for await (const [ind, pred] of InteriorRepository.createDETRResNetPredictions(
        detrResNetPredictions.map((r) => r.image)
      )) {
        detrResNetPredictions[ind].objects = pred.objects

        // Each object prediction done on each of the new renders will be additional 3% progress
        interiorDoc.progress += 3

        await interiorDoc.save()
      }

      debug('mdesign:ai:detr-resnet')(`Received predictions from detr-resnet model: ${detrResNetPredictions}`)

      /**
       * NOTE: Connect and upload files to GCP Storage
       */

      // Upload original image to google storage
      debug('mdesign:cloud-storage')('Uploading original interior image and newly created renders to google storage')

      await InteriorRepository.saveImageToGCP(imageName, imageBase64)

      // NOTE: Saving each image to google storage will be additional 2% progress
      interiorDoc.progress += 2

      await interiorDoc.save()

      // Create interior object which will be sent to repository
      const interior: InteriorType = {
        room,
        style,
        image: imageName,
        renders: detrResNetPredictions as Render[],
      }

      debug('mdesign:interior:db')('Saving interior object to database...')

      // Saving final record to database is additional 1.5% progress
      interior.progress = interiorDoc.progress + 1.5

      // Save final interior object to database.
      const data = await InteriorRepository.updateRecord(interiorDoc, interior)

      debug('mdesign:interior:db')(`Saved new interior with renders and objects to database: ${data?._id}`)
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

  static createInteriorCallback(req: Request, res: Response & ResponseOptions) {
    const predictor = new ReplicatePredictor()

    predictor.diffusionProgressCallback(InteriorRepository.activeRenderDocs[req.query.id as string])(req.body)

    res.ok('Ok')
  }
}

export default InteriorController
