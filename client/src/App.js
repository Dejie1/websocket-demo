import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';
import { supabase } from './supabaseClient';
import { extendedPalette } from './colorPalettes';
import { ColorPicker, useColor } from "react-color-palette";
import "react-color-palette/css";

const SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'http://62.72.27.216:3001' 
  : 'http://localhost:3001';

// WebSocket Demo Component
function WebSocketDemo() {
  const [socket, setSocket] = useState(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [clicks, setClicks] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [color, setColor] = useColor('#FF6B6B');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const canvasRef = useRef(null);

  const colorPalette = extendedPalette;

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
      ctx.arc(click.x, click.y, 6, 0, 2 * Math.PI);
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

  const handleColorSelect = (colorValue) => {
    setSelectedColor(colorValue);
    setColor({ hex: colorValue, hsv: { h: 0, s: 0, v: 0 }, rgb: { r: 0, g: 0, b: 0 } });
  };

  const handleColorPickerChange = (newColor) => {
    setColor(newColor);
    setSelectedColor(newColor.hex);
  };

  // Handle ESC key to close color picker
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && showColorPicker) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showColorPicker]);

  const handleClearCanvas = () => {
    if (!socket || !connected) return;
    socket.emit('clearCanvas');
  };

  return (
    <div>
      <h2>🌐 WebSocket Demo - Collaborative Canvas</h2>
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
              aria-label={`Select color ${color}`}
              aria-pressed={selectedColor === color}
            />
          ))}
        </div>
        
        <div className="custom-color-section">
          <h4>Or pick any color:</h4>
          <button 
            className="color-picker-toggle"
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ backgroundColor: selectedColor }}
            aria-expanded={showColorPicker}
            aria-controls="color-picker-container"
          >
            {showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}
          </button>
          
          {showColorPicker && (
            <div 
              className="color-picker-container" 
              id="color-picker-container"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowColorPicker(false);
                }
              }}
            >
              <div className="color-picker-modal">
                <button 
                  className="color-picker-close"
                  onClick={() => setShowColorPicker(false)}
                  aria-label="Close color picker"
                >
                  ×
                </button>
                <ColorPicker 
                  color={color} 
                  onChange={handleColorPickerChange} 
                  hideInput={["rgb", "hsv"]}
                  hideAlpha={true}
                />
              </div>
            </div>
          )}
        </div>
        
        <p className="selected-color-text">Selected: <span style={{color: selectedColor, fontWeight: 'bold'}}>{selectedColor}</span></p>
      </div>

      <div className="game-container">
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            aria-label="Interactive drawing canvas. Click to add colored dots."
            role="img"
          />
        </div>
        <div className="canvas-instructions">
          <p>✨ Click anywhere on the canvas to add colored dots!</p>
          <p>🎨 Pick your favorite color from the palette above</p>
        </div>
        
        <button 
          className="clear-button"
          onClick={handleClearCanvas}
          disabled={!connected}
          aria-label="Clear all drawings from canvas"
        >
          🗑️ Clear Canvas
        </button>
      </div>
    </div>
  );
}

