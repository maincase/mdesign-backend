import { model, Schema } from 'mongoose'

const ObjectSchema = new Schema({
  type: [],
})

const RenderSchema = new Schema(
  {
    image: { type: String, required: true },
    objects: {
      type: [ObjectSchema],
    },
  },
  {
    collection: 'renders',
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

// RenderSchema.index({ userId: 1 })

RenderSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  delete obj._id

  return obj
}

const RenderModel = model('Render', RenderSchema)

export default RenderModel
