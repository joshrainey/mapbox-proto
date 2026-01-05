import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Version info
const VERSION = '0.2.0';
const BUILD_DATE = new Date().toISOString().split('T')[0];

console.log(
  `%c Mapbox Proto %c v${VERSION} %c`,
  'background: #7c3aed; color: white; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;',
  'background: #27272a; color: #a1a1aa; padding: 4px 8px; border-radius: 0 4px 4px 0;',
  ''
);
console.log(`Build: ${BUILD_DATE}`);
console.log('Docs: https://github.com/joshrainey/mapbox-proto');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
