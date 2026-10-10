// frontend/src/components/generator/modes/wheel/useEmberDrift.ts
import { useCallback, useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

/** The drifting-ember overlay shown while the wheel spins. */
export function useEmberDrift() {
  const particlesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const emberAnimFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (emberAnimFrameRef.current !== null) {
        cancelAnimationFrame(emberAnimFrameRef.current);
      }
    };
  }, []);

  const startEmberDrift = useCallback(() => {
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    const spawnEmber = (): Particle => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.7,
      y: height / 2 + (Math.random() - 0.5) * height * 0.7,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -Math.random() * 1.2 - 0.3,
      size: Math.random() * 3 + 1,
      alpha: Math.random() * 0.4 + 0.2,
      color: Math.random() > 0.5 ? '#f97316' : '#dc2626',
    });

    const embers: Particle[] = Array.from({ length: 40 }, spawnEmber);

    // Deliberately does NOT check the `isSpinning` state variable here --
    // calling startEmberDrift() synchronously right after setIsSpinning(true)
    // would close over the pre-update value of isSpinning (still false from
    // the render that scheduled this call), stopping the loop on its very
    // first frame. This loop runs until explicitly cancelled via
    // stopEmberDrift() instead.
    const renderEmbers = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      embers.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.995;
        if (p.alpha < 0.05 || p.y < 0) {
          embers[i] = spawnEmber();
          return;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      emberAnimFrameRef.current = requestAnimationFrame(renderEmbers);
    };

    renderEmbers();
  }, []);

  const stopEmberDrift = useCallback(() => {
    if (emberAnimFrameRef.current !== null) {
      cancelAnimationFrame(emberAnimFrameRef.current);
      emberAnimFrameRef.current = null;
    }
    const canvas = particlesCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  return { particlesCanvasRef, startEmberDrift, stopEmberDrift };
}
