import { model, Schema } from 'mongoose'
import { InteriorType } from './InteriorTypes'

const InteriorSchema = new Schema<InteriorType>(
  {
    room: { type: String, required: true },
    style: { type: String, required: true },
    image: { type: String, required: true, unique: true },
    progress: { type: Number, required: true, default: 0 },
    renders: [{ type: Schema.Types.ObjectId, ref: 'Render' }],
  },
  {
    collection: 'interiors',
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

// InteriorSchema.index({ userId: 1 })

InteriorSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  delete obj._id
  // delete obj.id

  delete obj.createdAt

  return obj
}

const InteriorModel = model('Interior', InteriorSchema)

export default InteriorModel
