import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [clicks, setClicks] = useState([]);
  const [connected, setConnected] = useState(false);
  const canvasRef = useRef(null);

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
    
    socket.emit('playerClick', { x, y });
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
          <p>Each player gets their own color 🌈</p>
        </div>
      </header>
    </div>
  );
}

export default App;