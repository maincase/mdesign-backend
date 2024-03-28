import merge from '../app/utils/merge'

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const envConfig = process.env.CONFIG
  ? (await import(`./${process.env.CONFIG}`)).default
  : (await import(`./${process.env.NODE_ENV}`)).default

export default merge((await import('./default')).default, envConfig)
