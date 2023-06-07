const debug = (await import('debug')).default('mdesign:api')

export default class MyError {
  static notFound(err) {
    let error
    if (typeof err === 'string') {
      error = new Error(err)
    } else {
      error = new Error(err.message)
    }

    error.status = 404
    error.code = 'E_NOT_FOUND'
    debug(error)
    return error
  }

  static notFoundPromise(err) {
    return Promise.reject(MyError.notFound(err))
  }

  static badRequest(err) {
    let error
    if (typeof err === 'string') {
      error = new Error(err)
    } else {
      error = new Error(err.message)
    }

    error.status = 400
    error.code = 'E_BAD_REQUEST'
    debug(error)
    return error
  }

  static badRequestPromise(err /* , code = 'E_BAD_REQUEST' */) {
    return Promise.reject(MyError.badRequest(err /* , code */))
  }

  static forbidden(err) {
    let error
    if (typeof err === 'string') {
      error = new Error(err)
    } else {
      error = new Error(err.message)
    }

    error.status = 403
    error.code = 'E_FORBIDDEN'
    debug(error)
    return error
  }

  static unauthorized(err) {
    let error
    if (typeof err === 'string') {
      error = new Error(err)
    } else {
      error = new Error(err.message)
    }

    error.status = 401
    error.code = 'E_UNAUTHORIZED'
    debug(error)
    return error
  }

  static planAccess(err) {
    let error
    if (typeof err === 'string') {
      error = new Error(err)
    } else {
      error = new Error(err.message)
    }

    error.status = 403
    error.code = 'E_PLAN_ACCESS'
    debug(error)
    return error
  }

  static planAccessPromise(err) {
    return Promise.reject(MyError.planAccess(err))
  }
}
