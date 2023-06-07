import _ from 'lodash'

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const envConfig =
  process.env.CONFIG && process.env.CONFIG !== undefined
    ? (await import(`./${process.env.CONFIG}`)).default
    : (await import(`./${process.env.NODE_ENV}`)).default

export default _.merge((await import('./default')).default, envConfig)
