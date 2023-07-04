import InteriorModel from './InteriorModel'
import InteriorRoute from './InteriorRoute'
import RenderModel from './RenderModel'

export default {
  getRoute: () => InteriorRoute,
  setGlobalModel: () => {
    global.db.InteriorModel = InteriorModel
    global.db.RenderModel = RenderModel
  },
}
