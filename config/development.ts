export default {
  predictionProvider: {
    stableDiffusion: {
      URL: 'http://localhost:3080/predictions/stable_diffusion_xl-0.1.9',
    },
    detrResNet: {
      URL: 'https://us-central1-aiplatform.googleapis.com/v1/projects/modern-design-ai/locations/us-central1/endpoints/7022286097489068032:predict',
    },
  },
}
