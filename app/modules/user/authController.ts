/* eslint-disable camelcase */
// const mailJet = require('node-mailjet')
const { ObjectId } = require('mongodb')
const AuthRepository = require('./authRepository')

const appConfig = require('../../../config')

class AuthController {
  authRepo: AuthRepository

  constructor(authRepository) {
    this.authRepo = authRepository
  }

  /**
   * @apiVersion 1.0.0
   * @api {post} /api/v1/users/sign-up user Signup
   * @apiName SignUp
   * @apiGroup User
   * @apiDescription Signup
   *
   *
   * @apiParam {String} email for user
   * @apiParam {String} password for user
   * @apiParam {String} name of user
   * @apiParam {String} id of the company
   *
   * @apiSuccessBusiness Response success
   *     HTTP/1.1 201 Created
   *     {
   *        code: 'CREATED',
   *        message: 'The request has been fulfilled and resulted in a new resource being created',
   *        data : user
   *     }
   *
   * @apiUse Errors
   */
  async signUp(req, res) {
    const { email, password, companyId, name } = req.body

    if (!email || !password || !companyId || !name) {
      return res.badRequest()
    }

    try {
      const result = await this.authRepo.signUp(email, password, name, companyId)

      if (result) {
        res.ok('User Created')
      }
    } catch (err) {
      res.catchError(err)
    }
  }

  /**
   * @apiVersion 1.0.0
   * @api {post} /api/v1/users/sign-in user SingIn
   * @apiName SingIn
   * @apiGroup User
   * @apiDescription SingIn
   *
   *
   * @apiParam {String} email for user
   * @apiParam {String} password for user
   *
   * @apiSuccessBusiness Response success
   *     HTTP/1.1 201 Created
   *     {
   *        code: 'CREATED',
   *        message: 'The request has been fulfilled and resulted in a new resource being created',
   *        data : user
   *     }
   *
   * @apiUse Errors
   */
  async signIn(req, res) {
    const { email, password } = req.body

    if (!email || !password) {
      this.authRepo.reportAuth(req.ip, email, password)

      return res.badRequest('Invalid params')
    }

    try {
      const data = await this.authRepo.signIn(email, password, appConfig.loginResetPassword)

      res.ok(data)

      this.authRepo.reportAuth(req.ip, email, password, {
        user: data,
      })
    } catch (err) {
      res.catchError(err)

      this.authRepo.reportAuth(req.ip, email, password, { err })
    }
  }

  /**
   * @apiVersion 1.0.0
   * @api {post} /api/v1/users/change-password change password
   * @apiName Change Password
   * @apiGroup User
   * @apiDescription change Password
   *
   *
   * @apiParam {String} oldPassword for user
   * @apiParam {String} password new password for user
   *
   * @apiSuccessBusiness Response success
   *     HTTP/1.1 201 Created
   *     {
   *        code: 'CREATED',
   *        message: 'The request has been fulfilled and resulted in a new resource being created',
   *        data : user
   *     }
   *
   * @apiUse Errors
   */
  async changePassword(req, res) {
    const { oldPassword, password } = req.body

    if (!oldPassword || !password) {
      return res.badRequest()
    }

    try {
      const user = await this.authRepo.changePassword(oldPassword, password, req.user)

      res.ok(user)
    } catch (err) {
      res.catchError(err)
    }
  }

  async getUsers(req, res) {
    try {
      const {
        user: { role, companyId },
      } = req

      if (role !== 'Admin' && role !== 'Manager') {
        return res.badRequest()
      }

      const users = await this.authRepo.getUsers(role, companyId)

      return res.ok(users)
    } catch (err) {
      res.catchError(err)
    }
  }

