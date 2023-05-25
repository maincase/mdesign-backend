import AuthReportModel from './authReportModel'
import UserModel from './UserModel'
import UserRoute from './UserRoute'

module.exports = {
  getRoute: () => UserRoute,
  setGlobalModel: () => {
    global.db.UserModel = UserModel
    global.db.AuthReportModel = AuthReportModel
  },
}
