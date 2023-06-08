import { InteriorType } from './InteriorTypes'

class InteriorRepository {
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  getInteriors = async () => {
    return []
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  createInterior = async (inter: InteriorType) => {
    console.log(JSON.stringify(inter), 'this is the interior with renders and objects')
  }
}

export default InteriorRepository
