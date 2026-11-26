import { createRoot } from 'react-dom/client';
import { LivePage } from './LivePage';

const root = document.getElementById('root');
if (root) createRoot(root).render(<LivePage />);
