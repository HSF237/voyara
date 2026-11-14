import '@fontsource-variable/plus-jakarta-sans/index.css';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import './styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startSettingsSync } from './app/sync';
import { initI18n } from './lib/i18n';
import { useSettings } from './store/settings';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = createRoot(container);

function render() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Apply theme, language and direction, then wait for the chosen language's
// strings so the first render is never a flash of English.
startSettingsSync();
void initI18n(useSettings.getState().language).then(render, (error: unknown) => {
  console.error('Could not load translations; showing English.', error);
  render();
});
