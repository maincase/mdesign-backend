export default {
  port: 8080,
  httpsPort: 8081,
  database: {
    connection:
      'mongodb+srv://mdesigndb:LxQjD9USz11rrq8B@cluster0.0gtzqr6.mongodb.net/mdesigndb?retryWrites=true&w=majority',
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
  googleCloud: {
    // projectId: 'modern-design-ai',
    storage: {
      bucketName: 'modern-design-storage',
      serviceAccountKey: 'modern-design-ai-8a0b91b760d4.json',
    },
    ai: {
      serviceAccountKey: 'modern-design-ai-9994297dd866.json',
    },
  },
  predictionProvider: {
    stableDiffusion: {
      URL: 'http://localhost:7080/predictions/stable_diffusion-0.0.48',
      prompt:
        'Transform the given space into a fully furnished %s %s room with as much furniture as possible while maintaining a functional and visually appealing layout, taking into account walls and layout.',
      inference_steps: 35,
      // inference_steps: 100,
      inference_strength: 0.65,
      inference_guidance_scale: 25,
      num_return_images: 3,
      generator_seed: -11,
    },
    detrResNet: {
      URL: 'http://localhost:7080/predictions/detr_resnet-0.0.48',
    },
  },
  paginationLimit: 10,
}
