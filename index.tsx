import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 仅开发环境：如果之前有其他应用在 localhost:3000 注册了 Service Worker，
// 主动注销它并清除缓存，防止它劫持当前应用的导航/资源。
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister();
  });
  if ('caches' in window) {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
