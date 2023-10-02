export default class Predictor {
  static async createDiffusionPredictions(_: {
    id?: string
    image: string
    imageMimeType?: string
    style: string
    room: string
  }): Promise<string[]> {
    throw new Error('Not implemented')
  }

  static async *createDETRResNetPredictions(_: string[]): AsyncGenerator<unknown, void, unknown> {
    throw new Error('Not implemented')
  }
}
