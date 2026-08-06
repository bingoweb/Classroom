(function initializeMagicParkMotion() {
    'use strict';

    const sparkPositions = [
        ['2.4%', '3.2%'],
        ['23.8%', '3.6%'],
        ['28.4%', '2.4%'],
        ['44.5%', '2.2%'],
        ['69.2%', '3.6%'],
        ['75.5%', '2.1%'],
        ['95.8%', '4.4%'],
        ['2.1%', '48.5%'],
        ['98.1%', '48.2%'],
        ['28.2%', '93.8%'],
        ['72.1%', '93.1%'],
        ['96.5%', '91.8%']
    ];

    function createAmbientLayer() {
        if (document.querySelector('.park-ambient')) return;

        const layer = document.createElement('div');
        layer.className = 'park-ambient';
        layer.setAttribute('aria-hidden', 'true');

        sparkPositions.forEach(([left, top], index) => {
            const spark = document.createElement('span');
            spark.className = 'park-spark';
            spark.style.left = left;
            spark.style.top = top;
            spark.style.transform = `scale(${0.72 + (index % 4) * 0.11})`;
            layer.appendChild(spark);
        });

        document.body.prepend(layer);
    }

    function runMotion() {
        createAmbientLayer();

        const gsap = window.gsap;
        if (!gsap) return;

        const media = gsap.matchMedia();
        const observers = [];

        media.add({
            fullMotion: '(prefers-reduced-motion: no-preference)',
            reduceMotion: '(prefers-reduced-motion: reduce)'
        }, (context) => {
            if (context.conditions.reduceMotion) {
                gsap.set('.card-titlebar, .park-spark', { clearProps: 'all' });
                return undefined;
            }

            const entrance = gsap.timeline({ defaults: { ease: 'back.out(1.35)' } });
            entrance
                .from('.card-titlebar', {
                    y: '-1.2vh',
                    scale: 0.92,
                    duration: 0.72,
                    stagger: 0.065
                })
                .from([
                    '.clock-content-wrapper',
                    '.stats-body',
                    '.countdown-mode',
                    '.before-school-mode',
                    '.goodbye-mode',
                    '.noise-content',
                    '.slideshow-container',
                    '#president-container',
                    '#duty-container',
                    '#stars-container'
                ], {
                    y: '1.1vh',
                    scale: 0.985,
                    duration: 0.68,
                    stagger: 0.045,
                    ease: 'power2.out'
                }, '-=0.42');

            gsap.to('#noise-character-img', {
                y: '-0.48vh',
                rotation: 1.2,
                duration: 2.8,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut'
            });

            gsap.utils.toArray('.park-spark').forEach((spark, index) => {
                gsap.to(spark, {
                    autoAlpha: 0.22 + (index % 3) * 0.18,
                    rotation: 90 + (index % 4) * 30,
                    scale: 0.72 + (index % 4) * 0.13,
                    duration: 1.55 + (index % 5) * 0.25,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut',
                    delay: index * 0.08
                });
            });

            return () => entrance.kill();
        });

        const animateFreshContent = (container) => {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            gsap.from(container.children, {
                y: '0.65vh',
                scale: 0.975,
                duration: 0.48,
                stagger: 0.055,
                ease: 'back.out(1.25)',
                overwrite: 'auto'
            });
        };

        ['president-container', 'duty-container'].forEach((id) => {
            const container = document.getElementById(id);
            if (!container) return;
            const observer = new MutationObserver(() => animateFreshContent(container));
            observer.observe(container, { childList: true });
            observers.push(observer);
        });

        const noiseCard = document.getElementById('noise-meter-card');
        if (noiseCard) {
            const stateSelector = {
                'state-low': '.noise-scale-label--quiet',
                'state-medium': '.noise-scale-label--warning',
                'state-high': '.noise-scale-label--danger'
            };

            let previousState = '';
            const celebrateNoiseState = () => {
                const state = Object.keys(stateSelector).find((name) => noiseCard.classList.contains(name)) || '';
                if (!state || state === previousState || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                previousState = state;
                const label = noiseCard.querySelector(stateSelector[state]);
                if (!label) return;
                gsap.fromTo(label, { scale: 0.94 }, {
                    scale: 1.05,
                    duration: 0.34,
                    repeat: 3,
                    yoyo: true,
                    ease: 'power2.inOut',
                    overwrite: 'auto',
                    onComplete: () => gsap.set(label, { clearProps: 'scale' })
                });
            };

            const observer = new MutationObserver(celebrateNoiseState);
            observer.observe(noiseCard, { attributes: true, attributeFilter: ['class'] });
            observers.push(observer);
            celebrateNoiseState();
        }

        const clock = document.getElementById('clock');
        if (clock) {
            let previousClockText = clock.textContent;
            const observer = new MutationObserver(() => {
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
                const nextClockText = clock.textContent;
                if (nextClockText === previousClockText) return;
                previousClockText = nextClockText;
                gsap.fromTo(clock, { scale: 0.985 }, {
                    scale: 1,
                    duration: 0.42,
                    ease: 'back.out(1.7)',
                    overwrite: 'auto'
                });
            });
            observer.observe(clock, { childList: true, characterData: true, subtree: true });
            observers.push(observer);
        }

        window.addEventListener('pagehide', () => {
            observers.forEach((observer) => observer.disconnect());
            media.revert();
        }, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runMotion, { once: true });
    } else {
        runMotion();
    }
})();
