import InteriorModel from './InteriorModel'
import InteriorRoute from './InteriorRoute'
import ProductModel from './ProductModel'
import RenderModel from './RenderModel'

export default {
  getRoute: () => InteriorRoute,
  setGlobalModel: () => {
    global.db.InteriorModel = InteriorModel
    global.db.RenderModel = RenderModel
    global.db.ProductModel = ProductModel
  },
}
