import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { DevOpsInlinePortfolio } from './DevOpsInlinePortfolio.jsx';

createRoot(document.getElementById('devops-root')).render(
  <StrictMode>
    <DevOpsInlinePortfolio />
  </StrictMode>,
);
