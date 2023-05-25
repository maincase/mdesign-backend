process.env.NODE_ENV = process.env.NODE_ENV || 'development'
const _ = require('lodash')

const envConfig =
  process.env.CONFIG && process.env.CONFIG !== undefined
    ? // eslint-disable-next-line import/no-dynamic-require
      require(`./${process.env.CONFIG}`)
    : // eslint-disable-next-line import/no-dynamic-require
      require(`./${process.env.NODE_ENV}`)

module.exports = _.merge(require('./default'), envConfig)
