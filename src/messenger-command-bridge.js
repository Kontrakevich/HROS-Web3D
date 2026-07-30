const DIARY_KEY = 'hros.diary.active.v1';
const RELEASE_LABEL = 'HROS v1.2 · WORKING';
const BRAND_LABEL = 'Human Relationship Operating System · v1.2';

function diaryState() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY) || 'null'); } catch { return null; }
}

function shouldOpenReview(target) {
  return target.id === 'commandMainAction' && diaryState()?.state === 'review';
}

function routeMessenger(event) {
  const target = event.target.closest('[data-command-view="diary"], [data-open-command="diary"], [data-diary-view], #commandMainAction');
  if (!target || shouldOpenReview(target) || !window.__HROS_MESSENGER__?.ready) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  window.__HROS_MESSENGER__.open('diary');
}

function updateReleaseLabels() {
  document.querySelectorAll('.command-release-badge').forEach((badge) => {
    if (/PLAYTEST|LOCAL PREVIEW/i.test(badge.textContent || '') && badge.textContent !== RELEASE_LABEL) badge.textContent = RELEASE_LABEL;
  });
  const brand = document.querySelector('.brand small');
  if (brand && brand.textContent !== BRAND_LABEL) brand.textContent = BRAND_LABEL;
}

function boot() {
  document.addEventListener('click', routeMessenger, true);
  updateReleaseLabels();
  const app = document.querySelector('#app');
  if (app) new MutationObserver(updateReleaseLabels).observe(app, { childList: true, subtree: true });
  window.__HROS_MESSENGER_BRIDGE__ = { ready: true };
}

const timer = setInterval(() => {
  if (window.__HROS_MESSENGER__?.ready && window.__HROS_COMMAND_UI__?.ready) {
    clearInterval(timer);
    boot();
  }
}, 50);
