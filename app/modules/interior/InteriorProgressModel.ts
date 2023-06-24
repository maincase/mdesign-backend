import { model, Schema } from 'mongoose'

const InteriorProgressSchema = new Schema(
  {
    progress: { type: Number, required: true, default: 0 },
  },
  {
    collection: 'interiors',
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

// InteriorProgressSchema.index({ userId: 1 })

InteriorProgressSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  delete obj._id
  // delete obj.id

  delete obj.createdAt

  return obj
}

const InteriorProgressModel = model('InteriorProgress', InteriorProgressSchema)

export default InteriorProgressModel
