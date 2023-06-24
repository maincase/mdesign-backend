import { Mongoose } from 'mongoose'
import InteriorModel from '../app/modules/interior/InteriorModel'
import InteriorProgressModel from '../app/modules/interior/InteriorProgressModel'
import RenderModel from '../app/modules/interior/RenderModel'

export type DB = {
  mongoose: Mongoose
  InteriorModel: typeof InteriorModel
  InteriorProgressModel: typeof InteriorProgressModel
  RenderModel: typeof RenderModel
}

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var db: DB
}
