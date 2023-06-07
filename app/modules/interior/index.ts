import InteriorModel from './InteriorModel'
import InteriorRoute from './InteriorRoute'

export default {
  getRoute: () => InteriorRoute,
  setGlobalModel: () => {
    global.db.InteriorModel = InteriorModel
  },
}
