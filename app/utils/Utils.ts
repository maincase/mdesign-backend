const AUTH_HEADER = 'authorization'
const DEFAULT_TOKEN_BODY_FIELD = 'access_token'
const DEFAULT_TOKEN_QUERY_PARAM_NAME = 'access_token'

export default class Utils {
  static isObject(obj: any): boolean {
    return typeof obj === 'object'
  }

  static extractToken(req: any): string | null {
    let token = null
    // Extract the jwt from the request
    // Try the header first
    if (req.headers[AUTH_HEADER]) token = req.headers[AUTH_HEADER]

    // If not in the header try the body
    if (!token && req.body) token = req.body[DEFAULT_TOKEN_BODY_FIELD]

    // if not in the body try query params
    if (!token) token = req.query[DEFAULT_TOKEN_QUERY_PARAM_NAME]

    // if coming from facebook oauth callback.
    if (!token) {
      if (req.query.state) {
        token = JSON.parse(Buffer.from(req.query.state, 'base64').toString('ascii')).user_token
      }
    }

    return token
  }

  static generateHash(password: string): string {
    const bcrypt = require('bcrypt-nodejs')
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null)
  }

  static validateEmail(v: string): boolean {
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(v)
  }
}
