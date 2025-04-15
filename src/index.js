import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './firebaseConfig'; // Firebaseの設定をインポート

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
