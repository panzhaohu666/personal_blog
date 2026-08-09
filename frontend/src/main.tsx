import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

/**
 * 应用入口文件
 * 使用 React 18 的 createRoot API 挂载应用到 #root DOM 节点
 * StrictMode 在开发环境下会执行额外的检查（如双重渲染）以帮助发现潜在问题
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
