// src/briefing/main.jsx — 데일리 브리핑 전용 진입점 (/briefing)
import React from 'react';
import ReactDOM from 'react-dom/client';
import BriefingApp from './BriefingApp';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BriefingApp />
  </React.StrictMode>
);
