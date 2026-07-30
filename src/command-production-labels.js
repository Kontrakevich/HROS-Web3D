const RELEASE_TEXT = 'COMMAND 1.1';
const CONTEXT_LABEL = 'Настройки рабочего интерфейса';

function synchronizeProductionLabels() {
  document.querySelectorAll('.command-release-badge').forEach((badge) => {
    if (badge.textContent.trim() === 'COMMAND PLAYTEST') badge.textContent = RELEASE_TEXT;
    badge.classList.add('production');
  });
  const context = document.querySelector('.command-context');
  if (context && context.getAttribute('aria-label') !== CONTEXT_LABEL) {
    context.setAttribute('aria-label', CONTEXT_LABEL);
  }
}

const observer = new MutationObserver(() => synchronizeProductionLabels());
observer.observe(document.documentElement, { childList: true, subtree: true });
synchronizeProductionLabels();
