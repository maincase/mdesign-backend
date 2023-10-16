import { Document } from 'mongoose'
import { InteriorType } from '../modules/interior/InteriorTypes'

export default interface Predictor {
  createDiffusionPredictions(_: {
    interiorDoc: InteriorType & Document
    image: string
    imageMimeType?: string
    style: string
    room: string
  }): Promise<string[] | void>

  createDETRResNetPredictions(_: string[]): AsyncGenerator<[number, item: { objects: [] }], void, unknown>
}
