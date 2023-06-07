// import { roleObjects } from '../modules/roles/roles'
// import UserModel from '../modules/user/UserModel'
// import jwtService from '../services/jwtService'
import Utils from '../utils/Utils'

export default async function isAuthenticated(req: any, res: any, next: any) {
  const token = Utils.extractToken(req)
  // let payload

  if (!token) return res.unauthorized()

  // try {
  //   payload = jwtService(req.app.settings.configuration.jwt).verify(token)
  // } catch (ex: any) {
  //   if (ex.name === 'TokenExpiredError') {
  //     return res.tokenExpired()
  //   }

  //   return res.unauthorized()
  // }

  try {
    const user = undefined
    // NOTE: Uncomment this when we will have users.
    /* await UserModel.findOne({
      _id: payload.id,
      status: { $ne: 'deleted' },
    }) */

    if (!user) {
      return res.unauthorized()
    }

    // NOTE: Uncomment this to handle deactivated users.
    // if (user.active === false) {
    //   return res.forbidden('User suspended, contact support team for details.')
    // }

    // const userCompany =
    //   (await CompanyModel.findOne({
    //     _id: user.companyId,
    //   })) ?? undefined

    // user.company = userCompany

    req.user = user
    req.user.token = token

    req.systemUser = user

    // const role = roleObjects.filter((item) => item.role === user.role)

    // req.user.permissions = role.length > 0 ? role[0].permissions : []

    next()
  } catch (error) {
    res.serverError(error)
  }
}
