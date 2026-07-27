// src/separator/main.jsx — 슬리터2 세퍼레이터 셋팅 태블릿 키오스크 전용 진입점
import React from 'react';
import ReactDOM from 'react-dom/client';
import SeparatorKioskGate from './SeparatorKioskGate';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SeparatorKioskGate />
  </React.StrictMode>
);
