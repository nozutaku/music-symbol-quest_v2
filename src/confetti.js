(function (root) {
  const COLORS = ['#ffcb47', '#ff6b81', '#3ecf8e', '#5ec8ff', '#c792ff', '#ffffff'];

  function createConfetti(canvas) {
    const ctx = canvas.getContext && canvas.getContext('2d');
    let pieces = [];
    let raf = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.vy += 0.12;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      pieces = pieces.filter((p) => p.y < canvas.height + 20);
      if (pieces.length) raf = requestAnimationFrame(frame);
      else { raf = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }

    // 画面上部から降らせる(count: 紙吹雪の数)
    function burst(count = 160) {
      if (!ctx) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      resize();
      for (let i = 0; i < count; i++) {
        pieces.push({
          x: Math.random() * canvas.width,
          y: -20 - Math.random() * canvas.height * 0.4,
          vx: (Math.random() - 0.5) * 4,
          vy: 1 + Math.random() * 3,
          w: 6 + Math.random() * 8,
          h: 8 + Math.random() * 10,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
      }
      if (!raf) raf = requestAnimationFrame(frame);
    }

    return { burst };
  }

  root.MusicConfetti = { createConfetti };
})(typeof window !== 'undefined' ? window : globalThis);
