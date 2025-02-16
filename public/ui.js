document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    startBtn.addEventListener('click', () => {
        socket.emit('startSimulation');
    });
    
    stopBtn.addEventListener('click', () => {
        socket.emit('stopSimulation');
    });
});
