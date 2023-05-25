import { model, Schema } from 'mongoose'
import Utils from '../../utils/Utils'

// const { roleObjects } = require('../roles/roles')

const reportSchema = new Schema(
  {
    ip: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v: string): boolean => {
          return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/i.test(
            v
          )
        },
        message: 'Please fill a valid ip v4 address',
      },
    },
    email: {
      type: String,
      trim: true,
      validate: {
        validator: Utils.validateEmail,
        message: 'Please fill a valid email address',
      },
      required: true,
    },
    // role: {
    //   type: String,
    //   trim: true,
    //   validate: {
    //     validator: (r: any) => {
    //       return roleObjects.some((item: any) => item.role === r)
    //     },
    //     message: '{VALUE} is not a valid role',
    //   },
    // },
    name: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    authenticated: {
      type: Boolean,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
  },
  {
    collection: 'reports_auth',
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
)

reportSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.__v
  delete obj._id

  return obj
}

const AuthReportModel = model('ReportAuth', reportSchema)

export default AuthReportModel

/**
 * @apiDefine BusinessModel
 *
 * @apiParam {String} name Name of the business.
 * @apiParam {String} [description] Description of the business.
 * @apiParam {String} [status] status of the business.
 * @apiParam {String} [color] Color of the business.
 *
 */

/**
 * @apiDefine businessModelSuccess
 *
 * @apiSuccess {string} id Unique id.
 * @apiSuccess {String} name Name of the business.
 * @apiSuccess {String} code Unique code of the business.
 * @apiSuccess {String} [description] Description of the business.
 * @apiSuccess {String} [color] Color of the business.
 * @apiSuccess {String} object="Contact" Object of the business.
 * @apiSuccess {String} code Id of company object.
 *
 * @apiSuccess {String} status Status of the business object.
 * @apiSuccess {String} owner Id of user object.
 * @apiSuccess {String} modifierUser Id of user object.
 * @apiSuccess {Date} created Created date.
 * @apiSuccess {Date} modified Modified date.
 */
