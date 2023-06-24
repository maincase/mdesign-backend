import InteriorModel from './InteriorModel'
import InteriorProgressModel from './InteriorProgressModel'
import InteriorRoute from './InteriorRoute'
import RenderModel from './RenderModel'

export default {
  getRoute: () => InteriorRoute,
  setGlobalModel: () => {
    global.db.InteriorModel = InteriorModel
    global.db.InteriorProgressModel = InteriorProgressModel
    global.db.RenderModel = RenderModel
  },
}
