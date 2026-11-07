import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyTheme, getInitialTheme } from './theme';

// Set the theme before the first paint so a dark-mode visitor never sees a white flash.
applyTheme(getInitialTheme());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
