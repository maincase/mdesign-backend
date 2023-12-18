import { model, Schema } from 'mongoose'

const ProductSchema = new Schema(
  {
    asin: { type: String, required: true, index: true },
    link: { type: String, required: true },
  },
  {
    collection: 'products',
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

// ProductSchema.index({ userId: 1 })

ProductSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  delete obj._id
  // delete obj.id

  delete obj.createdAt

  return obj
}

const ProductModel = model('Product', ProductSchema)

export default ProductModel
