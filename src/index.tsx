import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Buffer } from 'buffer';

window.Buffer = Buffer;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl="https://fazendareal.vercel.app/tonconnect-manifest.json">
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
