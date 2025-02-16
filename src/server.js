const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const cors = require('cors');
const SimulationService = require('./services/SimulationService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    
    const simulation = new SimulationService(socket);

    socket.on('startSimulation', () => {
        console.log('Starting simulation...');
        simulation.start();
    });

    socket.on('stopSimulation', () => {
        console.log('Stopping simulation...');
        simulation.stop();
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        simulation.stop();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
