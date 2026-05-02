import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { BootGate } from './components/boot/BootGate';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BootGate>
			<App />
		</BootGate>
	</StrictMode>,
);
