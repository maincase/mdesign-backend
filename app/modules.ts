import { Application } from 'express'
import { readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { DB } from '../types/global'

const debug = (await import('debug')).default('mdesign:api')

export default async (app: Application) => {
  ;(await import('./utils/responses')).default.forEach((response) => app.use(response))

  /**
   * catch error from myError or send badRequest
   */
  app.use((_, res: any, next) => {
    res.catchError = (error) => {
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

  /**
   * Get active modules.
   */
  const IGNORE_MODULES: string[] = []
  const modules = readdirSync(`${path.dirname(fileURLToPath(import.meta.url))}/modules`, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && !IGNORE_MODULES.includes(dirent.name))
    .map((dirent) => dirent.name)

  /**
   * Connect to database.
   */
  const mongoose = await (await import('./db')).default(app.get('configuration').database.connection, 'Main')
  ;(global.db as Partial<DB>) = { mongoose }

  // loop through all folders in modules
  const modulesRoot = './modules/'
  await Promise.all(
    modules.map(async (ctrl) => {
      const mod = (await import(`${modulesRoot}${ctrl}`)).default

      app.map(mod?.getRoute?.())

      mod?.setGlobalModel?.(mongoose)
    })
  )

  // catch 404
  app.use((_, res: any) => res.notFound())

  // catch 5xx
  app.use((err: any, _, res: any) => {
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
