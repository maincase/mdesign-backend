/**
 * Check if the given `obj` is an object
 * @param obj - The variable to check
 * @returns boolean
 */
export default function isObject(obj: any): boolean {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj)
}
