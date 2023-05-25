/**
 * Middleware for role checking.
 * Note: isAuthenticated middleware should be called prior to this
 * @param {string} role - Name of role we require
 */
export default function requirePermission(permission = '') {
  return (req: any, res: any, next: any) => {
    const {
      user: { permissions },
    } = req

    const result = permissions.filter((item: any) => item.name === permission && item.hasPermission)

    if (result.length <= 0) {
      return res.forbidden(`You don't have permission to this action: ${permission}`)
    }

    next()
  }
}
