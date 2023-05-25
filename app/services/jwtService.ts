import jwt from 'jsonwebtoken'

let config: { secret: any; algorithm: any; issuer: any; audience: any; expiresIn: any; ignoreExpiration: any }

function sign(payload) {
  return jwt.sign(payload, config.secret, {
    algorithm: config.algorithm,
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: config.expiresIn,
    // subject: config.subject,
  })
}

function decode(token) {
  return jwt.decode(token, { complete: true })
}

function verify(token) {
  return jwt.verify(token, config.secret, {
    issuer: config.issuer,
    audience: config.audience,
    // subject: config.subject,
    ignoreExpiration: config.ignoreExpiration,
  })
}

export default function jwtService(configuration): { sign: typeof sign; decode: typeof decode; verify: typeof verify } {
  config = configuration

  return {
    sign,
    decode,
    verify,
  }
}
