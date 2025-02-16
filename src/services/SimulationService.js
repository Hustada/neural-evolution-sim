const tf = require('@tensorflow/tfjs-node');
const AIAnalysisService = require('./AIAnalysisService');
const CodeEvolutionService = require('./CodeEvolutionService');

// Learning rate parameters
const initialLearningRate = 0.003;
const minLearningRate = 0.001;
const warmupSteps = 100;
const decaySteps = 500;

class SimulationService {
    constructor(io) {
        this.io = io;
        this.aiAnalysis = new AIAnalysisService();
        this.codeEvolution = new CodeEvolutionService();
        
        // Analysis tracking
        this.lastAnalysis = null;
        this.analysisInterval = 10; // generations between analyses
        
        // Initialize stats tracking
        this.stats = {
            population: {
                size: 0,
                avgFitness: 0,
                maxFitness: 0,
                avgDistance: 0,
                maxDistance: 0
            },
            neuralStats: {},
            activeSpecies: 0,
            totalSpeciesEver: 0,
            networkStats: {
                averageWeights: [],
                weightVariance: []
            }
        };

        // Simulation parameters
        this.population = [];
        this.populationSize = 30; // Reduced from 100 to 30
        this.generationLength = 800;
        this.currentStep = 0;
        this.generationCount = 1;
        this.speciesCounter = 1;
        this.speciesLog = {};
        this.extinctSpecies = [];
        this.activeSpecies = new Set();
        this.isRunning = false;

        // Evolution parameters
        this.baseMutationRate = 0.3;
        this.minMutationRate = 0.1;
        this.maxMutationRate = 0.5;
        this.baseSpeciesThreshold = 0.25;
        this.noveltyWeight = 0.4;
        this.speciesStagnationThreshold = 10;

        // Environment dimensions
        this.width = 800;
        this.height = 600;
    }

    async start() {
        try {
            if (this.isRunning) return;
            this.isRunning = true;
            
            await this.initialize();
            this.run();
            
            this.io.emit('simulationStarted');
        } catch (error) {
            console.error('Error starting simulation:', error);
            this.stop();
        }
    }

    stop() {
        this.isRunning = false;
        this.io.emit('simulationStopped');
    }

    async initialize() {
        try {
            this.population = [];
            
            for (let i = 0; i < this.populationSize; i++) {
                const x = Math.random() * this.width;
                const y = Math.random() * this.height;
                const agent = await this.createAgent(x, y);
                this.population.push(agent);
            }
            
            console.log(`Initialized population with ${this.population.length} agents`);
            this.updateStats();
        } catch (error) {
            console.error('Error initializing simulation:', error);
            throw error;
        }
    }

    async createAgent(x, y) {
        const brain = await this.createNeuralNetwork();
        return {
            brain,
            fitness: 0,
            x,
            y,
            speciesId: null,
            distanceTraveled: 0,
            history: [],
            age: 0
        };
    }

