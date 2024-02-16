import bodyParser from 'body-parser'
import compression from 'compression'
// import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import multer from 'multer'
import Util from 'node:util'
import config from '../config'

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const app = express()
app.use(compression())
app.use(helmet())
// app.use(cors())

const multerMid = Util.promisify(
  multer({
    storage: multer.memoryStorage(),
    limits: {
      // no larger than 30mb.
      fileSize: 30 * 1024 * 1024,
    },
  }).single('file')
)

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Origin', req.headers.origin)
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE')
    res.header(
      'Access-Control-Allow-Headers',
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, authorization, TimeZone'
    )

    if (req.method === 'OPTIONS') {
      res.sendStatus(200)
    } else {
      next()
    }
  })
}

app.set('superSecret', config.secret)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// app.use(passport.initialize())

// app.use(passport.session())

// passport.serializeUser(function (user, done) {
//   done(null, user)
// })

// passport.deserializeUser<any, any>(function (user, done) {
//   done(null, user)
// })

// passport.use(
//   new FacebookStrategy(
//     config.facebook as FacebookStrategyOptions,
//     async (_accessToken, _refreshToken, profile, done) => {
//       try {
//         const { body: accountDataBody } = await got(
//           `https://graph.facebook.com/v11.0/me/accounts?fields=name,access_token,parent_page,personal_info,page_token&access_token=${_accessToken}`
//         )
//         // const { body: adAccountsBody } = await got(
//         //   `https://graph.facebook.com/v11.0/me/adaccounts?fields=business_name,name,account_id&access_token=${_accessToken}`
//         // )
//         const { body: longLifeTokenBody } = await got(
//           `https://graph.facebook.com/v11.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1077731956054771&client_secret=079d6f92a3a642ca0bc3d4d17bf2289c&fb_exchange_token=${_accessToken}`
//         )
//         const accountData = JSON.parse(accountDataBody)
//         // const adAccounts = JSON.parse(adAccountsBody)

//         const { body: longLifeBusinessTokenBody } = await got(
//           `https://graph.facebook.com/v11.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1077731956054771&client_secret=079d6f92a3a642ca0bc3d4d17bf2289c&fb_exchange_token=${accountData.data[0].access_token}`
//         )

//         const longLife = JSON.parse(longLifeTokenBody)
//         const longLifeBusinessToken = JSON.parse(longLifeBusinessTokenBody).access_token
//         accountData.data[0].access_token = longLifeBusinessToken

//         const fbUserData = {
//           name: `${profile.name?.givenName} ${profile.name?.familyName}`,
//           id: profile.id,
//           account: accountData.data[0],
//           // adAccounts: adAccounts.data,
//           longLifetoken: longLife.access_token ?? '',
//           updatedDate: new Date(),
//         }

//         done(null, fbUserData)
//       } catch (err) {
//         console.error('ERROR Passport facebook strategy', err)
//       }
//     }
//   )
// )
app.use(multerMid)
// app.use(
//   multerMid.fields([
//     { name: 'image[value]', maxCount: 1 },
//     { name: 'image[thumbnail]', maxCount: 1 },
//   ])
// )

// load config
app.set('configuration', config)

app.map = (a: any, route: string) => {
  // eslint-disable-next-line no-param-reassign
  route = route || ''
  // eslint-disable-next-line no-restricted-syntax
  for (const key in a) {
    if (Array.isArray(a[key])) {
      // get: [function(){ ... }]
      ;(app as Record<string, any>)[key](route, a[key])
    } else if (typeof a[key] === 'object') {
      // { '/path': { ... }}
      app.map(a[key], route + key)
    } else if (typeof a[key] === 'function') {
      // get: function(){ ... }
      ;(app as Record<string, any>)[key](route, a[key])
    }
  }
}

const debug = (await import('debug')).default('mdesign:server')

debug('Server run')

await (await import('./modules')).default(app)

export default app