// API Demo Component
function ApiDemo() {
  const [clicks, setClicks] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [color, setColor] = useColor('#FF6B6B');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const canvasRef = useRef(null);
  const pollInterval = useRef(null);

  const colorPalette = extendedPalette;

  const fetchClicks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('canvas_clicks')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setClicks(data || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch clicks');
      console.error(err);
    }
  }, []);

  const addClick = async (x, y, color) => {
    setLoading(true);
    try {
      console.log('Adding click:', { x: Math.round(x), y: Math.round(y), color });
      
      const { data, error } = await supabase
        .from('canvas_clicks')
        .insert([{ 
          x: Math.round(x), 
          y: Math.round(y), 
          color: color 
        }])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Successfully added click:', data);
      
      if (data && data.length > 0) {
        setClicks(prev => [...prev, data[0]]);
      }
      setUpdateCount(prev => prev + 1);
    } catch (err) {
      setError(`Failed to add click: ${err.message}`);
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearCanvas = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('canvas_clicks')
        .delete()
        .neq('id', 0); // Delete all records
      
      if (error) throw error;
      
      setClicks([]);
      setUpdateCount(prev => prev + 1);
    } catch (err) {
      setError('Failed to clear canvas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = useCallback(() => {
    if (pollInterval.current) return;
    
    pollInterval.current = setInterval(() => {
      fetchClicks();
    }, 1000); // Poll every 1 second
  }, [fetchClicks]);

  const stopPolling = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  }, []);

  const handleCanvasClick = (e) => {
    if (loading) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    addClick(x, y, selectedColor);
  };

  const handleColorSelect = (colorValue) => {
    setSelectedColor(colorValue);
    setColor({ hex: colorValue, hsv: { h: 0, s: 0, v: 0 }, rgb: { r: 0, g: 0, b: 0 } });
  };

  const handleColorPickerChange = (newColor) => {
    setColor(newColor);
    setSelectedColor(newColor.hex);
  };

  // Handle ESC key to close color picker
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && showColorPicker) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showColorPicker]);

  useEffect(() => {
    // Initial load
    fetchClicks();
    
    // Start polling for updates
    startPolling();
    
    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [fetchClicks, startPolling, stopPolling]);

  // Draw clicks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    clicks.forEach(click => {
      ctx.fillStyle = click.color;
      ctx.beginPath();
      ctx.arc(click.x, click.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [clicks]);

  return (
    <div>
      <h2>📡 API Demo - Collaborative Canvas (Polling)</h2>
      
      <div className="api-stats">
        <span className={`loading-status ${loading ? 'loading' : 'ready'}`}>
          {loading ? '⏳ Loading...' : '✅ Ready'}
        </span>
        <span className="click-count">🎨 {clicks.length} clicks total</span>
        <span className="update-info">
          🔄 Updates: {updateCount} | Last: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </span>
      </div>

      {error && <div className="error-message">{error}</div>}
      
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
              aria-label={`Select color ${color}`}
              aria-pressed={selectedColor === color}
            />
          ))}
        </div>
        
        <div className="custom-color-section">
          <h4>Or pick any color:</h4>
          <button 
            className="color-picker-toggle"
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ backgroundColor: selectedColor }}
            aria-expanded={showColorPicker}
            aria-controls="color-picker-container"
          >
            {showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}
          </button>
          
          {showColorPicker && (
            <div 
              className="color-picker-container" 
              id="color-picker-container"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowColorPicker(false);
                }
              }}
            >
              <div className="color-picker-modal">
                <button 
                  className="color-picker-close"
                  onClick={() => setShowColorPicker(false)}
                  aria-label="Close color picker"
                >
                  ×
                </button>
                <ColorPicker 
                  color={color} 
                  onChange={handleColorPickerChange} 
                  hideInput={["rgb", "hsv"]}
                  hideAlpha={true}
                />
              </div>
            </div>
          )}
        </div>
        
        <p className="selected-color-text">Selected: <span style={{color: selectedColor, fontWeight: 'bold'}}>{selectedColor}</span></p>
      </div>

      <div className="game-container">
        <div className="canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            style={{
              cursor: loading ? 'wait' : 'crosshair'
            }}
          />
        </div>
        <div className="canvas-instructions">
          <p>✨ Click anywhere on the canvas to add colored dots!</p>
          <p>⚠️ Notice the delay? This uses API calls with 1-second polling for updates.</p>
        </div>
        
        <button 
          className="clear-button"
          onClick={clearCanvas}
          disabled={loading}
        >
          🗑️ Clear Canvas
        </button>
      </div>

      <div className="api-info">
        <h4>⚡ Performance Comparison:</h4>
        <p><strong>API Demo:</strong> Uses REST API calls + polling every 1 second for updates</p>
        <br></br>
        <p><strong>WebSocket Demo:</strong> Real-time bidirectional communication</p>
        <p>Switch between tabs to see the dramatic difference in responsiveness!</p>
        <br></br>
        <h4>🔧 Technical Details:</h4>
        <ul>
          <li>Each click makes an HTTP POST request to Supabase</li>
          <li>Updates are fetched every 1000ms via polling</li>
          <li>Higher latency, more resource usage, delayed updates</li>
        </ul>
      </div>
    </div>
  );
}

// Main App Component with Tabs
function App() {
  const [activeTab, setActiveTab] = useState('websocket');

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Real-time Demo Showcase</h1>
        
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'websocket' ? 'active' : ''}`}
            onClick={() => setActiveTab('websocket')}
          >
            🌐 WebSocket Demo
          </button>
          <button 
            className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            📡 API Demo
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'websocket' && <WebSocketDemo />}
          {activeTab === 'api' && <ApiDemo />}
        </div>
      </header>
    </div>
  );
}

export default App;