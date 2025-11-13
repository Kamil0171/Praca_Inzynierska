document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.przycisk-cta');
  if (!btn) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anim = null;
  let isPressed = false;

  const shadowNormal = '0 10px 26px rgba(47,100,207,.32)';
  const shadowHover  = '0 16px 36px rgba(47,100,207,.38)';
  const pressShadow  = '0  8px 24px rgba(47,100,207,.30)';

  const baselineShadow = () => (btn.matches(':hover') ? shadowHover : shadowNormal);
  const baselineTransform = () => (btn.matches(':hover') ? 'translateY(-2px) scale(1)' : 'translateY(0) scale(1)');

  function nowTransform() {
    const t = getComputedStyle(btn).transform;
    return t === 'none' ? 'translateY(0) scale(1)' : t;
  }
  function nowShadow() {
    const s = getComputedStyle(btn).boxShadow;
    return s || baselineShadow();
  }

  function cancelAnim() {
    if (anim) { anim.cancel(); anim = null; }
  }

  function press() {
    if (reduceMotion) return;
    isPressed = true;
    const fromT = nowTransform();
    const fromS = nowShadow();
    const toT = 'translateY(0) scale(0.985)';
    const toS = pressShadow;

    cancelAnim();
    anim = btn.animate(
      [{ transform: fromT, boxShadow: fromS },
       { transform: toT,   boxShadow: toS }],
      { duration: 130, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
  }

  function release() {
    if (reduceMotion) return;
    if (!isPressed) return;
    isPressed = false;

    const fromT = nowTransform();
    const fromS = nowShadow();
    const midT = 'translateY(-1px) scale(1.01)';
    const midS = shadowHover;
    const endT = baselineTransform();
    const endS = baselineShadow();

    cancelAnim();
    anim = btn.animate(
      [
        { transform: fromT, boxShadow: fromS },
        { transform: midT,  boxShadow: midS, offset: 0.60 },
        { transform: endT,  boxShadow: endS }
      ],
      { duration: 240, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }
    );
    anim.finished.finally(() => cancelAnim());
  }

  btn.addEventListener('pointerdown', (e) => {
    btn.setPointerCapture?.(e.pointerId);
    press();
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
});
