import { useCallback, useEffect, useRef } from 'react';

/**
 * Canvas confetti with RAF cleanup on unmount.
 */
export function useVisualizerConfetti(canvasRef) {
    const particlesRef = useRef([]);
    const activeRef = useRef(false);
    const rafRef = useRef(null);

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }, [canvasRef]);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const particles = particlesRef.current;

        for (let i = particles.length - 1; i >= 0; i -= 1) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity ?? 0.4;
            p.vx *= p.drag ?? 0.98;
            p.rot += p.rotSpeed;
            p.opacity -= p.fade ?? 0.01;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();

            if (p.opacity <= 0 || p.y > canvas.height) {
                particles.splice(i, 1);
            }
        }

        if (particles.length > 0) {
            rafRef.current = requestAnimationFrame(render);
        } else {
            activeRef.current = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            rafRef.current = null;
        }
    }, [canvasRef]);

    const burst = useCallback((count = 150, colors = ['#facc15', '#3b82f6', '#ec4899', '#ffffff']) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        resizeCanvas();

        for (let i = 0; i < count; i += 1) {
            particlesRef.current.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 150,
                y: canvas.height / 2 + (Math.random() - 0.5) * 150,
                vx: (Math.random() - 0.5) * 15,
                vy: -Math.random() * 15 - 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rot: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10,
                opacity: 1,
                gravity: 0.4,
                drag: 0.98,
                fade: 0.01,
            });
        }

        if (!activeRef.current) {
            activeRef.current = true;
            rafRef.current = requestAnimationFrame(render);
        }
    }, [canvasRef, render, resizeCanvas]);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            particlesRef.current = [];
            activeRef.current = false;
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
    }, [canvasRef, resizeCanvas]);

    return { burst };
}
