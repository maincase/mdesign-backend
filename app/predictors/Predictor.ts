import { Document } from 'mongoose'
import { InteriorType } from '../modules/interior/InteriorTypes'

export default abstract class Predictor {
  abstract createDiffusionPredictions(_: {
    interiorDoc: InteriorType & Document
    image: string
    imageMimeType?: string
    style: string
    room: string
  }): Promise<string[]>

  abstract createDETRResNetPredictions(_: string[]): AsyncGenerator<{}, void, unknown>
}
