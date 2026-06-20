document.addEventListener('DOMContentLoaded', () => {
  const TILT_MAX = 14; // degrees, tweak to make the dip more/less dramatic

  document.querySelectorAll('.glass-btn-wrap').forEach(wrap => {
    wrap.addEventListener('pointermove', e => {
      const rect = wrap.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;  // 0 (left) to 1 (right)
      const py = (e.clientY - rect.top) / rect.height;  // 0 (top) to 1 (bottom)

      // The point under the cursor dips AWAY from the viewer (into the
      // background), the opposite of the usual "tilt toward cursor" effect.
      const rotateX = (0.5 - py) * TILT_MAX;
      const rotateY = (px - 0.5) * TILT_MAX;

      wrap.style.setProperty('--tilt-x', `${rotateX}deg`);
      wrap.style.setProperty('--tilt-y', `${rotateY}deg`);
    });

    wrap.addEventListener('pointerleave', () => {
      wrap.style.setProperty('--tilt-x', '0deg');
      wrap.style.setProperty('--tilt-y', '0deg');
    });
  });
});