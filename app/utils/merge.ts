import isObject from './isObject'

/**
 *
 * @param target
 * @param source
 * @returns
 */
export default function merge<T extends object, U extends object>(target: T, source: U): T & U {
  Object.keys(source).forEach((key) => {
    const targetValue = target[key]
    const sourceValue = source[key]

    if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = merge({ ...targetValue }, sourceValue)
    } else if (Array.isArray(sourceValue)) {
      target[key] = [...sourceValue]
    } else {
      target[key] = sourceValue
    }
  })

  return target as T & U
}
