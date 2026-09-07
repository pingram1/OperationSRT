import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Audio synthesis for concept visualizer mini-games.
 * Cleans up AudioContext on unmount.
 */
export function useVisualizerAudio() {
    const audioCtxRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);

    const getContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtxRef.current = new Ctx();
        }
        return audioCtxRef.current;
    }, []);

    const playSound = useCallback((type) => {
        if (isMuted) return;
        const audioCtx = getContext();
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        const now = audioCtx.currentTime;

        if (type === 'victory') {
            const notes = [261.63, 329.63, 392.0, 523.25];
            notes.forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.12, now + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);
                o.start(now + idx * 0.08);
                o.stop(now + idx * 0.08 + 0.25);
            });
            return;
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(1100, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'jump') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    }, [getContext, isMuted]);

    const toggleSound = useCallback(() => {
        setIsMuted((m) => {
            if (m) playSound('click');
            return !m;
        });
    }, [playSound]);

    useEffect(() => () => {
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state !== 'closed') {
            ctx.close().catch(() => {});
        }
        audioCtxRef.current = null;
    }, []);

    return { playSound, isMuted, toggleSound };
}
