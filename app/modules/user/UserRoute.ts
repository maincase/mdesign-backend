const AuthCtrl = require('./authController')
const isAuthenticated = require('../../policies/isAuthenticated')
const requirePermission = require('../../policies/requirePermission')
const consts = require('../roles/permissions')

const UserRoute = {
  '/api/user': {
    '/sign-in': {
      post: [AuthCtrl.signIn.bind(AuthCtrl)],
    },
    '/sign-up': {
      post: [isAuthenticated, requirePermission(consts.signUp), AuthCtrl.signUp.bind(AuthCtrl)],
    },
    '/validateEmail': {
      get: [isAuthenticated, AuthCtrl.validateEmail.bind(AuthCtrl)],
    },
    '/updateEmailsLimit': {
      post: [isAuthenticated, AuthCtrl.updateUserEmailsLimit.bind(AuthCtrl)],
    },
    '/reset': {
      '/password': {
        post: [isAuthenticated, AuthCtrl.changePassword.bind(AuthCtrl)],
      },
    },
    '/getUsers': {
      get: [isAuthenticated, AuthCtrl.getUsers.bind(AuthCtrl)],
    },
    '/getUser': {
      get: [isAuthenticated, AuthCtrl.getUser.bind(AuthCtrl)],
    },
  },
}

export default UserRoute
