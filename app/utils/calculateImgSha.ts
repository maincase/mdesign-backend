import { createHash } from 'crypto'

export type ImgFormat = 'png' | 'jpeg' | 'jpg'

/**
 *
 * @param image
 * @param format
 * @returns
 */
export default function calculateImgSha(image, format: ImgFormat) {
  return `${createHash('sha256').update(image).digest('hex')}.${format}`
}
