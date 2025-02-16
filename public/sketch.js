let socket;
let agents = [];
let isRunning = false;
let gridSize = 20;
let cols, rows;

function setup() {
    const simDiv = document.getElementById('simulation');
    const canvas = createCanvas(simDiv.clientWidth, simDiv.clientHeight);
    canvas.parent('simulation');
    
    cols = floor(width / gridSize);
    rows = floor(height / gridSize);
    
    colorMode(HSB, 100);
    frameRate(30); // Limit frame rate for performance
    
    socket = io();
    
    socket.on('simulationUpdate', (data) => {
        updateStats(data.stats, data.analysis);
        agents = data.stats.population?.agents || [];
        agents = agents.map(agent => ({
            ...agent,
            displayX: lerp(agent.displayX || agent.x, agent.x, 0.1),
            displayY: lerp(agent.displayY || agent.y, agent.y, 0.1)
        }));
    });
    
    socket.on('simulationStarted', () => isRunning = true);
    socket.on('simulationStopped', () => isRunning = false);

    // Handle window resize
    window.addEventListener('resize', () => {
        resizeCanvas(simDiv.clientWidth, simDiv.clientHeight);
        cols = floor(width / gridSize);
        rows = floor(height / gridSize);
    });
}

function draw() {
    background(15); // Dark background
    
    // Draw grid
    stroke(30);
    strokeWeight(1);
    for (let x = 0; x < width; x += gridSize) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
        line(0, y, width, y);
    }
    
    if (isRunning && agents.length > 0) {
        // Draw agents with smooth movement
        agents.forEach((agent, i) => {
            // Calculate color based on normalized fitness
            const maxFitness = Math.max(...agents.map(a => a.fitness || 0));
            const normalizedFitness = maxFitness > 0 ? (agent.fitness || 0) / maxFitness * 100 : 0;
            const hue = map(normalizedFitness, 0, 100, 0, 60);
            const brightness = map(normalizedFitness, 0, 100, 50, 100);
            
            // Draw agent body
            fill(hue, 80, brightness);
            noStroke();
            let x = agent.displayX || agent.x;
            let y = agent.displayY || agent.y;
            
            push();
            translate(x, y);
            
            // Draw a more interesting agent shape
            beginShape();
            for (let a = 0; a < TWO_PI; a += PI / 3) {
                let r = 8 + sin(frameCount * 0.1 + i) * 2;
                vertex(cos(a) * r, sin(a) * r);
            }
            endShape(CLOSE);
            
            // Draw direction indicator
            if (agent.rotation !== undefined) {
                stroke(hue, 60, 100);
                strokeWeight(2);
                let dirX = cos(agent.rotation) * 12;
                let dirY = sin(agent.rotation) * 12;
                line(0, 0, dirX, dirY);
            }
            
            pop();
        });
    }
}

function updateStats(stats, analysis) {
    // Update population stats
    let populationHtml = '';
    if (stats.population) {
        populationHtml += createStatItem('Population Size', stats.population.size);
        populationHtml += createStatItem('Avg Fitness', stats.population.avgFitness.toFixed(2));
        populationHtml += createStatItem('Max Fitness', stats.population.maxFitness.toFixed(2));
        populationHtml += createStatItem('Avg Distance', stats.population.avgDistance.toFixed(2));
        populationHtml += createStatItem('Max Distance', stats.population.maxDistance.toFixed(2));
        
        if (stats.activeSpecies !== undefined) {
            populationHtml += createStatItem('Active Species', stats.activeSpecies);
            populationHtml += createStatItem('Total Species', stats.totalSpeciesEver);
        }
    }
    document.getElementById('population-stats').innerHTML = populationHtml;
    
    // Update neural network stats
    let neuralHtml = '';
    if (stats.neuralStats) {
        for (const [layer, data] of Object.entries(stats.neuralStats)) {
            neuralHtml += createStatItem(`${layer} Avg Weight`, data.avgWeight.toFixed(4));
            neuralHtml += createStatItem(`${layer} Variance`, data.variance.toFixed(4));
        }
    }
    document.getElementById('neural-stats').innerHTML = neuralHtml;
    
    // Update performance metrics
    let perfHtml = '';
    if (stats.performance) {
        for (const [key, value] of Object.entries(stats.performance)) {
            perfHtml += createStatItem(formatLabel(key), formatValue(value));
        }
    }
    document.getElementById('performance-content').innerHTML = perfHtml;
    
    // Update analysis section
    let analysisHtml = '';
    if (analysis) {
        analysisHtml += createStatItem('Generation', stats.generation);
        analysisHtml += createStatItem('Performance Score', `${analysis.performanceScore}%`);
        analysisHtml += createStatItem('Summary', analysis.summary);
        
        if (analysis.insights && analysis.insights.length > 0) {
            analysisHtml += '<div class="insights">';
            analysisHtml += '<h4>Key Insights:</h4>';
            analysisHtml += '<ul class="insight-list">';
            analysis.insights.forEach(insight => {
                analysisHtml += `<li>${insight}</li>`;
            });
            analysisHtml += '</ul>';
            analysisHtml += '</div>';
        }
        
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            analysisHtml += '<div class="recommendations">';
            analysisHtml += '<h4>Recommendations:</h4>';
            analysisHtml += '<ul class="recommendation-list">';
            analysis.recommendations.forEach(rec => {
                analysisHtml += `<li>${rec}</li>`;
            });
            analysisHtml += '</ul>';
            analysisHtml += '</div>';
        }
    }
    document.getElementById('analysis-stats').innerHTML = analysisHtml;
}

function createStatItem(label, value) {
    return `
        <div class="stat-item">
            <span class="stat-label">${label}:</span>
            <span class="stat-value">${value}</span>
        </div>
    `;
}

function formatLabel(key) {
    return key.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatValue(value) {
    if (typeof value === 'number') {
        return value.toFixed(2);
    }
    return value;
}
