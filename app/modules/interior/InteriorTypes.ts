export type Render = {
  image: string
  objects: [][]
}

export type InteriorType = {
  room: string
  style: string
  image: string

  renders: Render[]
}
