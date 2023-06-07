import InteriorController from './InteriorController'

const InteriorRoute = {
  '/api/interior': {
    '/get': {
      get: [InteriorController.getInteriors],
    },
    '/create': {
      post: [InteriorController.createInterior],
    },
  },
}

export default InteriorRoute
