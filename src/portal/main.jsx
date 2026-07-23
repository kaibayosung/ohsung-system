// src/portal/main.jsx — 고객사 포털 전용 진입점
import React from 'react';
import ReactDOM from 'react-dom/client';
import CustomerPortalGate from './CustomerPortalGate';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CustomerPortalGate />
  </React.StrictMode>
);
