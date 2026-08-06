(function initializeClassroomConfetti() {
    'use strict';

    const colors = ['#ffd33d', '#ff625f', '#08b9c3', '#7854d8', '#49bd6a', '#ff8fc4'];
    let celebrationTimer = null;
    let isRunning = false;

    function launchBurst(originX, angle) {
        if (typeof window.confetti !== 'function') return;

        window.confetti({
            particleCount: 48,
            angle,
            spread: 64,
            startVelocity: 38,
            gravity: 0.82,
            scalar: 1.08,
            ticks: 210,
            origin: { x: originX, y: 0.74 },
            colors,
            shapes: ['circle', 'square'],
            disableForReducedMotion: true,
            zIndex: 9999
        });
    }

    function launchGentleShower() {
        if (typeof window.confetti !== 'function') return;

        window.confetti({
            particleCount: 12,
            spread: 78,
            startVelocity: 16,
            gravity: 0.58,
            drift: (Math.random() - 0.5) * 0.8,
            scalar: 0.82,
            ticks: 260,
            origin: { x: 0.18 + Math.random() * 0.64, y: -0.04 },
            colors,
            shapes: ['circle', 'square'],
            disableForReducedMotion: true,
            zIndex: 9999
        });
    }

    function startConfetti() {
        if (isRunning) return;
        isRunning = true;

        launchBurst(0.04, 60);
        launchBurst(0.96, 120);
        celebrationTimer = window.setInterval(launchGentleShower, 1350);
    }

    function stopConfetti() {
        isRunning = false;
        if (celebrationTimer !== null) {
            window.clearInterval(celebrationTimer);
            celebrationTimer = null;
        }
        if (typeof window.confetti === 'function' && typeof window.confetti.reset === 'function') {
            window.confetti.reset();
        }
    }

    window.startConfetti = startConfetti;
    window.stopConfetti = stopConfetti;
})();
