(function initMagicAttendanceModule(root) {
    'use strict';

    const SCENE_DURATION_MS = 6000;
    const THREE_MODULE_URL = '/vendor/three/three.module.min.js';

    function safeCount(value) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
    }

    function buildAttendanceSceneModel(stats = {}) {
        return [
            { id: 'total', label: 'SINIF MEVCUDU', value: safeCount(stats.total) },
            { id: 'girls', label: 'KIZ ÖĞRENCİ', value: safeCount(stats.girls) },
            { id: 'boys', label: 'ERKEK ÖĞRENCİ', value: safeCount(stats.boys) }
        ];
    }

    async function createThreeDepthLayer(host, windowObject) {
        if (!host || windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;

        const THREE = await import('/vendor/three/three.module.min.js');
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        const geometry = new THREE.PlaneGeometry(1.4, 1.4, 1, 1);
        const palette = [0xc8b53c, 0xbf54b6, 0x47a2c7];
        const planes = palette.map((color, index) => {
            const material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.07,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const plane = new THREE.Mesh(geometry, material);
            plane.position.set((index - 1) * 0.72, index === 1 ? 0.34 : -0.2, -1 - index * 0.08);
            plane.rotation.z = (index - 1) * 0.45;
            scene.add(plane);
            return plane;
        });
        camera.position.z = 2;
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(windowObject?.devicePixelRatio || 1, 2));
        host.replaceChildren(renderer.domElement);

        let active = true;
        let frame = null;
        const resize = () => {
            const width = Math.max(1, host.clientWidth || 1);
            const height = Math.max(1, host.clientHeight || 1);
            renderer.setSize(width, height, false);
            camera.left = -(width / height);
            camera.right = width / height;
            camera.updateProjectionMatrix();
        };
        const render = (time = 0) => {
            if (!active) return;
            planes.forEach((plane, index) => {
                plane.rotation.z += 0.00018 * (index % 2 ? -1 : 1);
                plane.material.opacity = 0.055 + Math.sin(time * 0.00045 + index * 1.7) * 0.018;
            });
            renderer.render(scene, camera);
            frame = windowObject?.requestAnimationFrame?.(render) || null;
        };
        const ResizeObserverClass = windowObject?.ResizeObserver;
        const resizeObserver = ResizeObserverClass ? new ResizeObserverClass(resize) : null;
        resizeObserver?.observe(host);
        if (!resizeObserver) windowObject?.addEventListener?.('resize', resize);
        resize();
        frame = windowObject?.requestAnimationFrame?.(render) || null;

        return {
            setActive(nextActive) {
                const shouldRun = Boolean(nextActive);
                if (active === shouldRun) return;
                active = shouldRun;
                if (active) frame = windowObject?.requestAnimationFrame?.(render) || null;
                else if (frame) windowObject?.cancelAnimationFrame?.(frame);
            },
            dispose() {
                active = false;
                if (frame) windowObject?.cancelAnimationFrame?.(frame);
                resizeObserver?.disconnect();
                if (!resizeObserver) windowObject?.removeEventListener?.('resize', resize);
                planes.forEach(plane => plane.material.dispose());
                geometry.dispose();
                renderer.dispose();
                host.replaceChildren();
            }
        };
    }

    function createAttendanceController(options = {}) {
        const windowObject = options.window || root;
        const documentObject = options.document || windowObject?.document;
        let box = null;
        let scenes = [];
        let currentSceneIndex = 0;
        let sceneTimer = null;
        let sceneDuration = SCENE_DURATION_MS;
        let threeLayer = null;
        let initialized = false;

        const updateStats = (stats = {}) => {
            if (!box) return;
            buildAttendanceSceneModel(stats).forEach(scene => {
                const value = box.querySelector(`[data-attendance-value="${scene.id}"]`);
                if (value) value.textContent = String(scene.value);
            });
        };

        const setThemeActive = (active) => {
            if (!box) return;
            box.hidden = !active;
            if (box.dataset) box.dataset.active = active ? 'true' : 'false';
            threeLayer?.setActive(active);
            if (sceneTimer) windowObject?.clearTimeout?.(sceneTimer);
            sceneTimer = null;
            if (active) scheduleNextScene();
        };

        const activateScene = (index, animate = true) => {
            if (!scenes.length) return;
            const nextIndex = ((index % scenes.length) + scenes.length) % scenes.length;
            const previous = scenes[currentSceneIndex];
            const next = scenes[nextIndex];
            const reducedMotion = windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const gsap = windowObject?.gsap;

            if (previous && previous !== next) {
                if (gsap && animate && !reducedMotion) {
                    gsap.killTweensOf?.([previous, next]);
                    next.classList.add('is-active');
                    next.setAttribute?.('aria-hidden', 'false');
                    gsap.set?.(next, { autoAlpha: 0, xPercent: -7, rotationY: 7, scale: 0.965 });
                    const character = next.querySelector?.('.magic-attendance__character');
                    const label = next.querySelector?.('.magic-attendance__label');
                    const number = next.querySelector?.('.magic-attendance__number');
                    const isGenderScene = next.dataset?.attendanceScene === 'girls' || next.dataset?.attendanceScene === 'boys';
                    if (isGenderScene) gsap.set?.([character, label, number].filter(Boolean), { autoAlpha: 0 });
                    const timeline = gsap.timeline?.({
                        defaults: { ease: 'power3.inOut' },
                        onComplete: () => {
                            previous.classList.remove('is-active');
                            previous.setAttribute?.('aria-hidden', 'true');
                        }
                    });
                    timeline?.to(previous, { autoAlpha: 0, xPercent: 6, rotationY: -6, scale: 0.97, duration: 0.45 }, 0)
                        .to(next, { autoAlpha: 1, xPercent: 0, rotationY: 0, scale: 1, duration: 0.7 }, 0.12);
                    if (isGenderScene) {
                        if (character) timeline?.fromTo(character, { autoAlpha: 0, xPercent: -16, yPercent: 7, rotation: -2 }, { autoAlpha: 1, xPercent: 0, yPercent: 0, rotation: 0, duration: 0.72, ease: 'back.out(1.3)' }, 0.14);
                        if (label) timeline?.fromTo(label, { autoAlpha: 0, xPercent: -10, scale: 0.94 }, { autoAlpha: 1, xPercent: 0, scale: 1, duration: 0.5, ease: 'back.out(1.45)' }, 0.58);
                        if (number) timeline?.fromTo(number, { autoAlpha: 0, scale: 0.72, rotation: -3 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.65, ease: 'back.out(1.8)' }, 0.86);
                    } else {
                        if (label) timeline?.fromTo(label, { autoAlpha: 0, yPercent: -10 }, { autoAlpha: 1, yPercent: 0, duration: 0.5 }, 0.2);
                        if (number) timeline?.fromTo(number, { autoAlpha: 0, scale: 0.72, rotation: -3 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.65, ease: 'back.out(1.8)' }, 0.42);
                    }
                } else {
                    previous.classList.remove('is-active');
                    previous.setAttribute?.('aria-hidden', 'true');
                }
            }

            next.classList.add('is-active');
            next.setAttribute?.('aria-hidden', 'false');
            currentSceneIndex = nextIndex;
            if (box.dataset) box.dataset.scene = next.dataset?.attendanceScene || String(nextIndex);
        };

        const scheduleNextScene = () => {
            if (!box || box.hidden || scenes.length < 2 || sceneTimer) return;
            sceneTimer = windowObject?.setTimeout?.(() => {
                sceneTimer = null;
                activateScene(currentSceneIndex + 1);
                scheduleNextScene();
            }, sceneDuration) || null;
        };

        const loadManifest = async () => {
            if (typeof windowObject?.fetch !== 'function') return;
            try {
                const response = await windowObject.fetch('themes/magic-park/boxes/attendance/attendance.json');
                if (!response?.ok && response?.ok !== undefined) return;
                const manifest = await response.json();
                const configuredDuration = Number(manifest?.timingMs?.scene);
                if (Number.isFinite(configuredDuration) && configuredDuration >= 1000) sceneDuration = configuredDuration;
            } catch (_) {
                // The local defaults mirror attendance.json and keep the CSS fallback usable.
            }
        };

        const initializeDepth = async () => {
            const host = box?.querySelector?.('[data-attendance-webgl]');
            if (!host) return;
            try {
                threeLayer = await createThreeDepthLayer(host, windowObject);
                if (box?.dataset) box.dataset.depth = threeLayer ? 'three' : 'css';
            } catch (_) {
                if (box?.dataset) box.dataset.depth = 'css';
            }
        };

        const handleStats = event => updateStats(event?.detail || {});
        const handleTheme = event => setThemeActive(event?.detail?.themeId === 'magic-park');

        return {
            init() {
                if (initialized) return this;
                box = documentObject?.getElementById?.('magic-attendance-box') || null;
                if (!box) return this;
                scenes = Array.from(box.querySelectorAll?.('[data-attendance-scene]') || []);
                currentSceneIndex = Math.max(0, scenes.findIndex(scene => scene.classList?.contains?.('is-active')));
                activateScene(currentSceneIndex, false);
                windowObject?.addEventListener?.('classroom:stats-updated', handleStats);
                windowObject?.addEventListener?.('classroom:theme-change', handleTheme);
                setThemeActive(documentObject?.body?.dataset?.theme === 'magic-park');
                loadManifest();
                initializeDepth();
                initialized = true;
                return this;
            },
            dispose() {
                if (!initialized) return;
                if (sceneTimer) windowObject?.clearTimeout?.(sceneTimer);
                sceneTimer = null;
                threeLayer?.dispose();
                threeLayer = null;
                windowObject?.removeEventListener?.('classroom:stats-updated', handleStats);
                windowObject?.removeEventListener?.('classroom:theme-change', handleTheme);
                initialized = false;
            },
            updateStats,
            setThemeActive,
            activateScene
        };
    }

    const api = { buildAttendanceSceneModel, createAttendanceController, createThreeDepthLayer, THREE_MODULE_URL };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.MagicAttendance = Object.assign(root.MagicAttendance || {}, api);
        if (root.document) {
            const boot = () => {
                root.MagicAttendance.controller?.dispose?.();
                root.MagicAttendance.controller = createAttendanceController().init();
            };
            if (root.document.readyState === 'loading') {
                root.document.addEventListener('DOMContentLoaded', boot, { once: true });
            } else {
                boot();
            }
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
