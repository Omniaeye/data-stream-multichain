const button = document.querySelector('.motion-toggle');
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
let manuallyPaused = false;
function syncMotion() {
  const reduced = preference.matches;
  document.body.classList.toggle('has-motion', !reduced);
  document.body.classList.toggle('is-paused', manuallyPaused || reduced);
  button.hidden = false;
  button.disabled = reduced;
  button.querySelector('span').textContent = reduced ? 'Reduced motion' : manuallyPaused ? 'Resume motion' : 'Pause motion';
  button.setAttribute('aria-label', reduced ? 'Animation disabled by your motion preference' : manuallyPaused ? 'Resume decorative animation' : 'Pause decorative animation');
}
button.addEventListener('click', () => { manuallyPaused = !manuallyPaused; syncMotion(); });
preference.addEventListener('change', syncMotion);
document.addEventListener('visibilitychange', () => document.body.classList.toggle('is-hidden', document.hidden));
syncMotion();
