#!/usr/bin/env node
// if (process.env.NODE_ENV === 'production') {
//   require('@google-cloud/debug-agent').start({ serviceContext: { enableCanary: true }, allowExpressions: true })
// }

/**
 * Module dependencies.
 */
import http from 'http'
import app from '../app'

const debug = (await import('debug')).default('mdesign:server')
// var http = require('http')
// const https = require('https')
// const http = require('http')
import config from '../config'

// var fs = require('fs')
app.disable('x-powered-by')
/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(config.port)
// const httpsPort = normalizePort(config.httpsPort)
app.set('port', port)
app.set('trust proxy', true)

/**
 * Create HTTP server.
 */
const server = http.createServer(app)

/** NOTE: Disable HTTPS server for now. */
// const httpsServer = https.createServer(
//   {
//     key: fs.readFileSync('server.key'),
//     cert: fs.readFileSync('server.cert'),
//   },
//   app
// )

// /**
//  * socket io run
//  */
// require("../socket.js")(server);

/**
 * Listen on provided port, on all network interfaces.
 */

server.on('error', onError)

server.on('listening', onListening)

server.listen(port, '0.0.0.0')

// httpsServer.on('error', onError)

// httpsServer.on('listening', onListening)

// httpsServer.listen(httpsPort, '0.0.0.0')

debug('Running on', port /* httpsPort */)

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const port = Number(val)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error
  }
  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  try {
    const addr = server.address()

    if (addr === null) {
      throw new Error('Could not get server address')
    }

    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
    debug('Listening on ' + bind)
  } catch (err) {
    debug('Error on listening', err)
  }
}
