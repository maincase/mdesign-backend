const debug = (await import('debug')).default('mdesign:server')

export type ResponseOptions = {
  badRequest: () => void
  created: () => void
  forbidden: () => void
  notFound: () => void
  ok: (data: any) => void
  serverError: () => void
  unauthorized: () => void
  tokenExpired: () => void
  notActive: () => void
  conflict: () => void

  catchError: (error: any) => void
}

export default [
  (await import('./badRequest')).default,
  (await import('./created')).default,
  (await import('./forbidden')).default,
  (await import('./notFound')).default,
  (await import('./ok')).default,
  (await import('./serverError')).default,
  (await import('./unauthorized')).default,
  (await import('./tokenExpired')).default,
  (await import('./notActiveUser')).default,
  (await import('./conflict')).default,
].map((desc) => (_, res, next) => {
  res[desc.name] = (data, code, message) => {
    if (data instanceof Error) {
      // log error
      debug(data)

      // clear data variable, do not send it to client
      // eslint-disable-next-line no-param-reassign
      data = { message: data.message }
    }

    const response = {
      code: code || desc.code,
      message: message || desc.message,
      data: data || desc.data,
    }

    res.status(desc.status).json(response)
  }

  next()
})
