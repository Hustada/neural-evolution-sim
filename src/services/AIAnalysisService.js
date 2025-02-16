const axios = require('axios');

class AIAnalysisService {
    constructor() {
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    }

    async analyzeSimulation(data) {
        if (!this.OPENAI_API_KEY) {
            console.warn('OpenAI API key not found. Skipping AI analysis.');
            return null;
        }

        try {
            console.log(`\n🧠 Analyzing Generation ${data.generation}...`);
            console.log('Stats:', JSON.stringify(data.stats, null, 2));
            
            const prompt = this.createAnalysisPrompt(data);
            console.log('📤 Calling OpenAI API...');
            const response = await this.callOpenAI(prompt);
            console.log('📥 Raw OpenAI response:', response);
            
            const parsed = this.parseAnalysis(response);
            if (parsed) {
                console.log('✅ Analysis complete:', JSON.stringify(parsed, null, 2));
            } else {
                console.error('❌ Failed to parse OpenAI response');
            }
            return parsed;
        } catch (error) {
            console.error('❌ Error during AI analysis:', error.message);
            if (error.response?.data) {
                console.error('OpenAI API error details:', error.response.data);
            }
            return null;
        }
    }

    createAnalysisPrompt(data) {
        const { stats, generation } = data;
        
        return `Analyze the following neural evolution simulation data for generation ${generation}:

Population Stats:
- Size: ${stats.population.size}
- Average Fitness: ${stats.population.avgFitness}
- Max Fitness: ${stats.population.maxFitness}
- Average Distance: ${stats.population.avgDistance}
- Max Distance: ${stats.population.maxDistance}

Neural Network Stats:
${JSON.stringify(stats.neuralStats, null, 2)}

Species Information:
- Active Species: ${stats.activeSpecies}
- Total Species Ever: ${stats.totalSpeciesEver}

Calculate the performance score (0-100) using these criteria:
- Population diversity (0-25): Based on number of active species and their distribution
- Learning progress (0-25): Based on generation-over-generation improvement in average fitness
- Exploration efficiency (0-25): Based on the ratio of average distance to max distance
- Neural network health (0-25): Based on weight distributions and network architecture

Then:
1. Evaluate the current performance using the above metrics
2. Identify potential issues or bottlenecks
3. Suggest specific improvements to the neural network architecture or training process
4. Recommend parameter adjustments if needed

Format the response as JSON with the following structure:
{
    "performanceScore": number (0-100),
    "summary": "brief overview",
    "insights": ["key insight 1", "key insight 2"],
    "recommendations": ["specific recommendation 1", "specific recommendation 2"]
}`;
    }

    async callOpenAI(prompt) {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo-0125',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an AI expert specialized in analyzing neural network evolution simulations. Provide detailed, technical analysis focused on improving performance.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 1000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API error:', error.response?.data || error.message);
            throw error;
        }
    }

    parseAnalysis(response) {
        try {
            return JSON.parse(response);
        } catch (error) {
            console.error('Error parsing AI analysis response:', error);
            return null;
        }
    }
}

module.exports = AIAnalysisService;
