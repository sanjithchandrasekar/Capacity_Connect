import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  color: string;
  vx: number;
  vy: number;
}

export function StarfieldCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const colors = [
      '#ffffff',
      '#dbeafe', // soft nebula blue
      '#f5d0fe', // soft purple
      '#fed7aa', // soft warm orange
      '#bae6fd', // cyan-blue
    ];

    const starCount = Math.floor((width * height) / 8000);
    const stars: Star[] = [];

    for (let i = 0; i < Math.min(starCount, 220); i++) {
      const baseAlpha = Math.random() * 0.7 + 0.2;
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.6 + 0.4,
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
      });
    }

    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;

        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        // Twinkle
        const currentAlpha = s.baseAlpha + Math.sin(time * 2 + i) * 0.25 * s.baseAlpha;
        const clampedAlpha = Math.max(0.1, Math.min(1, currentAlpha));

        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = clampedAlpha;
        ctx.shadowBlur = s.radius > 1.2 ? 6 : 0;
        ctx.shadowColor = s.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full opacity-70 ${className}`}
      aria-hidden="true"
    />
  );
}
