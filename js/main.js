import { Game } from './game.js';

function boot() {
  try {
    window.BOAR_GAME = new Game();
  } catch (error) {
    console.error('[BOAR] Failed to start:', error);
    const loading = document.getElementById('loading');
    if (loading) {
      const p = loading.querySelector('p');
      if (p) p.textContent = 'The forest could not wake. Your browser needs WebGL 2.';
    }
    const title = document.getElementById('title-screen');
    if (title) title.classList.add('hidden');
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
