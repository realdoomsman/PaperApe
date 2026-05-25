import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './App';
import '../styles/widget.css';

createRoot(document.getElementById('root')!).render(<PopupApp />);
