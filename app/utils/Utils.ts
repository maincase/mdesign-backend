import bcrypt from 'bcrypt'
import { GoogleAuth } from 'google-auth-library'
import config from '../../config'

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
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8))
  }

  static validateEmail(v: string): boolean {
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(v)
  }

  /**
   *
   * @returns
   */
  static async getGCPToken() {
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
      keyFilename: config.googleCloud.ai.serviceAccountKey,
    })

    const client = await auth.getClient()
    const token = await client.getAccessToken()

    if (token?.token) {
      return token.token
    }

    return undefined
  }
}
