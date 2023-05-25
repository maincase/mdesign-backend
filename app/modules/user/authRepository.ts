import Utils from '../../utils/Utils'

const MyError = require('../../utils/responses/errors')
const appConfig = require('../../../config')
const jwtService = require('../../services/jwtService')
// const EmailModel = require('../email/EmailModel').default

const BluebirdPromise = require('bluebird')
const ObjectId = require('mongodb').ObjectID

class AuthRepository {
  static signUp(email, password, name, companyId) {
    email = email.toLowerCase()
    const models = global.db
    return models.UserModel.checkIfEmailExist(email)
      .then(() => {
        const schema = {
          email,
          password: Utils.generateHash(password),
          name,
          companyId,
        }
        const newUser = new models.UserModel(schema)
        return newUser.save()
      })
      .catch((err) => {
        return BluebirdPromise.reject(err)
      })
  }

  static async signIn(email, password, shouldCount) {
    let user = await global.db.UserModel.getByEmail(email.toLowerCase())

    if (!user) {
      return BluebirdPromise.reject(MyError.notFound('The email doesn’t match any account.'))
    }

    if (!user.validatePassword(password)) {
      return BluebirdPromise.reject(MyError.notFound('The password you’ve entered is incorrect.'))
    }

    if (user.active === false) {
      return BluebirdPromise.reject(MyError.notFound('User suspended, contact support team for details.'))
    }

    const accessToken = jwtService(appConfig.jwt).sign({ id: user.id })

    if (shouldCount) {
      let login_count = user.login_count ?? 0

      if (login_count > 0) {
        login_count += 1
      } else {
        login_count = 1

        delete user.login_count
      }

      await global.db.UserModel.findOneAndUpdate(
        {
          _id: ObjectId(user._id),
        },
        {
          $set: {
            login_count,
          },
        }
      )

      user.login_count = login_count
    }

    user = user.toJSONWithoutId()

    const userCompany =
      (await CompanyModel.findOne({
        _id: ObjectId(user.companyId),
      })) ?? undefined

    user.company = userCompany

    return {
      accessToken: accessToken,
      user,
    }
  }

  static changePassword(oldPassword, password, user) {
    if (!password || !user.validatePassword(oldPassword)) {
      return BluebirdPromise.reject(MyError.badRequest({ message: 'old password is incorrect' }))
    }

    user.password = Utils.generateHash(password)

    user.login_count = 2

    const newUser = new global.db.UserModel(user)
    return newUser.save()
  }

  static async getUsers(role, companyId) {
    const models = global.db
    if (role === 'Admin') {
      return models.UserModel.find({}, { email: 1 })
    } else if (role === 'Manager') {
      return models.UserModel.find({ companyId }, { email: 1 })
    }
  }

  static async userEmailValidate(userId, isValid) {
    const models = global.db

    return models.UserModel.findOneAndUpdate(
      {
        _id: ObjectId(userId),
      },
      {
        $set: {
          emailValid: isValid,
        },
      },
      {
        returnOriginal: false,
      }
    )
  }

  static async updateUserEmailsLimit(userId) {
    const models = global.db

    return models.UserModel.findByIdAndUpdate(
      {
        _id: ObjectId(userId),
      },
      {
        $set: {
          emailLimit: appConfig.maxEmailLimit,
        },
      },
      {
        returnOriginal: false,
      }
    )
  }

  static async getUserByEmail(userEmail) {
    const models = global.db

    return models.UserModel.findOne({ email: userEmail })
  }
}

export default AuthRepository
