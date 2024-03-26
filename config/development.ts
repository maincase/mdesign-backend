export default {
  predictionProvider: {
    mdesign: {
      stableDiffusion: {
        URL: 'http://localhost:3080/predictions/stable_diffusion_xl-0.1.24',
      },
      detrResNet: {
        // URL: 'https://us-central1-aiplatform.googleapis.com/v1/projects/modern-design-ai/locations/us-central1/endpoints/5739716778804641792:predict',
        URL: 'https://detr-resnet.fly.dev/predictions',
      },
    },
  },
}
