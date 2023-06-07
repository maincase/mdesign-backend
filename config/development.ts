export default {
  port: 8080,
  httpsPort: 8081,
  database: {
    connection:
      'mongodb+srv://mdesigndb:LxQjD9USz11rrq8B@cluster0.0gtzqr6.mongodb.net/mdesigndb?retryWrites=true&w=majority',
  },
  predictionProvider: {
    stableDiffusion: {
      URL: 'http://localhost:7080/predictions/stable-diffusion-1.0.0',
      prompt:
        'Transform the given space into a fully furnished %s %s room with as much furniture as possible while maintaining a functional and visually appealing layout, taking into account walls and layout.',
    },
    detrResNet: {
      URL: 'http://localhost:7080/predictions/detr-resnet-1.0.0',
    },
  },
}
