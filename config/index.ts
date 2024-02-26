import merge from '../app/utils/merge'

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const envConfig =
  process.env.CONFIG && process.env.CONFIG !== undefined
    ? (await import(`./${process.env.CONFIG}`)).default
    : (await import(`./${process.env.NODE_ENV}`)).default

const m = merge((await import('./default')).default, envConfig)

export default m
