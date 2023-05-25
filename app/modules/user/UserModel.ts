import { Document, model, Schema } from 'mongoose'
import Utils from '../../utils/Utils'

const MyError = require('../../utils/responses/errors')
const bcrypt = require('bcrypt-nodejs')
// const { roleObjects } = require('../roles/roles')

// const { ObjectId } = require('mongodb')

type User = {
  active: boolean
  password?: string
  facebookData: Record<string, unknown>
}

const userSchema = new Schema<User & Document>(
  {
    email: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      required: true,
      validate: {
        validator: Utils.validateEmail,
        message: 'Please fill a valid email address',
      },
      index: true,
    },
    password: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => {
          return /^.{6,}$/.test(v)
        },
        message: 'Password must have at least 6 characters',
      },
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    collection: 'users',
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

userSchema.statics.getByEmail = async function (email: string) {
  try {
    const user = await this.findOne().where('email').equals(email).populate('location')

    return user
  } catch (error) {
    return Promise.reject(error)
  }
}

userSchema.statics.checkIfEmailExist = async function (email: string, id: string) {
  const user = await this.findOne({ email, _id: { $ne: id } }).exec()

  if (!user || !user._id) {
    return MyError.notFound('User not found')
  }

  return Promise.reject(MyError.badRequest('User already joined!'))
}

// checking if password is valid
userSchema.methods.validatePassword = function (password: string) {
  return bcrypt.compareSync(password, this.password)
}

userSchema.methods.toJSONWithoutId = function () {
  const obj = this.toObject()

  // remove props that should not be exposed
  delete obj.password
  delete obj.__v
  delete obj._id

  return obj
}

const UserModel = model<User & Document>('User', userSchema)

export default UserModel
