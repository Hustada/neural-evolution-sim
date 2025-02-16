# Neural Evolution Simulation

A real-time neural evolution simulator that demonstrates emergent behavior through neural networks and genetic algorithms. Features interactive visualization, automated code evolution, and AI-driven performance analysis. Built with TensorFlow.js, p5.js, and Node.js.

## Features

- 🧠 Neural Network Evolution
  - TensorFlow.js-powered neural networks
  - Adaptive learning rates
  - Species-based evolution
  - Mutation and crossover strategies

- 🌍 Interactive Environment
  - Real-time 2D visualization with p5.js
  - Dynamic obstacles and rewards
  - Configurable simulation parameters

- 🔄 Code Evolution
  - Automated code improvement system
  - Performance-based optimization
  - Git integration for version control
  - OpenAI-powered code analysis

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/neural-evolution-sim.git
cd neural-evolution-sim
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
PORT=3000
OPENAI_API_KEY=your_api_key_here
```

4. Start the server:
```bash
npm start
```

5. Open `http://localhost:3000` in your browser

## Architecture

### Neural Network Structure
- Input Layer: Environmental sensors
- Hidden Layers: Configurable architecture
- Output Layer: Action decisions
- Adaptive learning rates for optimization

### Evolution System
- Species-based population management
- Fitness evaluation based on:
  - Distance traveled
  - Rewards collected
  - Survival time
  - Novel behavior exploration

### Code Evolution
- Automated performance analysis
- AI-driven code optimization
- Git-based version control
- Safe rollback mechanisms

## Configuration

Key parameters in `src/config.js`:
- Population size
- Generation length
- Mutation rates
- Species threshold
- Learning rate parameters

## Development

### Running Tests
```bash
npm test
```

### Development Server
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
