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
      URL: 'http://localhost:7080/predictions/stable_diffusion_xl-0.0.82',
      // prompt:
      //   'Transform the given space into a fully furnished photo-realistic %s %s with as much furniture as possible while maintaining a functional and visually appealing layout, taking into account walls and layout.',
      // prompt:
      //   'realistic %s %s very detailed, hyper sharp focus, super resolution, stunning intricate detail, photorealistic, dramatic lighting, octane render, lot of furniture, ultra realistic, 8k',
      // prompt:
      //   'interior design, %s style, %s design, white style, %s, modular furniture with cotton textiles, wooden floor, low ceiling, large steel windows viewing a city, carpet on the floor, minimalism, minimal, clean, tiny style, accent bright color, air, eclectic trends, gray, simple and functional',
      prompt:
        'photo-realistic ${room} with ${style} style, as much furniture and appliances as possible, with best quality and high detail, leave original walls',
      negative_prompt:
        'lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, out of frame, blurry, deformed, underexposed, overexposed, low contrast, watermark, signature, cut off',
      inference_steps: 20,
      // inference_steps: 100,
      inference_strength: 0.75,
      inference_guidance_scale: 15,
      num_return_images: 3,
      // generator_seed: 147903165,
      generator_seed: 2147483647,
    },
    detrResNet: {
      URL: 'http://localhost:7080/predictions/detr_resnet-0.0.82',
    },
  },
  paginationLimit: 20,
}
