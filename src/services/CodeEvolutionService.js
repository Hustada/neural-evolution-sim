const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

class CodeEvolutionService {
    constructor() {
        this.git = simpleGit();
        this.modificationHistory = [];
        this.performanceThreshold = 60; // Lowered from 75 to allow more evolution
        this.baselinePerformance = 0;
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        this.analysisInterval = 10;
        this.performanceHistory = [];
    }

    async analyzeAndEvolve(analysis, stats) {
        if (!this.shouldEvolve(stats.generation)) return;
        
        // Track performance history
        if (analysis?.performanceScore) {
            this.performanceHistory.push({
                generation: stats.generation,
                score: analysis.performanceScore,
                avgFitness: stats.population.avgFitness,
                maxFitness: stats.population.maxFitness
            });
        }
        
        console.log('\n=== Starting Code Evolution Process ===');
        console.log(`Performance History: ${JSON.stringify(this.performanceHistory.slice(-5), null, 2)}`);
        
        if (!this.OPENAI_API_KEY || !this.OPENAI_API_KEY.startsWith('sk-')) {
            console.error('❌ Invalid or missing OpenAI API key');
            return;
        }

        if (!analysis || !analysis.performanceScore || analysis.performanceScore > this.performanceThreshold) {
            console.log('Performance satisfactory, no evolution needed');
            return;
        }

        const branchName = `auto-evolution-${Date.now()}`;
        let currentBranch;

        try {
            currentBranch = (await this.git.branch()).current;
            await this.git.checkoutLocalBranch(branchName);

            console.log('\n🔍 Identifying potential improvements...');
            const improvements = await this.identifyImprovements(analysis, stats);
            
            if (!improvements?.length) {
                console.log('❌ No improvements identified');
                await this.cleanupBranch(branchName);
                return;
            }

            const success = await this.applyImprovements(improvements);
            
            if (success) {
                this.modificationHistory.push({
                    timestamp: Date.now(),
                    analysis,
                    improvements,
                    branch: branchName
                });

                await this.commitChanges(branchName, improvements);
                console.log('\n✨ Code evolution complete!');
            } else {
                console.log('Code evolution failed, reverting changes');
                await this.cleanupBranch(branchName);
            }
        } catch (error) {
            console.error('Error during code evolution:', error);
            await this.handleEvolutionError(currentBranch, branchName);
        }
    }

    shouldEvolve(generation) {
        return generation % this.analysisInterval === 0;
    }

    async identifyImprovements(analysis, stats) {
        try {
            const prompt = `Based on the following simulation analysis and neural network stats, suggest specific code improvements:

Analysis Summary: ${analysis.summary}
Key Insights: ${analysis.insights.join('\n')}
Performance Score: ${analysis.performanceScore}

Neural Network Stats:
${JSON.stringify(stats.neuralStats, null, 2)}

Population Stats:
- Size: ${stats.population.size}
- Average Distance: ${stats.population.avgDistance}
- Active Species: ${stats.activeSpecies}

Suggest specific improvements focusing on:
1. Neural network architecture optimization
2. Learning algorithm improvements
3. Performance bottlenecks
4. Code efficiency

Return improvements in this JSON format:
[{
    "file": "filename.js",
    "description": "improvement description",
    "type": "architecture|algorithm|performance",
    "priority": 1-5,
    "risk": "low|medium|high",
    "codeChanges": {
        "target": "exact code to replace",
        "replacement": "new code"
    }
}]`;

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-3.5-turbo-0125',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an AI code evolution expert specialized in TensorFlow.js and neural networks.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return JSON.parse(response.data.choices[0].message.content);
        } catch (error) {
            console.error('Error identifying improvements:', error);
            return null;
        }
    }

    async applyImprovements(improvements) {
        for (const improvement of improvements) {
            try {
                const filePath = path.join(process.cwd(), 'src/services', improvement.file);
                
                if (!await fs.pathExists(filePath)) {
                    console.error(`File not found: ${filePath}`);
                    continue;
                }

                await fs.copy(filePath, `${filePath}.backup`);

                let content = await fs.readFile(filePath, 'utf8');
                content = content.replace(
                    improvement.codeChanges.target,
                    improvement.codeChanges.replacement
                );
                
                await fs.writeFile(filePath, content);
            } catch (error) {
                console.error(`Error applying improvement to ${improvement.file}:`, error);
                await this.restoreFromBackup(improvement.file);
                return false;
            }
        }
        return true;
    }

    async commitChanges(branchName, improvements) {
        try {
            const message = `Auto-evolution: ${improvements.map(i => i.description).join(', ')}`;
            await this.git.add('.');
            await this.git.commit(message);
            await this.git.checkout(['main']);
            await this.git.merge([branchName]);
            await this.git.push('origin', 'main');
            await this.git.branch(['-D', branchName]);
        } catch (error) {
            console.error('Error during git operations:', error);
            throw error;
        }
    }

    async cleanupBranch(branchName) {
        if (!branchName) return;
        try {
            await this.git.checkout(['main']);
            await this.git.branch(['-D', branchName]);
        } catch (error) {
            console.error('Error during branch cleanup:', error);
        }
    }

    async handleEvolutionError(currentBranch, branchName) {
        try {
            if (currentBranch) {
                await this.git.checkout([currentBranch]);
            }
            if (branchName) {
                await this.git.branch(['-D', branchName]);
            }
        } catch (error) {
            console.error('Error during error handling:', error);
        }
    }

    async restoreFromBackup(file) {
        const filePath = path.join(process.cwd(), file);
        await fs.copy(`${filePath}.backup`, filePath);
        await fs.remove(`${filePath}.backup`);
    }

    getModificationHistory() {
        return this.modificationHistory;
    }
}

module.exports = CodeEvolutionService;
