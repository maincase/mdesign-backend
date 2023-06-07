import mongoose from 'mongoose'

const debug = (await import('debug')).default('mdesign:db')

export default async (connection, name = '') => {
  // configure & connect to db

  mongoose.Promise = global.Promise // set native promise

  // mongoose.set('useFindAndModify', false)

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'development_local') {
    mongoose.set('debug', true)
  }

  /**
   * mongoose configuration
   * @type {boolean}
   */

  let lastReconnectAttempt

  const mongoConnectOptions = {
    // promiseLibrary: global.Promise,
    minPoolSize: 5,
    // useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }

  const connect = () => mongoose.connect(connection, mongoConnectOptions)

  connect()

  mongoose.connection.on('error', (error) => {
    debug(`Could not connect to MongoDB: (${name}).`)
    debug(`ERROR => ${error}`)

    // Close connection in case of error
    debug(`Closing MongoDB: (${name}) connection and reconnecting...`)

    mongoose.connection.close()
  })

  mongoose.connection.on('disconnected', () => {
    debug(`Lost MongoDB (${name}) connection...`)

    const now = new Date().getTime()

    if (lastReconnectAttempt && now - lastReconnectAttempt < 5000) {
      // if it does, delay the next attempt
      const delay = 5000 - (now - lastReconnectAttempt)
      debug(`reconnecting to MongoDB (${name}). in ${delay} mills`)
      setTimeout(() => {
        debug(`reconnecting to MongoDB: (${name}).`)
        lastReconnectAttempt = new Date().getTime()
        connect()
      }, delay)
    } else {
      debug(`reconnecting to MongoDB (${name})`)
      lastReconnectAttempt = now
      connect()
    }
  })

  mongoose.connection.on('connected', () => debug(`Connection established to MongoDB: (${name})`))

  mongoose.connection.on('reconnected', () => debug(`Reconnected to MongoDB (${name})`))

  return mongoose
}
