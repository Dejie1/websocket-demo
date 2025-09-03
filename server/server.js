const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Game state
let gameState = {
  players: {},
  colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
  currentColorIndex: 0,
  clicks: []
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Add new player
  gameState.players[socket.id] = {
    id: socket.id,
    color: gameState.colors[Object.keys(gameState.players).length % gameState.colors.length]
  };

  // Send current game state to new player
  socket.emit('gameState', gameState);
  
  // Broadcast player count to everyone
  io.emit('playerCount', Object.keys(gameState.players).length);

  // Handle player clicks
  socket.on('playerClick', (data) => {
    const click = {
      x: data.x,
      y: data.y,
      color: data.color || gameState.players[socket.id].color,
      id: Date.now()
    };
    
    gameState.clicks.push(click);
    
    // Keep only last 100 clicks for performance
    if (gameState.clicks.length > 100) {
      gameState.clicks = gameState.clicks.slice(-100);
    }
    
    // Broadcast to all players
    io.emit('newClick', click);
  });

  // Handle clear canvas
  socket.on('clearCanvas', () => {
    console.log('Clearing canvas requested by:', socket.id);
    gameState.clicks = [];
    
    // Broadcast clear event to all players
    io.emit('canvasCleared');
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete gameState.players[socket.id];
    io.emit('playerCount', Object.keys(gameState.players).length);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});