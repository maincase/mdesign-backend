import InteriorController from './InteriorController'

const InteriorRoute = {
  '/api/interior': {
    '/get': {
      get: [InteriorController.getInteriors],
      '/:id': {
        get: [InteriorController.getInterior],
      },
    },
    '/create': {
      post: [InteriorController.createInterior],
    },
  },
}

export default InteriorRoute
