import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [status, setStatus] = useState('Checking backend connection...');

  useEffect(() => {
    axios
      .get('http://localhost:8080/api/health')
      .then((res) => {
        setStatus(`✅ Backend connected: ${res.data.status} at ${res.data.timestamp}`);
      })
      .catch(() => {
        setStatus('❌ Could not reach backend at http://localhost:8080. Is Spring Boot running?');
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Smart Campus Resource Management Platform</h1>
        <p>{status}</p>
      </header>
    </div>
  );
}

export default App;
