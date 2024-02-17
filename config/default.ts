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
      bucketName: 'mdesign-public',
      serviceAccountKey: 'modern-design-ai-8a0b91b760d4.json',
    },
    ai: {
      serviceAccountKey: 'modern-design-ai-9994297dd866.json',
    },
    vision: {
      productSet: 'projects/modern-design-ai/locations/us-east1/productSets/amazonProductSet',
      productCategory: 'homegoods-v2',
    },
  },
  cloudflare: {
    turnstile: {
      verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      secret: '0x4AAAAAAASDhYjLhbftz4O9uG-1DEI3_ZU',
    },
  },
  predictionProvider: {
    replicate: {
      REPLICATE_API_TOKEN: 'r8_KzSGMBHRwJv5jGGfkavVQPrN64evMwV0vw4gG',
      stableDiffusion: {
        URL: 'alaradirik/t2i-adapter-sdxl-depth-midas:8a89b0ab59a050244a751b6475d91041a8582ba33692ae6fab65e0c51b700328',
        input: {
          // prompt:
          //   'Transform the given space into a fully furnished photo-realistic %s %s with as much furniture as possible while maintaining a functional and visually appealing layout, taking into account walls and layout.',
          // prompt:
          //   'photo-realistic %s %s very detailed, hyper sharp focus, super resolution, stunning intricate detail, photorealistic, dramatic lighting, octane render, furniture, electronics, ultra realistic, 4k, 8k',
          // prompt:
          //   'interior design, %s style, %s design, white style, %s, modular furniture with cotton textiles, wooden floor, low ceiling, large steel windows viewing a city, carpet on the floor, minimalism, minimal, clean, tiny style, accent bright color, air, eclectic trends, gray, simple and functional',
          prompt:
            // eslint-disable-next-line no-template-curly-in-string
            'photo-realistic interior design for ${room} with ${style} style with same lightning as in initial image, very detailed, hyper sharp focus, super resolution, leave original walls, stunning intricate detail, photorealistic, octane render, furniture, electronics, ultra realistic, 4k, 8k',
          // 'photo-realistic ${room} with ${style} style, as much furniture and appliances as possible, with best quality and high detail, leave original walls',
          negative_prompt:
            'lowres, text, error, cropped, worst quality, low quality, jpeg artifacts, ugly, duplicate, out of frame, blurry, deformed, underexposed, overexposed, low contrast, watermark, signature, cut off, not finished, blur, overloaded',
          num_inference_steps: 30,
          // inference_steps: 100,
          prompt_strength: 0.74,
          guidance_scale: 9,
          num_samples: 3,
          // generator_seed: 147903165,
          seed: 2147483647,
          scheduler: 'K_EULER_ANCESTRAL',
          adapter_conditioning_factor: 1,
        },
        webhook: 'https://adf4-94-43-116-18.ngrok-free.app/api/interior/create/callback',
      },
      // detrResNet: {
      //   URL: 'maincase/mdesign-resnet50',
      // },
    },
    mdesign: {
      stableDiffusion: {
        URL: 'http://localhost:3080/predictions/stable_diffusion_xl-0.1.24',
        // prompt:
        //   'Transform the given space into a fully furnished photo-realistic %s %s with as much furniture as possible while maintaining a functional and visually appealing layout, taking into account walls and layout.',
        // prompt:
        //   'realistic %s %s very detailed, hyper sharp focus, super resolution, stunning intricate detail, photorealistic, dramatic lighting, octane render, lot of furniture, ultra realistic, 8k',
        // prompt:
        //   'interior design, %s style, %s design, white style, %s, modular furniture with cotton textiles, wooden floor, low ceiling, large steel windows viewing a city, carpet on the floor, minimalism, minimal, clean, tiny style, accent bright color, air, eclectic trends, gray, simple and functional',
        prompt:
          // eslint-disable-next-line no-template-curly-in-string
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
        URL: 'http://localhost:3080/predictions/detr_resnet-0.1.24',
      },
    },
  },
  paginationLimit: 20,
}