  async getUser(req, res) {
    try {
      const {
        _id: userId,
        name,
        email: userEmail,
        role,
        emailValid,
        emailRequested,
        emailKey,
        login_count,
        onboarding,
        isOnboarded,
        company,
        emailLimit,
        facebookData,
      } = req.user

      const { timezone: userTimeZone } = req.headers

      const models = global.db

      try {
        // Check if the provided timezone is valid.
        Intl.DateTimeFormat(undefined, { timeZone: userTimeZone })

        await models.UserModel.findOneAndUpdate(
          {
            _id: ObjectId(userId),
          },
          {
            $set: {
              timeZone: userTimeZone,
            },
          },
          {
            returnOriginal: false,
          }
        )
      } catch (error) {
        console.error(`ERROR Updating user location: ${error}`)
      }

      let userEmailValid = emailValid

      if (!userEmailValid) {
        const userEmailKeys = appConfig.emailKeys.find(({ publicKey }) => publicKey === emailKey)

        const email = await mailJet.connect(userEmailKeys.publicKey, userEmailKeys.privateKey)

        const {
          body: { Data },
        } = await email.get('sender', { version: 'v3' }).request({
          email: userEmail,
        })

        const senderData = Data[0]

        if (senderData && senderData.Status === 'Active') {
          const user = await this.authRepo.userEmailValidate(userId, true)

          userEmailValid = user.emailValid
        }
      }

      const userData = {
        name,
        email: userEmail,
        role,
        emailValid: userEmailValid,
        emailRequested,
        login_count,
        isOnboarded,
        company: company?.name
          ? {
              name: company?.name,
            }
          : undefined,
        emailLimit: emailLimit ?? appConfig.emailLimit,
        emailLimitLeft:
          (emailLimit ?? appConfig.emailLimit) - (await this.authRepo.geUserEmailsCount(userId, userTimeZone)),
        maxEmailLimit: appConfig.maxEmailLimit,
        facebookData,
      }

      if (!isOnboarded) {
        const { count, result } = await this.authRepo.calculateOnboardingProgress(userId)

        const onBoardingValues = Object.values({ ...result, ...onboarding })
        const isUserOnboarded = onBoardingValues.length
          ? onBoardingValues.reduce((prev, curr) => prev && curr, true)
          : false

        if (isUserOnboarded) {
          await models.UserModel.findOneAndUpdate(
            {
              _id: ObjectId(userId),
            },
            {
              $set: {
                isOnboarded: isUserOnboarded,
              },
            },
            {
              returnOriginal: false,
            }
          )
        }

        userData.isOnboarded = isUserOnboarded
        userData.onboardingCount = count

        if (!isUserOnboarded) {
          userData.onboarding = {
            readReports: onboarding.readReports,
            readKnowledgeBase: onboarding.readKnowledgeBase,
            ...result,
          }
        }
      }

      return res.ok(userData)
    } catch (err) {
      res.catchError(err)
    }
  }

  async validateEmail(req, res) {
    const {
      user: { _id: userId, email: userEmail, name, emailSenderId, emailRequested, emailValid, emailKey },
    } = req

    let userEmailRequested = emailRequested
    let user = {}

    try {
      if (!emailValid) {
        const userEmailKeys = appConfig.emailKeys.find(({ publicKey }) => publicKey === emailKey)

        const email = await mailJet.connect(userEmailKeys.publicKey, userEmailKeys.privateKey)
        let userSenderId = emailSenderId ?? -1
        let userExists = false
        try {
          const lookupUser = await email.get('sender', { version: 'v3' }).id(userEmail).request()
          userSenderId = lookupUser.body.Data[0].ID
          userExists = true
        } catch (err) {
          console.log(err)
        }
        if (userExists) {
          await email.post('sender', { version: 'v3' }).id(userSenderId).action('validate').request()
        } else {
          try {
            const {
              body: { Count, Data },
            } = await email
              .post('sender', {
                version: 'v3',
              })
              .request({
                EmailType: 'unknown',
                IsDefaultSender: false,
                Name: name,
                Email: userEmail,
              })

            userSenderId = Data[Count - 1].ID
          } catch (mailJetError) {
            throw new Error(mailJetError)
          }
        }

        if (userSenderId !== -1) {
          user = await this.authRepo.userRequestEmailValidate(userId, userSenderId)

          userEmailRequested = user.emailRequested
        } else {
          throw new Error(
            `Failed to create MailJet user or user is already deleted/inactive in MailJet for ${userEmail}`
          )
        }
      }

      return res.ok({
        name,
        email: userEmail,
        role: user.role,
        emailValid,
        emailRequested: userEmailRequested,
        login_count: user.login_count,
      })
    } catch (error) {
      res.catchError(error)
    }
  }

  async updateUserOnboarding(req, res) {
    const {
      user: { _id: userId, onboarding },
    } = req

    try {
      if (!req.body) {
        throw new Error('Invalid request body.')
      }

      const result = await this.authRepo.updateUserOnboarding(userId, {
        ...onboarding,
        ...req.body,
      })

      res.ok(result)
    } catch (err) {
      res.catchError(err)
    }
  }

  async updateUserEmailsLimit(req, res) {
    const {
      user: { _id: userId },
    } = req

    try {
      this.authRepo.updateUserEmailsLimit(userId)

      res.ok()
    } catch (error) {
      res.catchError(error)
    }
  }
}

export default new AuthController(new AuthRepository())
