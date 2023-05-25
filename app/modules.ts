import { Application } from 'express'
// import './globals'

const debug = require('debug')('mdesign')

export default (app: Application) => {
  require('./utils/responses').forEach((response: any) => {
    app.use(response)
  })

  /**
   * catch error from myError or send badRequest
   */

  app.use((req: any, res: any, next: any) => {
    res.catchError = (error: any) => {
      if (error.status) res.statusCode = error.status || 400

      if (!error.status) {
        return res.badRequest(error)
      }

      const response = {
        code: error.code,
        message: error.message,
        error: error.message,
      }
      return res.status(error.status).json(response)
    }

    next()
  })

  const modules = [
    // 'searches',
    'user',
  ]

  const mongoose = require('./db')(app.get('configuration').database.connection, 'Main')
  global.db = { mongoose }

  // loop through all folders in api/controllers
  const modulesRoot = './modules/'
  modules.forEach((ctrl) => {
    // eslint-disable-next-line import/no-dynamic-require
    const mod = require(`${modulesRoot}${ctrl}`)
    app.map(mod.getRoute())
  })

  // catch 404
  app.use((req: any, res: any) => {
    res.notFound()
  })

  // catch 5xx
  app.use((err: any, req: any, res: any) => {
    debug(err)

    const response = {
      name: 'serverError',
      code: 'E_INTERNAL_SERVER_ERROR',
      message: 'Something bad happened on the server',
      data: {
        message: err.message,
      },
    }

    res.status(500).json(response)
  })
}
