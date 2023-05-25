const debug = require('debug')('api')

module.exports = [
  require('./badRequest'),
  require('./created'),
  require('./forbidden'),
  require('./notFound'),
  require('./ok'),
  require('./serverError'),
  require('./unauthorized'),
  require('./tokenExpired'),
  require('./notActiveUser'),
  require('./conflict'),
].map((desc) => {
  return (req, res, next) => {
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

      return res.status(desc.status).json(response)
    }
    next()
  }
})
