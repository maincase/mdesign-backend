export type Render = {
  image: string
  objects: any[][]
}

export type InteriorType = {
  room: string
  style: string
  image: string
  progress?: number

  renders: Render[]

  provider: string
  providerId?: string
}
