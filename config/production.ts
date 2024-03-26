export default {
  predictionProvider: {
    mdesign: {
      detrResNet: {
        // URL: 'https://us-central1-aiplatform.googleapis.com/v1/projects/modern-design-ai/locations/us-central1/endpoints/5739716778804641792:predict',
        URL: 'https://detr-resnet.fly.dev/predictions',
      },
    },
    replicate: {
      stableDiffusion: {
        webhook: 'https://mdesign.ai/api/interior/create/callback',
      },
    },
  },
}