    async createNeuralNetwork() {
        const model = tf.sequential();
        
        model.add(tf.layers.dense({
            inputShape: [8],
            units: 16,
            activation: 'relu',
            kernelInitializer: 'glorotNormal'
        }));
        
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu',
            kernelInitializer: 'glorotNormal'
        }));
        
        model.add(tf.layers.dense({
            units: 4,
            activation: 'softmax',
            kernelInitializer: 'glorotNormal'
        }));

        return model;
    }

    async run() {
        while (this.isRunning) {
            if (this.currentStep >= this.generationLength) {
                await this.evaluateAndEvolve();
            } else {
                await this.step();
                this.currentStep++;
                
                if (this.currentStep % 10 === 0) { // Update more frequently
                    this.updateStats();
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 16));
        }
    }

    updateStats() {
        try {
            const fitnesses = this.population.map(agent => agent.fitness);
            const distances = this.population.map(agent => agent.distanceTraveled);
            
            // Update population stats
            this.stats.population = {
                size: this.population.length,
                avgFitness: fitnesses.reduce((a, b) => a + b, 0) / this.population.length,
                maxFitness: Math.max(...fitnesses),
                avgDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
                maxDistance: Math.max(...distances),
                agents: this.population.map(agent => ({
                    x: agent.x,
                    y: agent.y,
                    fitness: agent.fitness,
                    rotation: Math.atan2(
                        agent.y - (agent.history[agent.history.length - 2]?.y ?? agent.y),
                        agent.x - (agent.history[agent.history.length - 2]?.x ?? agent.x)
                    )
                }))
            };

            this.stats.activeSpecies = this.activeSpecies.size;
            this.stats.totalSpeciesEver = this.speciesCounter;
            
            // Add performance metrics
            this.stats.performance = {
                generation: this.generationCount,
                current_step: this.currentStep,
                steps_per_generation: this.generationLength,
                mutation_rate: this.baseMutationRate,
                elite_percentage: '10%',
                last_analysis: this.lastAnalysis || 'Pending...',
                code_evolution_status: this.codeEvolutionStatus || 'Pending...'
            };
            
            if (this.population[0]?.brain) {
                this.calculateNeuralStats(this.population[0].brain);
            }

            // Emit both events
            this.io.emit('stats', this.stats);
            this.io.emit('simulationUpdate', {
                generation: this.generationCount,
                step: this.currentStep,
                stats: this.stats,
                analysis: this.lastAnalysis
            });

            // Log only at the start of new generations
            if (this.currentStep === 0) {
                console.log(`Starting Generation ${this.generationCount}`);
            }

            // Trigger AI analysis periodically
            if (this.currentStep % 200 === 0) {
                this.analyzePerformance();
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    calculateNeuralStats(brain) {
        const weights = brain.getWeights();
        const averageWeights = [];
        const weightVariance = [];
        
        for (let i = 0; i < weights.length; i += 2) {
            const layerWeights = weights[i].arraySync();
            const flatWeights = Array.isArray(layerWeights) ? layerWeights.flat() : [layerWeights];
            const avgWeight = flatWeights.reduce((a, b) => a + b, 0) / flatWeights.length;
            const variance = this.calculateVariance(flatWeights);
            
            this.stats.neuralStats[`Layer ${Math.floor(i/2) + 1}`] = {
                avgWeight,
                variance
            };
            
            averageWeights.push(avgWeight);
            weightVariance.push(variance);
        }
        
        this.stats.networkStats.averageWeights = averageWeights;
        this.stats.networkStats.weightVariance = weightVariance;
    }

    calculateVariance(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    }

    async step() {
        for (const agent of this.population) {
            const inputs = this.getAgentInputs(agent);
            const action = await this.decideAction(agent.brain, inputs);
            this.performAction(agent, action);
            this.updateFitness(agent);
        }
    }

    getAgentInputs(agent) {
        // Simplified sensor inputs
        return [
            agent.x / this.width,
            agent.y / this.height,
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random()
        ];
    }

    async decideAction(brain, inputs) {
        const inputTensor = tf.tensor2d([inputs]);
        const outputTensor = brain.predict(inputTensor);
        const action = await outputTensor.argMax(1).data();
        
        inputTensor.dispose();
        outputTensor.dispose();
        
        return action[0];
    }

    performAction(agent, action) {
        const speed = 5;
        const prevX = agent.x;
        const prevY = agent.y;
        
        // Keep track of position history
        if (!agent.history) agent.history = [];
        agent.history.push({ x: prevX, y: prevY });
        if (agent.history.length > 5) agent.history.shift(); // Keep last 5 positions
        
        switch(action) {
            case 0: // Move up
                agent.y = Math.max(0, agent.y - speed);
                break;
            case 1: // Move right
                agent.x = Math.min(this.width, agent.x + speed);
                break;
            case 2: // Move down
                agent.y = Math.min(this.height, agent.y + speed);
                break;
            case 3: // Move left
                agent.x = Math.max(0, agent.x - speed);
                break;
        }
        
        const distance = Math.sqrt(
            Math.pow(agent.x - prevX, 2) + 
            Math.pow(agent.y - prevY, 2)
        );
        
        agent.distanceTraveled += distance;
    }

    updateFitness(agent) {
        // Basic fitness based on distance traveled
        agent.fitness = agent.distanceTraveled;
    }

    async evaluateAndEvolve() {
        try {
            // Sort population by fitness
            this.population.sort((a, b) => b.fitness - a.fitness);

            // Keep track of best performers
            const elites = this.population.slice(0, Math.floor(this.populationSize * 0.1));

            // Create new population
            const newPopulation = [...elites];

            // Fill the rest of the population with offspring
            while (newPopulation.length < this.populationSize) {
                const parent = this.selectParent();
                const offspring = await this.createOffspring(parent);
                newPopulation.push(offspring);
            }

            // Update population
            this.population = newPopulation;

            // Reset step counter
            this.currentStep = 0;
            this.generationCount++;

            // Update and emit stats
            this.updateStats();
            this.io.emit('stats', this.stats);

            // Analyze performance and evolve code if needed
            await this.analyzePerformance();
        } catch (error) {
            console.error('Error in evaluateAndEvolve:', error);
        }
    }

    selectParent() {
        // Tournament selection
        const tournamentSize = 5;
        let best = null;

        for (let i = 0; i < tournamentSize; i++) {
            const contestant = this.population[Math.floor(Math.random() * this.population.length)];
            if (!best || contestant.fitness > best.fitness) {
                best = contestant;
            }
        }

        return best;
    }

    async createOffspring(parent) {
        try {
            const offspring = await this.createAgent(parent.x, parent.y);
            
            // Copy parent's brain architecture
            const parentWeights = parent.brain.getWeights();
            
            // Ensure weights are properly structured before mutation
            const validWeights = parentWeights.map(w => {
                if (!w.shape || !w.arraySync) {
                    console.error('Invalid weight tensor:', w);
                    return tf.zeros(offspring.brain.getWeights()[0].shape);
                }
                return w;
            });
            
            const mutatedWeights = this.mutateWeights(validWeights);
            
            // Verify weights before setting
            const originalShape = offspring.brain.getWeights().map(w => w.shape);
            const mutatedShape = mutatedWeights.map(w => w.shape);
            
            if (JSON.stringify(originalShape) !== JSON.stringify(mutatedShape)) {
                console.error('Shape mismatch:', { original: originalShape, mutated: mutatedShape });
                throw new Error('Weight shape mismatch during mutation');
            }
            
            // Set mutated weights to offspring's brain
            await offspring.brain.setWeights(mutatedWeights);
            
            return offspring;
        } catch (error) {
            console.error('Error in createOffspring:', error);
            throw error;
        }
    }

    mutateWeights(weights) {
        return weights.map(tensorWeight => {
            const shape = tensorWeight.shape;
            const values = tensorWeight.arraySync();
            
            // Helper function to recursively mutate nested arrays
            const mutateArray = (arr) => {
                if (!Array.isArray(arr)) {
                    return Math.random() < this.baseMutationRate ? 
                        arr + (Math.random() * 2 - 1) * 0.1 : 
                        arr;
                }
                return arr.map(mutateArray);
            };
            
            // Mutate values while preserving structure
            const mutated = mutateArray(values);
            
            return tf.tensor(mutated, shape);
        });
    }

    async analyzePerformance() {
        // Only analyze every N generations
        if (this.generationCount % this.analysisInterval !== 0) {
            return;
        }

        try {
            console.log(`\n🔄 Generation ${this.generationCount} Analysis`);
            const analysis = await this.aiAnalysis.analyzeSimulation({
                stats: this.stats,
                generation: this.generationCount
            });

            if (analysis) {
                this.lastAnalysis = analysis;
                console.log(`\n📊 Performance Score: ${analysis.performanceScore}`);
                
                // Send both analysis and stats to UI
                this.io.emit('simulationUpdate', {
                    generation: this.generationCount,
                    step: this.currentStep,
                    stats: this.stats,
                    analysis: analysis
                });

                // If performance is below threshold, trigger code evolution
                if (analysis.performanceScore < 75) {
                    console.log('\n🧬 Performance below threshold, evolving code...');
                    await this.codeEvolution.analyzeAndEvolve(analysis, this.stats);
                } else {
                    console.log('\n✅ Performance satisfactory, no evolution needed');
                }
            }
        } catch (error) {
            console.error('\n❌ Error analyzing performance:', error);
        }
    }
}

module.exports = SimulationService;
