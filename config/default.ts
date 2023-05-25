export default {
  port: 8080,
  httpsPort: 8081,
  database: {
    connection: '<CONNECTION_STRING_HERE>',
  },
  facebook: {
    clientID: '1077731956054779',
    clientSecret: '079d6f92a3a642ca0bc3d4d17bf2289c',
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'email', 'name'],
  },
  reactAppUrl: 'http://localhost:3000',
  jwt: {
    secret: '@LEvnPW4aH3x.372NpTtTDpwQkRRJm',
    algorithm: 'HS256',
    issuer: 'mdesign',
    audience: 'mdesign',
    expiresIn: '24h',
    ignoreExpiration: true,
    subject: '',
  },
  deployment: {
    dev: {},
    test: {},
    prod: {},
  },
  secret: '@LEvnPW4aH3x.372NpTtTDpwQkRRJm',
  loginResetPassword: false,
  backendUrl: 'http://localhost:8080',
  GCPProjectId: 'Add project id',
}
