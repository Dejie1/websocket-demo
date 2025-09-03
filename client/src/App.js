import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'http://62.72.27.216:3001' 
  : 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [clicks, setClicks] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const canvasRef = useRef(null);

  const colorPalette = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8A80', '#81C784', '#64B5F6', '#FFB74D', '#F06292', '#A1887F'];

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('gameState', (gameState) => {
      setClicks(gameState.clicks);
    });

    newSocket.on('playerCount', (count) => {
      setPlayerCount(count);
    });

    newSocket.on('newClick', (click) => {
      setClicks(prevClicks => [...prevClicks, click]);
    });

    newSocket.on('canvasCleared', () => {
      setClicks([]);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    // Draw clicks on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    clicks.forEach(click => {
      ctx.fillStyle = click.color;
      ctx.beginPath();
      ctx.arc(click.x, click.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [clicks]);

  const handleCanvasClick = (e) => {
    if (!socket || !connected) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    socket.emit('playerClick', { x, y, color: selectedColor });
  };

  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  const handleClearCanvas = () => {
    if (!socket || !connected) return;
    socket.emit('clearCanvas');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎨 Collaborative Canvas</h1>
        <div className="stats">
          <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span className="player-count">👥 {playerCount} players online</span>
        </div>
        
        <div className="color-palette-container">
          <h3>Choose your color:</h3>
          <div className="color-palette">
            {colorPalette.map((color, index) => (
              <button
                key={index}
                className={`color-button ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color}
              />
            ))}
          </div>
          <p className="selected-color-text">Selected: <span style={{color: selectedColor, fontWeight: 'bold'}}>{selectedColor}</span></p>
        </div>

        <div className="game-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            style={{
              border: '2px solid #333',
              cursor: 'crosshair',
              backgroundColor: 'white'
            }}
          />
          <p>Click anywhere on the canvas to add colored dots!</p>
          <p>Pick your favorite color from the palette above 🎨</p>
          
          <button 
            className="clear-button"
            onClick={handleClearCanvas}
            disabled={!connected}
          >
            🗑️ Clear Canvas
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;