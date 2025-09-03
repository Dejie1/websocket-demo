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
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const canvasRef = useRef(null);
  const justFinishedDrawing = useRef(false); // Use useRef to avoid re-renders

  const colorPalette = extendedPalette;

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);
    newSocket.on('connect', () => setConnected(true));
    newSocket.on('gameState', (gameState) => setClicks(gameState.clicks));
    newSocket.on('playerCount', setPlayerCount);
    newSocket.on('newClick', (click) => setClicks(prev => [...prev, click]));
    newSocket.on('newLine', (line) => setClicks(prev => [...prev, line]));
    newSocket.on('canvasCleared', () => setClicks([]));
    newSocket.on('disconnect', () => setConnected(false));
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    clicks.forEach(item => {
      if (item.type === 'line' && Array.isArray(item.path) && item.path.length > 0) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.path[0].x, item.path[0].y);
        for (let i = 1; i < item.path.length; i++) {
          ctx.lineTo(item.path[i].x, item.path[i].y);
        }
        ctx.stroke();
      } else if (item.type === 'dot') {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 2, 0, 2 * Math.PI); // Smaller radius to match line width
        ctx.fill();
      }
    });

    if (isDrawing && currentPath.length > 1) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  }, [clicks, currentPath, isDrawing, selectedColor]);

  const getMouseCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = useCallback((e) => {
    if (!socket || !connected) return;
    justFinishedDrawing.current = false;
    setIsDrawing(true);
    const coords = getMouseCoords(e);
    setCurrentPath([coords]);
  }, [socket, connected]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !socket || !connected) return;
    const coords = getMouseCoords(e);
    setCurrentPath(prev => [...prev, coords]);
  }, [isDrawing, socket, connected]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !socket || !connected) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      socket.emit('playerDraw', { path: currentPath, color: selectedColor, type: 'line' });
      justFinishedDrawing.current = true;
    }
    setCurrentPath([]);
  }, [isDrawing, socket, connected, currentPath, selectedColor]);
  
  const handleCanvasClick = useCallback((e) => {
    if (!socket || !connected || justFinishedDrawing.current) return;
    const { x, y } = getMouseCoords(e);
    socket.emit('playerClick', { x, y, color: selectedColor, type: 'dot' });
  }, [socket, connected, selectedColor]);

  const handleColorSelect = (colorValue) => {
    setSelectedColor(colorValue);
    setColor(prevColor => ({ ...prevColor, hex: colorValue }));
  };

  const handleColorPickerChange = (newColor) => {
    setColor(newColor);
    setSelectedColor(newColor.hex);
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) setShowColorPicker(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const handleClearCanvas = () => {
    if (socket && connected) socket.emit('clearCanvas');
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `canvas-export-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div>
      <h2>🌐 WebSocket Demo - Collaborative Canvas</h2>
      <div className="stats">
        <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>{connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
        <span className="player-count">👥 {playerCount} players online</span>
      </div>
      <div className="color-palette-container">
        <h3>Choose your color:</h3>
        <div className="color-palette">{colorPalette.map((c, i) => (<button key={i} className={`color-button ${selectedColor === c ? 'selected' : ''}`} style={{ backgroundColor: c }} onClick={() => handleColorSelect(c)} title={c} />))}</div>
        <div className="custom-color-section">
          <h4>Or pick any color:</h4>
          <button className="color-picker-toggle" onClick={() => setShowColorPicker(!showColorPicker)}>{showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}</button>
          {showColorPicker && (<div className="color-picker-container" onClick={(e) => e.target === e.currentTarget && setShowColorPicker(false)}><div className="color-picker-modal"><button className="color-picker-close" onClick={() => setShowColorPicker(false)}>×</button><ColorPicker color={color} onChange={handleColorPickerChange} hideInput={["rgb", "hsv"]} hideAlpha /></div></div>)}
        </div>
        <p className="selected-color-text">Selected: <span style={{color: selectedColor, fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.5)'}}>{selectedColor}</span></p>
      </div>
      <div className="game-container">
        <canvas ref={canvasRef} width={1024} height={728} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleCanvasClick} />
        <div className="canvas-instructions">
          <p>✨ Hold and drag to draw lines, or click to add dots!</p>
          <p>🎨 Pick your favorite color from the palette above</p>
        </div>
        <div className="canvas-controls">
          <button className="clear-button" onClick={handleClearCanvas} disabled={!connected}>🗑️ Clear Canvas</button>
          <button className="export-button" onClick={exportCanvas}>📸 Export Image</button>
        </div>
      </div>
    </div>
  );
}

// API Demo Component (Simplified for brevity, includes the main fixes)
function ApiDemo() {
  const [clicks, setClicks] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [color, setColor] = useColor('#FF6B6B');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const canvasRef = useRef(null);
  const pollInterval = useRef(null);
  const justFinishedDrawing = useRef(false);

  const colorPalette = extendedPalette;

  const fetchClicks = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('canvas_clicks').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      const processedData = (data || []).map(item => {
        if (item.type === 'line' && typeof item.path === 'string') {
          try { return { ...item, path: JSON.parse(item.path) }; } catch (e) { return item; }
        }
        return item;
      });
      setClicks(processedData);
      setLastUpdate(new Date());
    } catch (err) { setError('Failed to fetch clicks'); } finally { setLoading(false); }
  }, []);
  
  const addClick = async (x, y, color) => {
    setLoading(true);
    try {
      await supabase.from('canvas_clicks').insert([{ x: Math.round(x), y: Math.round(y), color, type: 'dot' }]);
      setUpdateCount(prev => prev + 1);
      fetchClicks(); // Re-fetch to get latest state
    } catch (err) { setError(`Failed to add click: ${err.message}`); } 
    finally { setLoading(false); }
  };

  const addLine = async (path, color) => {
    setLoading(true);
    try {
      await supabase.from('canvas_clicks').insert([{ path: JSON.stringify(path), color, type: 'line' }]);
      setUpdateCount(prev => prev + 1);
      fetchClicks(); // Re-fetch to get latest state
    } catch (err) { setError(`Failed to add line: ${err.message}`); } 
    finally { setLoading(false); }
  };

  const clearCanvas = async () => {
    setLoading(true);
    try {
      await supabase.from('canvas_clicks').delete().neq('id', 0);
      setClicks([]);
      setUpdateCount(prev => prev + 1);
    } catch (err) { setError('Failed to clear canvas'); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchClicks();
    pollInterval.current = setInterval(fetchClicks, 2000); // Poll less frequently
    return () => clearInterval(pollInterval.current);
  }, [fetchClicks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    clicks.forEach(item => {
      if (item.type === 'line' && Array.isArray(item.path) && item.path.length > 0) {
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(item.path[0].x, item.path[0].y);
        for (let i = 1; i < item.path.length; i++) {
          ctx.lineTo(item.path[i].x, item.path[i].y);
        }
        ctx.stroke();
      } else if (item.type === 'dot') {
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.x, item.y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    if (isDrawing && currentPath.length > 1) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }
  }, [clicks, currentPath, isDrawing, selectedColor]);
  
  const getMouseCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
    if (loading) return;
    justFinishedDrawing.current = false;
    setIsDrawing(true);
    setCurrentPath([getMouseCoords(e)]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || loading) return;
    setCurrentPath(prev => [...prev, getMouseCoords(e)]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || loading) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      addLine(currentPath, selectedColor);
      justFinishedDrawing.current = true;
    }
    setCurrentPath([]);
  };

  const handleCanvasClick = (e) => {
    if (loading || justFinishedDrawing.current) return;
    const { x, y } = getMouseCoords(e);
    addClick(x, y, selectedColor);
  };
  
  const handleColorSelect = (colorValue) => {
    setSelectedColor(colorValue);
    setColor(prevColor => ({ ...prevColor, hex: colorValue }));
  };

  const handleColorPickerChange = (newColor) => {
    setColor(newColor);
    setSelectedColor(newColor.hex);
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) setShowColorPicker(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `canvas-export-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div>
      <h2>📡 API Demo - Collaborative Canvas (Polling)</h2>
      <div className="api-stats">
        <span className={`loading-status ${loading ? 'loading' : 'ready'}`}>{loading ? '⏳ Syncing...' : '✅ Ready'}</span>
        <span className="click-count">🎨 {clicks.length} items on canvas</span>
        <span className="update-info">🔄 Updates: {updateCount} | Last: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</span>
      </div>
      {error && <div className="error-message">{error}</div>}
      <div className="color-palette-container">
        <h3>Choose your color:</h3>
        <div className="color-palette">{colorPalette.map((c, i) => (<button key={i} className={`color-button ${selectedColor === c ? 'selected' : ''}`} style={{ backgroundColor: c }} onClick={() => handleColorSelect(c)} title={c}/>))}</div>
        <div className="custom-color-section">
          <h4>Or pick any color:</h4>
          <button className="color-picker-toggle" onClick={() => setShowColorPicker(!showColorPicker)}>{showColorPicker ? 'Hide Color Picker' : 'Show Color Picker'}</button>
          {showColorPicker && (<div className="color-picker-container" onClick={(e) => e.target === e.currentTarget && setShowColorPicker(false)}><div className="color-picker-modal"><button className="color-picker-close" onClick={() => setShowColorPicker(false)}>×</button><ColorPicker color={color} onChange={handleColorPickerChange} hideInput={["rgb", "hsv"]} hideAlpha /></div></div>)}
        </div>
        <p className="selected-color-text">Selected: <span style={{color: selectedColor, fontWeight: 'bold', textShadow: '0 0 5px rgba(0,0,0,0.5)'}}>{selectedColor}</span></p>
      </div>
      <div className="game-container">
        <canvas ref={canvasRef} width={1024} height={728} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={handleCanvasClick} />
        <div className="canvas-instructions">
          <p>✨ Hold and drag to draw lines, or click to add dots!</p>
          <p>⚠️ Notice the delay? This uses API calls with polling for updates.</p>
        </div>
        <div className="canvas-controls">
          <button className="clear-button" onClick={clearCanvas} disabled={loading}>🗑️ Clear Canvas</button>
          <button className="export-button" onClick={exportCanvas}>📸 Export Image</button>
        </div>
      </div>
      <div className="api-info">
        <h4>⚡ Performance Comparison:</h4>
        <p><strong>API Demo:</strong> Uses REST API calls + polling for updates</p>
        <p><strong>WebSocket Demo:</strong> Real-time bidirectional communication</p>
        <p>Switch between tabs to see the dramatic difference in responsiveness!</p>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('websocket');
  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Real-time Demo Showcase</h1>
        <p className="subtitle">Comparing WebSockets vs. API Polling</p>
        <div className="tab-navigation">
          <button className={`tab-button ${activeTab === 'websocket' ? 'active' : ''}`} onClick={() => setActiveTab('websocket')}>🌐 WebSocket Demo</button>
          <button className={`tab-button ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>📡 API Demo</button>
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