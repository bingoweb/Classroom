(function initMagicLessonFlowModule(root) {
    'use strict';

    const THREE_MODULE_URL = '/vendor/three/three.module.min.js';
    const LIQUIDFUN_MODULE_URL = '/vendor/liquidfun/liquidfun.module.js';
    const LIQUID_PHYSICS_ADAPTER_URL = '/themes/magic-park/boxes/lesson-flow/liquid-physics.js';
    const JAR_BACKDROP_URL = '/themes/magic-park/boxes/lesson-flow/assets/glass-jar-interior-v1.webp';
    const DEFAULT_TRANSITION_SECONDS = 0.85;
    const KNOWN_MODES = new Set(['before-school', 'in-class', 'in-break', 'after-school', 'weekend', 'error']);
    const DEFAULT_JAR_INTERIOR = Object.freeze({
        sideInset: 0.075,
        centerFloor: 0.072,
        edgeFloor: 0.18,
        bottomCurve: 2,
        ceiling: 0.955,
        shoulderDepth: 0.055,
        feather: 0.012
    });

    function safeText(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function uppercase(value) {
        return safeText(value).toLocaleUpperCase('tr-TR');
    }

    function clampProgress(value) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
    }

    function normalizeJarInteriorStyle(style = {}) {
        const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
        return {
            sideInset: Math.min(0.2, Math.max(0.025, finite(style.sideInset, DEFAULT_JAR_INTERIOR.sideInset))),
            centerFloor: Math.min(0.2, Math.max(0, finite(style.centerFloor, DEFAULT_JAR_INTERIOR.centerFloor))),
            edgeFloor: Math.min(0.32, Math.max(0.08, finite(style.edgeFloor, DEFAULT_JAR_INTERIOR.edgeFloor))),
            bottomCurve: Math.min(4, Math.max(1.4, finite(style.bottomCurve, DEFAULT_JAR_INTERIOR.bottomCurve))),
            ceiling: Math.min(1, Math.max(0.82, finite(style.ceiling, DEFAULT_JAR_INTERIOR.ceiling))),
            shoulderDepth: Math.min(0.16, Math.max(0, finite(style.shoulderDepth, DEFAULT_JAR_INTERIOR.shoulderDepth))),
            feather: Math.min(0.035, Math.max(0.002, finite(style.feather, DEFAULT_JAR_INTERIOR.feather)))
        };
    }

    function resolveJarInteriorBounds(xNormalized, style = DEFAULT_JAR_INTERIOR) {
        const interior = normalizeJarInteriorStyle(style);
        const x = Math.min(1, Math.max(-1, Number(xNormalized) || 0));
        const maxX = 1 - (interior.sideInset * 2);
        const edgeRatio = Math.min(1, Math.abs(x) / maxX);
        const curvedRatio = 1 - Math.sqrt(Math.max(0, 1 - Math.pow(edgeRatio, interior.bottomCurve)));
        const floorUv = interior.centerFloor + ((interior.edgeFloor - interior.centerFloor) * curvedRatio);
        const ceilingUv = interior.ceiling - (interior.shoulderDepth * Math.pow(edgeRatio, 3.2));
        return {
            inside: Math.abs(x) <= maxX,
            maxX,
            floor: -1 + (floorUv * 2),
            ceiling: -1 + (ceilingUv * 2)
        };
    }

    function buildCarbonationSites(count = 12, style = DEFAULT_JAR_INTERIOR) {
        const total = Math.min(32, Math.max(3, Math.round(Number(count) || 12)));
        const maximumX = resolveJarInteriorBounds(0, style).maxX * 0.82;
        const goldenFraction = 0.6180339887498949;
        return Array.from({ length: total }, (_, index) => {
            const distributed = (((index + 0.5) * goldenFraction) % 1) * 2 - 1;
            const x = distributed * maximumX;
            const bounds = resolveJarInteriorBounds(x, style);
            return {
                x,
                y: bounds.floor + 0.018,
                phase: (index * 2.399963229728653) % (Math.PI * 2)
            };
        });
    }

    function resolveAdaptiveContrast(value) {
        const progress = clampProgress(value);
        return {
            context: progress >= 24,
            primary: progress >= 50,
            kicker: progress >= 74,
            title: progress >= 90
        };
    }

    function extractStartTime(subtitle) {
        const match = safeText(subtitle).match(/(?:^|\s)(\d{1,2}:\d{2})(?:\s|$)/);
        return match ? `${match[1]}’DA` : '';
    }

    function getPeriodNumber(status) {
        const explicit = Number(status?.currentPeriodNumber);
        if (Number.isInteger(explicit) && explicit > 0) return explicit;
        const match = safeText(status?.currentPeriodName || status?.subtitle).match(/^(\d+)\s*\./);
        return match ? Number(match[1]) : null;
    }

    function getPeriodContext(status, title) {
        const name = safeText(status?.currentPeriodName || status?.subtitle);
        const parenthetical = name.match(/^\d+\s*\.\s*(?:Ders|Teneffüs)\s*\((.+)\)$/i);
        if (parenthetical) return safeText(parenthetical[1]);
        return uppercase(name) === uppercase(title) ? '' : name;
    }

    function buildLessonFlowViewModel(status = {}, scheduleSource = 'fallback') {
        const requestedMode = safeText(status.mode);
        const mode = KNOWN_MODES.has(requestedMode) ? requestedMode : 'error';
        const progress = clampProgress(status.progress);
        const isExternal = scheduleSource === 'external';

        if (mode === 'before-school') {
            return {
                mode,
                kicker: 'BAŞLAMASINA KALAN',
                title: 'DERS BAŞLIYOR',
                primary: safeText(status.countdown) || '--:--',
                current: extractStartTime(status.subtitle),
                nextLabel: '',
                next: '',
                progress,
                showCountdown: true
            };
        }

        if (mode === 'in-class' || mode === 'in-break') {
            const periodNumber = getPeriodNumber(status);
            const periodKind = mode === 'in-class' ? 'DERS' : 'TENEFFÜS';
            const title = periodNumber ? `${periodNumber}. ${periodKind}` : periodKind;
            const next = isExternal ? safeText(status.nextLessonName || status.nextEventName) : '';
            return {
                mode,
                kicker: mode === 'in-class' ? 'TENEFFÜSE KALAN' : 'DERSE KALAN',
                title,
                primary: safeText(status.countdown) || '--:--',
                current: getPeriodContext(status, title),
                nextLabel: next ? 'SIRADAKİ' : '',
                next,
                progress,
                showCountdown: true
            };
        }

        if (mode === 'after-school' || mode === 'weekend') {
            const fallbackTitle = mode === 'after-school' ? 'YARIN GÖRÜŞÜRÜZ' : 'İYİ HAFTA SONLARI!';
            return {
                mode,
                kicker: mode === 'after-school' ? 'DERSLER TAMAMLANDI' : 'DİNLENME ZAMANI',
                title: uppercase(status.message) || fallbackTitle,
                primary: safeText(status.subtitle) || (mode === 'after-school' ? 'İyi dinlenin' : 'Güzelce dinlenin'),
                current: '',
                nextLabel: '',
                next: '',
                progress: mode === 'after-school' ? clampProgress(status.progress || 100) : progress,
                showCountdown: false
            };
        }

        return {
            mode: 'error',
            kicker: 'DERS AKIŞI',
            title: 'PROGRAM BEKLENİYOR',
            primary: 'Ders bilgisi hazırlanıyor',
            current: '',
            nextLabel: '',
            next: '',
            progress: 0,
            showCountdown: false
        };
    }

    function splitCountdownParts(value) {
        const text = safeText(value);
        if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) return null;
        return text.split(/(:)/).filter(Boolean);
    }

    function applyTypographyStyle(scene, typography = {}) {
        if (!scene?.style?.setProperty) return;
        const colorProperties = {
            dryFace: '--lesson-flow-type-dry-face',
            dryEdge: '--lesson-flow-type-dry-edge',
            wetFace: '--lesson-flow-type-wet-face',
            wetEdge: '--lesson-flow-type-wet-edge',
            depth: '--lesson-flow-type-depth',
            glass: '--lesson-flow-type-glass',
            warmGlint: '--lesson-flow-type-warm-glint'
        };
        Object.entries(colorProperties).forEach(([key, property]) => {
            const value = typography?.palette?.[key];
            if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
                scene.style.setProperty(property, value);
            }
        });

        const motionProperties = {
            titleSettle: '--lesson-flow-title-settle',
            kickerReveal: '--lesson-flow-kicker-reveal',
            separatorPulse: '--lesson-flow-separator-pulse',
            sheenCycle: '--lesson-flow-crest-sheen'
        };
        Object.entries(motionProperties).forEach(([key, property]) => {
            const milliseconds = Number(typography?.motionMs?.[key]);
            if (Number.isFinite(milliseconds) && milliseconds >= 200 && milliseconds <= 20000) {
                scene.style.setProperty(property, `${milliseconds}ms`);
            }
        });
    }

    function renderPrimaryValue(node, value, isCountdown, documentObject) {
        if (!node) return;
        const text = safeText(value);
        const parts = isCountdown ? splitCountdownParts(text) : null;
        const supportsSegments = parts
            && typeof documentObject?.createElement === 'function'
            && typeof node.replaceChildren === 'function';

        if (!supportsSegments) {
            if (node.textContent !== text) node.textContent = text;
            node.removeAttribute?.('aria-label');
            if (node.dataset) delete node.dataset.countdownValue;
            return;
        }
        if (node.dataset?.countdownValue === text) return;

        const children = parts.map((part, index) => {
            const span = documentObject.createElement('span');
            span.className = index % 2 === 0 ? 'lesson-flow__digits' : 'lesson-flow__separator';
            span.textContent = part;
            span.setAttribute('aria-hidden', 'true');
            return span;
        });
        node.replaceChildren(...children);
        node.setAttribute('aria-label', text);
        if (node.dataset) node.dataset.countdownValue = text;
    }

    async function createThreeFlowLayer(host, windowObject) {
        if (!host || windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;

        const [THREE, liquidEngine] = await Promise.all([
            import(THREE_MODULE_URL),
            import(LIQUIDFUN_MODULE_URL)
        ]);
        const createLiquidPhysics = root?.LessonFlowLiquidPhysics?.createLiquidPhysics;
        if (typeof createLiquidPhysics !== 'function') throw new Error('Lesson flow liquid physics adapter is unavailable');
        const physics = createLiquidPhysics(liquidEngine, { maxParticles: 640, seed: 29 });
        let jarInteriorStyle = normalizeJarInteriorStyle();
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(windowObject?.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        host.replaceChildren(renderer.domElement);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 2;
        const displayScene = new THREE.Scene();
        let jarBackdropTexture;
        try {
            jarBackdropTexture = await new THREE.TextureLoader().loadAsync(JAR_BACKDROP_URL);
            jarBackdropTexture.colorSpace = THREE.SRGBColorSpace;
            jarBackdropTexture.minFilter = THREE.LinearFilter;
            jarBackdropTexture.magFilter = THREE.LinearFilter;
            jarBackdropTexture.wrapS = THREE.ClampToEdgeWrapping;
            jarBackdropTexture.wrapT = THREE.ClampToEdgeWrapping;
        } catch (_) {
            jarBackdropTexture = new THREE.DataTexture(
                new Uint8Array([222, 244, 241, 255]),
                1,
                1,
                THREE.RGBAFormat,
                THREE.UnsignedByteType
            );
            jarBackdropTexture.colorSpace = THREE.SRGBColorSpace;
            jarBackdropTexture.needsUpdate = true;
        }
        const backdropMaterial = new THREE.MeshBasicMaterial({
            map: jarBackdropTexture,
            depthWrite: false,
            depthTest: false
        });
        const backdropQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMaterial);
        backdropQuad.renderOrder = 0;
        displayScene.add(backdropQuad);
        const surfaceSampleCount = 128;
        const surfaceProfileBytes = new Uint8Array(surfaceSampleCount);
        const surfaceTexture = new THREE.DataTexture(
            surfaceProfileBytes,
            surfaceSampleCount,
            1,
            THREE.RedFormat,
            THREE.UnsignedByteType
        );
        surfaceTexture.minFilter = THREE.LinearFilter;
        surfaceTexture.magFilter = THREE.LinearFilter;
        surfaceTexture.wrapS = THREE.ClampToEdgeWrapping;
        surfaceTexture.wrapT = THREE.ClampToEdgeWrapping;
        surfaceTexture.generateMipmaps = false;
        surfaceTexture.needsUpdate = true;

        const waterMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uSurfaceProfile: { value: surfaceTexture },
                uSurfaceTexel: { value: 1 / surfaceSampleCount },
                uTime: { value: 0 },
                uJarBackdrop: { value: jarBackdropTexture },
                uShallowColor: { value: new THREE.Color(0xffc44a) },
                uDeepColor: { value: new THREE.Color(0xe85d08) },
                uFoamColor: { value: new THREE.Color(0xfff3c4) },
                uGasColor: { value: new THREE.Color(0xfff9e6) },
                uScatterColor: { value: new THREE.Color(0xff9828) },
                uAbsorption: { value: new THREE.Vector3(0.18, 0.72, 1.55) },
                uOpticalDensity: { value: 1.18 },
                uRefractionStrength: { value: 0.018 },
                uFresnelStrength: { value: 0.36 },
                uMeniscusRise: { value: 0.018 },
                uJarDepth: { value: 0.72 },
                uJarInterior: { value: new THREE.Vector4(0.075, 0.072, 0.18, 2) },
                uJarCeiling: { value: new THREE.Vector2(0.955, 0.055) },
                uJarFeather: { value: 0.012 },
                uCapillaryAmplitude: { value: 0.012 },
                uCapillaryFrequency: { value: 28 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uSurfaceProfile;
                uniform sampler2D uJarBackdrop;
                uniform float uSurfaceTexel;
                uniform float uTime;
                uniform vec3 uShallowColor;
                uniform vec3 uDeepColor;
                uniform vec3 uFoamColor;
                uniform vec3 uGasColor;
                uniform vec3 uScatterColor;
                uniform vec3 uAbsorption;
                uniform float uOpticalDensity;
                uniform float uRefractionStrength;
                uniform float uFresnelStrength;
                uniform float uMeniscusRise;
                uniform float uJarDepth;
                uniform vec4 uJarInterior;
                uniform vec2 uJarCeiling;
                uniform float uJarFeather;
                uniform float uCapillaryAmplitude;
                uniform float uCapillaryFrequency;
                varying vec2 vUv;

                float hash21(vec2 point) {
                    point = fract(point * vec2(123.34, 456.21));
                    point += dot(point, point + 45.32);
                    return fract(point.x * point.y);
                }

                float valueNoise(vec2 point) {
                    vec2 cell = floor(point);
                    vec2 fraction = fract(point);
                    fraction = fraction * fraction * (3.0 - (2.0 * fraction));
                    float a = hash21(cell);
                    float b = hash21(cell + vec2(1.0, 0.0));
                    float c = hash21(cell + vec2(0.0, 1.0));
                    float d = hash21(cell + vec2(1.0, 1.0));
                    return mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);
                }

                float sampleSurface(float x) {
                    return texture2D(uSurfaceProfile, vec2(clamp(x, 0.0, 1.0), 0.5)).r;
                }

                float resolvedSurface(float x) {
                    float macroSurface = sampleSurface(x);
                    float capillaryPressure = (sin((x * uCapillaryFrequency) - (uTime * 1.18)) * 0.55)
                        + (sin((x * uCapillaryFrequency * 1.67) + (uTime * 0.82) + 1.4) * 0.3)
                        + (sin((x * uCapillaryFrequency * 2.46) - (uTime * 0.54) + 2.1) * 0.15);
                    float fillFade = smoothstep(0.018, 0.12, macroSurface)
                        * smoothstep(0.018, 0.12, 1.0 - macroSurface);
                    float halfWidth = 0.5 - uJarInterior.x;
                    float wallDistance = max(0.0, halfWidth - abs(x - 0.5));
                    float wallMeniscus = (1.0 - smoothstep(0.0, 0.055, wallDistance))
                        * uMeniscusRise * fillFade;
                    return clamp(
                        macroSurface + (capillaryPressure * uCapillaryAmplitude * fillFade) + wallMeniscus,
                        0.0,
                        1.0
                    );
                }

                float jarFloorY(float x) {
                    float halfWidth = 0.5 - uJarInterior.x;
                    float edgeRatio = clamp(abs(x - 0.5) / halfWidth, 0.0, 1.0);
                    float ellipseRise = 1.0 - sqrt(max(0.0, 1.0 - pow(edgeRatio, uJarInterior.w)));
                    return mix(uJarInterior.y, uJarInterior.z, ellipseRise);
                }

                float jarCeilingY(float x) {
                    float halfWidth = 0.5 - uJarInterior.x;
                    float edgeRatio = clamp(abs(x - 0.5) / halfWidth, 0.0, 1.0);
                    return uJarCeiling.x - (uJarCeiling.y * pow(edgeRatio, 3.2));
                }

                float jarInteriorMask(vec2 uv) {
                    float halfWidth = 0.5 - uJarInterior.x;
                    float side = 1.0 - smoothstep(
                        halfWidth - uJarFeather,
                        halfWidth + uJarFeather,
                        abs(uv.x - 0.5)
                    );
                    float floorMask = smoothstep(jarFloorY(uv.x), jarFloorY(uv.x) + uJarFeather, uv.y);
                    float ceilingMask = 1.0 - smoothstep(
                        jarCeilingY(uv.x) - uJarFeather,
                        jarCeilingY(uv.x),
                        uv.y
                    );
                    return side * floorMask * ceilingMask;
                }

                void main() {
                    float surface = resolvedSurface(vUv.x);
                    float signedDepth = surface - vUv.y;
                    float body = smoothstep(-0.006, 0.008, signedDepth);
                    body *= jarInteriorMask(vUv);
                    if (body < 0.002) discard;
                    float surfaceLeft = resolvedSurface(vUv.x - uSurfaceTexel);
                    float surfaceRight = resolvedSurface(vUv.x + uSurfaceTexel);
                    float slope = (surfaceRight - surfaceLeft) / (2.0 * uSurfaceTexel);
                    vec2 geometricNormal = normalize(vec2(-slope * 0.72, 1.0));
                    float depth = clamp(max(signedDepth, 0.0) / max(surface, 0.08), 0.0, 1.0);
                    float surfaceBand = 1.0 - smoothstep(0.0, 0.035, max(signedDepth, 0.0));
                    float meniscus = 1.0 - smoothstep(0.0, 0.011, abs(signedDepth));
                    float jarX = (vUv.x - 0.5) * 2.0;
                    float jarEdge = smoothstep(0.46, 0.98, abs(jarX));
                    float jarRound = sqrt(max(0.0, 1.0 - pow(abs(jarX), 2.35)));
                    float opticalPath = mix(0.52, 1.28, jarRound) * uJarDepth;
                    float floorY = jarFloorY(vUv.x);
                    float bottomLens = 1.0 - smoothstep(floorY + 0.004, floorY + 0.11, vUv.y);
                    float surfaceUnderside = smoothstep(0.006, 0.018, max(signedDepth, 0.0))
                        * (1.0 - smoothstep(0.018, 0.06, max(signedDepth, 0.0)));

                    vec2 finePoint = (vUv * vec2(11.0, 8.4)) + vec2(uTime * 0.13, -uTime * 0.071);
                    float fineCenter = valueNoise(finePoint);
                    float fineDx = valueNoise(finePoint + vec2(0.055, 0.0)) - fineCenter;
                    float fineDy = valueNoise(finePoint + vec2(0.0, 0.055)) - fineCenter;
                    vec2 normal = normalize(geometricNormal + vec2(-fineDx * 1.7, -fineDy * 0.34));
                    vec2 refractedUv = vUv
                        + (normal * uRefractionStrength * (0.62 + (surfaceBand * 1.4)) * (0.78 + (opticalPath * 0.24)))
                        + vec2(jarX * depth * 0.0045 * uJarDepth, 0.0);
                    vec2 movingField = (refractedUv * vec2(7.4, 9.1)) + vec2(uTime * 0.085, -uTime * 0.047);
                    float shimmer = valueNoise(movingField) * 0.62;
                    shimmer += valueNoise((movingField * 1.91) + vec2(4.7, 2.1)) * 0.38;
                    float caustic = pow(smoothstep(0.58, 0.92, shimmer), 2.6) * (0.035 + (depth * 0.035));
                    float reflection = pow(max(dot(normal, normalize(vec2(-0.32, 0.95))), 0.0), 18.0);
                    float fresnel = pow(clamp(1.0 - normal.y, 0.0, 1.0), 1.35);
                    float crest = smoothstep(0.11, 0.62, abs(slope)) * surfaceBand;

                    float volumeDepth = clamp(depth * (0.72 + (opticalPath * 0.42)), 0.0, 1.0);
                    vec3 refractedBackdrop = texture2D(uJarBackdrop,
                        clamp(refractedUv, vec2(0.002), vec2(0.998))).rgb;
                    float liquidPath = max(0.035, opticalPath * (0.28 + (depth * 0.92))) * uOpticalDensity;
                    vec3 transmittance = exp(-uAbsorption * liquidPath);
                    vec3 sodaScatter = mix(
                        uShallowColor,
                        uScatterColor,
                        smoothstep(0.0, 1.0, volumeDepth)
                    );
                    vec3 water = (refractedBackdrop * transmittance) + (sodaScatter * (1.0 - transmittance));
                    water = mix(water, uDeepColor, jarEdge * (0.08 + (depth * 0.12)));
                    water += uShallowColor * ((1.0 - jarEdge) * (1.0 - depth) * 0.055);
                    water += vec3(caustic);
                    vec3 skyReflection = mix(uGasColor, vec3(1.0), clamp(normal.y, 0.0, 1.0));
                    water = mix(
                        water,
                        skyReflection,
                        (surfaceBand * 0.42) + (fresnel * uFresnelStrength)
                    );
                    water = mix(water, uScatterColor, surfaceUnderside * (0.16 + ((1.0 - jarEdge) * 0.07)));
                    water = mix(water, uFoamColor, (reflection * 0.2) + (crest * 0.46));
                    water = mix(water, uFoamColor, meniscus * 0.7);
                    water = mix(water, uFoamColor, bottomLens * (0.06 + ((1.0 - jarEdge) * 0.05)));
                    float alpha = clamp(
                        0.94 + (surfaceBand * 0.035) + (meniscus * 0.02) + (reflection * 0.012),
                        0.0,
                        1.0
                    ) * body;
                    gl_FragColor = vec4(water, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });
        const waterQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), waterMaterial);
        waterQuad.renderOrder = 1;
        displayScene.add(waterQuad);

        const bubbleGeometry = new THREE.PlaneGeometry(0.038, 0.038);
        const bubbleMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                void main() {
                    vec2 point = (vUv - 0.5) * 2.0;
                    float distanceToCenter = length(point);
                    if (distanceToCenter > 1.0) discard;
                    float shell = smoothstep(0.96, 0.68, distanceToCenter) - smoothstep(0.66, 0.43, distanceToCenter);
                    float glint = smoothstep(0.31, 0.02, length(point - vec2(-0.36, 0.38)));
                    float alpha = (shell * 0.86) + (glint * 0.82) + ((1.0 - distanceToCenter) * 0.08);
                    gl_FragColor = vec4(1.0, 1.0, 0.96, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
        });
        const bubbleMesh = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, 72);
        bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        bubbleMesh.frustumCulled = false;
        bubbleMesh.renderOrder = 3;
        displayScene.add(bubbleMesh);
        const bubbleDummy = new THREE.Object3D();

        const microBubbleGeometry = new THREE.PlaneGeometry(0.014, 0.014);
        const microBubbleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uGasColor: { value: new THREE.Color(0xfff9e6) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uGasColor;
                varying vec2 vUv;
                void main() {
                    vec2 point = (vUv - 0.5) * 2.0;
                    float distanceToCenter = length(point);
                    if (distanceToCenter > 1.0) discard;
                    float shell = smoothstep(1.0, 0.72, distanceToCenter)
                        - smoothstep(0.7, 0.38, distanceToCenter);
                    float center = (1.0 - smoothstep(0.0, 0.82, distanceToCenter)) * 0.09;
                    float glint = smoothstep(0.3, 0.02, length(point - vec2(-0.34, 0.37)));
                    float alpha = (shell * 0.72) + center + (glint * 0.9);
                    gl_FragColor = vec4(uGasColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false
        });
        const microBubbleMesh = new THREE.InstancedMesh(microBubbleGeometry, microBubbleMaterial, 168);
        microBubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        microBubbleMesh.frustumCulled = false;
        microBubbleMesh.renderOrder = 2;
        displayScene.add(microBubbleMesh);
        const microBubbleDummy = new THREE.Object3D();

        let randomState = 0x9e3779b9;
        const random = () => {
            randomState = ((randomState * 1664525) + 1013904223) >>> 0;
            return randomState / 0x100000000;
        };
        let carbonationStyle = {
            microBubbles: 168,
            nucleationSites: 12,
            wallBubbles: 36,
            growth: 0.32,
            minimumRiseSpeed: 0.055,
            maximumRiseSpeed: 0.14
        };
        let carbonationSites = buildCarbonationSites(12, jarInteriorStyle);
        const createBubbleState = () => {
            const maxX = resolveJarInteriorBounds(0, jarInteriorStyle).maxX * 0.92;
            const x = (random() - 0.5) * maxX * 2;
            const bounds = resolveJarInteriorBounds(x, jarInteriorStyle);
            return {
                x,
                y: bounds.floor + 0.02 + (random() * 0.08),
                vx: (random() - 0.5) * 0.025,
                vy: 0.16 + (random() * 0.1),
                scale: 0.55 + (random() * 0.65),
                delay: random() * 4.5
            };
        };
        const bubbles = Array.from({ length: 72 }, createBubbleState);
        const createMicroBubbleState = index => {
            const originWall = index >= (168 - 36);
            const siteIndex = index % carbonationSites.length;
            const site = carbonationSites[siteIndex];
            const maximumX = resolveJarInteriorBounds(0, jarInteriorStyle).maxX;
            const wallSide = index % 2 === 0 ? -1 : 1;
            const x = originWall
                ? wallSide * maximumX * (0.87 + (random() * 0.075))
                : site.x + ((random() - 0.5) * 0.024);
            const bounds = resolveJarInteriorBounds(x, jarInteriorStyle);
            return {
                originWall,
                wallAttached: originWall,
                siteIndex,
                x,
                y: originWall
                    ? Math.min(bounds.ceiling - 0.04, bounds.floor + 0.045 + (random() * 0.72))
                    : bounds.floor + 0.018 + (random() * 0.02),
                vx: 0,
                vy: carbonationStyle.minimumRiseSpeed + (random() * 0.045),
                baseScale: 0.48 + (random() * 0.72),
                delay: random() * 4.6,
                age: random() * 1.4,
                releaseAfter: 2.4 + (random() * 6.4),
                phase: site.phase + (random() * 0.8)
            };
        };
        const microBubbles = Array.from({ length: 168 }, (_, index) => createMicroBubbleState(index));

        let active = true;
        let frame = null;
        let previousFrameTime = 0;
        let targetProgress = 0;
        let previousTargetProgress = 0;

        const respawnBubble = bubble => {
            const maxX = resolveJarInteriorBounds(0, jarInteriorStyle).maxX * 0.92;
            bubble.x = (random() - 0.5) * maxX * 2;
            const bounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
            bubble.y = bounds.floor + 0.018 + (random() * 0.055);
            bubble.vx = (random() - 0.5) * 0.022;
            bubble.vy = 0.16 + (random() * 0.1);
            bubble.scale = 0.55 + (random() * 0.65);
            bubble.delay = 0.4 + (random() * 3.8);
        };

        const respawnMicroBubble = (bubble, index) => {
            const site = carbonationSites[bubble.siteIndex % carbonationSites.length];
            const maximumX = resolveJarInteriorBounds(0, jarInteriorStyle).maxX;
            bubble.wallAttached = bubble.originWall;
            bubble.age = 0;
            bubble.releaseAfter = 2.4 + (random() * 6.4);
            bubble.delay = 0.15 + (random() * (bubble.originWall ? 4.2 : 2.2));
            bubble.vx = 0;
            bubble.vy = carbonationStyle.minimumRiseSpeed
                + (random() * (carbonationStyle.maximumRiseSpeed - carbonationStyle.minimumRiseSpeed));
            if (bubble.originWall) {
                const wallSide = index % 2 === 0 ? -1 : 1;
                bubble.x = wallSide * maximumX * (0.87 + (random() * 0.075));
                const bounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
                bubble.y = Math.min(
                    bounds.ceiling - 0.04,
                    bounds.floor + 0.045 + (random() * Math.max(0.08, bounds.ceiling - bounds.floor - 0.12))
                );
            } else {
                bubble.x = site.x + ((random() - 0.5) * 0.024);
                const bounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
                bubble.y = bounds.floor + 0.018 + (random() * 0.018);
            }
        };

        const resize = () => {
            const width = Math.max(1, host.clientWidth || 1);
            const height = Math.max(1, host.clientHeight || 1);
            renderer.setSize(width, height, false);
        };

        const sampleProfile = (profile, x) => {
            const position = Math.min(profile.length - 1, Math.max(0, ((x + 1) * 0.5) * (profile.length - 1)));
            const left = Math.floor(position);
            const right = Math.min(profile.length - 1, left + 1);
            const fraction = position - left;
            return profile[left] + ((profile[right] - profile[left]) * fraction);
        };

        const updateBubbles = (deltaSeconds, time, snapshot, surfaceProfile) => {
            const hasWater = snapshot.particleCount > 8;
            bubbles.forEach((bubble, index) => {
                bubble.delay -= deltaSeconds;
                const surface = -1 + (sampleProfile(surfaceProfile, bubble.x) * 2);
                if (!hasWater || bubble.delay > 0 || surface <= -0.94) {
                    bubbleDummy.scale.setScalar(0.001);
                } else {
                    const normalizedY = clampProgress(((bubble.y + 1) * 50)) / 100;
                    const flow = physics.sampleVelocity(bubble.x, normalizedY);
                    const drag = Math.min(1, deltaSeconds * 2.8);
                    bubble.vx += ((flow.x * 0.22) - bubble.vx) * drag;
                    bubble.vx += Math.sin((time * 0.0016) + (index * 1.91)) * deltaSeconds * 0.014;
                    bubble.vy += (0.18 + (bubble.scale * 0.08)) * deltaSeconds;
                    bubble.vy += ((flow.y * 0.16) - bubble.vy) * Math.min(0.42, deltaSeconds * 0.7);
                    bubble.x += bubble.vx * deltaSeconds;
                    bubble.y += bubble.vy * deltaSeconds;
                    const maxX = resolveJarInteriorBounds(0, jarInteriorStyle).maxX * 0.94;
                    if (bubble.x < -maxX || bubble.x > maxX) {
                        bubble.x = Math.min(maxX, Math.max(-maxX, bubble.x));
                        bubble.vx *= -0.62;
                    }
                    const bounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
                    if (bubble.y < bounds.floor + 0.012) {
                        bubble.y = bounds.floor + 0.012;
                        bubble.vy = Math.abs(bubble.vy);
                    }
                    if (bubble.y + (bubble.scale * 0.028) >= surface) {
                        physics.disturb(bubble.x, 0.1 + (bubble.scale * 0.08));
                        respawnBubble(bubble);
                    }
                    const visible = bounds.inside && bubble.y < surface && bubble.y > bounds.floor;
                    bubbleDummy.position.set(bubble.x, bubble.y, 0.26);
                    bubbleDummy.scale.setScalar(visible ? bubble.scale : 0.001);
                }
                bubbleDummy.updateMatrix();
                bubbleMesh.setMatrixAt(index, bubbleDummy.matrix);
            });
            bubbleMesh.instanceMatrix.needsUpdate = true;
        };

        const updateMicroBubbles = (deltaSeconds, time, snapshot, surfaceProfile) => {
            const hasWater = snapshot.particleCount > 8;
            microBubbles.forEach((bubble, index) => {
                bubble.delay -= deltaSeconds;
                const bounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
                const surface = -1 + (sampleProfile(surfaceProfile, bubble.x) * 2);
                let visible = false;
                let displayScale = 0.001;

                if (hasWater && bubble.delay <= 0 && surface > bounds.floor + 0.025) {
                    bubble.age += deltaSeconds;
                    if (bubble.y >= surface - 0.005 || bubble.y <= bounds.floor) {
                        respawnMicroBubble(bubble, index);
                    } else if (bubble.wallAttached) {
                        bubble.y += deltaSeconds * 0.0018;
                        if (bubble.age >= bubble.releaseAfter) {
                            bubble.wallAttached = false;
                            bubble.vx = (random() - 0.5) * 0.012;
                        }
                    } else {
                        const normalizedY = Math.min(1, Math.max(0, (bubble.y + 1) * 0.5));
                        const flow = physics.sampleVelocity(bubble.x, normalizedY);
                        const riseTarget = Math.min(
                            carbonationStyle.maximumRiseSpeed,
                            Math.max(carbonationStyle.minimumRiseSpeed, bubble.vy)
                        );
                        bubble.vx += ((flow.x * 0.12) - bubble.vx) * Math.min(1, deltaSeconds * 1.8);
                        bubble.vx += Math.sin((time * 0.0019) + bubble.phase) * deltaSeconds * 0.0045;
                        bubble.vy += ((riseTarget + (flow.y * 0.08)) - bubble.vy)
                            * Math.min(1, deltaSeconds * 1.45);
                        bubble.x += bubble.vx * deltaSeconds;
                        bubble.y += bubble.vy * deltaSeconds;
                    }

                    const currentBounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
                    const wallLimit = currentBounds.maxX * 0.965;
                    bubble.x = Math.min(wallLimit, Math.max(-wallLimit, bubble.x));
                    const currentSurface = -1 + (sampleProfile(surfaceProfile, bubble.x) * 2);
                    const travel = Math.min(1, Math.max(0,
                        (bubble.y - currentBounds.floor) / Math.max(0.08, currentSurface - currentBounds.floor)
                    ));
                    const growth = 0.58 + (travel * carbonationStyle.growth * 1.6);
                    const pulse = 1 + (Math.sin((time * 0.0032) + bubble.phase) * 0.055);
                    displayScale = bubble.baseScale * growth * pulse;
                    visible = currentBounds.inside
                        && bubble.y > currentBounds.floor
                        && bubble.y < currentSurface - 0.002;

                    if (bubble.y >= currentSurface - 0.006) {
                        respawnMicroBubble(bubble, index);
                        visible = false;
                    }
                }

                microBubbleDummy.position.set(bubble.x, bubble.y, 0.18);
                microBubbleDummy.scale.setScalar(visible ? displayScale : 0.001);
                microBubbleDummy.updateMatrix();
                microBubbleMesh.setMatrixAt(index, microBubbleDummy.matrix);
            });
            microBubbleMesh.instanceMatrix.needsUpdate = true;
        };

        const render = (time = 0) => {
            if (!active) return;
            const deltaSeconds = previousFrameTime ? Math.min(0.05, Math.max(0, (time - previousFrameTime) / 1000)) : 1 / 60;
            previousFrameTime = time;
            physics.step(deltaSeconds);
            const snapshot = physics.getSnapshot();
            const surfaceProfile = physics.getSurfaceProfile(surfaceSampleCount);
            for (let index = 0; index < surfaceSampleCount; index += 1) {
                surfaceProfileBytes[index] = Math.round(Math.min(1, Math.max(0, surfaceProfile[index])) * 255);
            }
            surfaceTexture.needsUpdate = true;
            updateBubbles(deltaSeconds, time, snapshot, surfaceProfile);
            updateMicroBubbles(deltaSeconds, time, snapshot, surfaceProfile);
            waterMaterial.uniforms.uTime.value = time * 0.001;

            renderer.setClearColor(0x000000, 0);
            renderer.clear();
            renderer.render(displayScene, camera);
            frame = windowObject?.requestAnimationFrame?.(render) || null;
        };

        const ResizeObserverClass = windowObject?.ResizeObserver;
        const resizeObserver = ResizeObserverClass ? new ResizeObserverClass(resize) : null;
        resizeObserver?.observe(host);
        if (!resizeObserver) windowObject?.addEventListener?.('resize', resize);
        resize();
        frame = windowObject?.requestAnimationFrame?.(render) || null;

        return {
            transition() { physics.disturb(0, 0.32); },
            setProgress(value, mode) {
                targetProgress = Math.min(1, Math.max(0, (Number(value) || 0) / 100));
                physics.setTargetFill(targetProgress);
                if (targetProgress > 0.02 && previousTargetProgress <= 0.02) {
                    bubbles.forEach(bubble => {
                        const bounds = resolveJarInteriorBounds(bubble.x, jarInteriorStyle);
                        const surface = -1 + (targetProgress * 2);
                        const availableHeight = Math.max(0.02, surface - bounds.floor - 0.04);
                        bubble.y = bounds.floor + 0.02 + (random() * availableHeight);
                        bubble.delay = random() * 0.8;
                    });
                    physics.disturb(-0.68, 0.36);
                    physics.disturb(-0.18, -0.22);
                    physics.disturb(0.34, 0.3);
                    physics.disturb(0.72, -0.16);
                }
                previousTargetProgress = targetProgress;
            },
            setWaveStyle(style) {
                physics.setWaveStyle(style);
                const capillaryAmplitude = Number(style?.capillaryAmplitude);
                const capillaryFrequency = Number(style?.capillaryFrequency);
                if (Number.isFinite(capillaryAmplitude)) {
                    waterMaterial.uniforms.uCapillaryAmplitude.value = Math.min(0.025, Math.max(0, capillaryAmplitude));
                }
                if (Number.isFinite(capillaryFrequency)) {
                    waterMaterial.uniforms.uCapillaryFrequency.value = Math.min(72, Math.max(8, capillaryFrequency));
                }
            },
            setGlassStyle(style = {}) {
                const depth = Number(style.liquidDepth);
                if (Number.isFinite(depth)) waterMaterial.uniforms.uJarDepth.value = Math.min(1.2, Math.max(0.2, depth));
                jarInteriorStyle = normalizeJarInteriorStyle(style.interiorMask);
                carbonationSites = buildCarbonationSites(carbonationStyle.nucleationSites, jarInteriorStyle);
                waterMaterial.uniforms.uJarInterior.value.set(
                    jarInteriorStyle.sideInset,
                    jarInteriorStyle.centerFloor,
                    jarInteriorStyle.edgeFloor,
                    jarInteriorStyle.bottomCurve
                );
                waterMaterial.uniforms.uJarCeiling.value.set(
                    jarInteriorStyle.ceiling,
                    jarInteriorStyle.shoulderDepth
                );
                waterMaterial.uniforms.uJarFeather.value = jarInteriorStyle.feather;
                microBubbles.forEach((bubble, index) => {
                    bubble.siteIndex = index % carbonationSites.length;
                    respawnMicroBubble(bubble, index);
                });
            },
            setSodaStyle(palette = {}, optics = {}) {
                const setColor = (uniformName, value) => {
                    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
                        waterMaterial.uniforms[uniformName].value.set(value);
                    }
                };
                setColor('uShallowColor', palette.shallow);
                setColor('uDeepColor', palette.deep);
                setColor('uFoamColor', palette.foam);
                setColor('uGasColor', palette.gas);
                setColor('uScatterColor', palette.scatter);
                if (typeof palette.gas === 'string' && /^#[0-9a-f]{6}$/i.test(palette.gas)) {
                    microBubbleMaterial.uniforms.uGasColor.value.set(palette.gas);
                }

                const absorption = Array.isArray(optics.absorption) ? optics.absorption.map(Number) : [];
                if (absorption.length === 3 && absorption.every(Number.isFinite)) {
                    waterMaterial.uniforms.uAbsorption.value.set(
                        Math.min(3, Math.max(0.01, absorption[0])),
                        Math.min(3, Math.max(0.01, absorption[1])),
                        Math.min(3, Math.max(0.01, absorption[2]))
                    );
                }
                const setNumber = (uniformName, value, minimum, maximum) => {
                    const number = Number(value);
                    if (Number.isFinite(number)) {
                        waterMaterial.uniforms[uniformName].value = Math.min(maximum, Math.max(minimum, number));
                    }
                };
                setNumber('uOpticalDensity', optics.density, 0.2, 2.4);
                setNumber('uRefractionStrength', optics.refractionStrength, 0.004, 0.05);
                setNumber('uFresnelStrength', optics.fresnel, 0.05, 0.65);
                setNumber('uMeniscusRise', optics.meniscusRise, 0, 0.04);
            },
            setCarbonationStyle(style = {}) {
                const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
                const minimumRiseSpeed = Math.min(0.22, Math.max(0.025,
                    finite(style.minimumRiseSpeed, carbonationStyle.minimumRiseSpeed)
                ));
                const maximumRiseSpeed = Math.min(0.3, Math.max(minimumRiseSpeed,
                    finite(style.maximumRiseSpeed, carbonationStyle.maximumRiseSpeed)
                ));
                carbonationStyle = {
                    microBubbles: 168,
                    nucleationSites: Math.min(32, Math.max(3, Math.round(
                        finite(style.nucleationSites, carbonationStyle.nucleationSites)
                    ))),
                    wallBubbles: Math.min(72, Math.max(0, Math.round(
                        finite(style.wallBubbles, carbonationStyle.wallBubbles)
                    ))),
                    growth: Math.min(0.7, Math.max(0,
                        finite(style.growth, carbonationStyle.growth)
                    )),
                    minimumRiseSpeed,
                    maximumRiseSpeed
                };
                carbonationSites = buildCarbonationSites(carbonationStyle.nucleationSites, jarInteriorStyle);
                microBubbles.forEach((bubble, index) => {
                    bubble.originWall = index >= (168 - carbonationStyle.wallBubbles);
                    bubble.siteIndex = index % carbonationSites.length;
                    respawnMicroBubble(bubble, index);
                });
            },
            setLiquidPalette(palette = {}) {
                this.setSodaStyle(palette);
            },
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
                physics.dispose();
                surfaceTexture.dispose();
                backdropQuad.geometry.dispose();
                backdropMaterial.dispose();
                jarBackdropTexture.dispose();
                waterQuad.geometry.dispose();
                waterMaterial.dispose();
                bubbleGeometry.dispose();
                bubbleMaterial.dispose();
                microBubbleGeometry.dispose();
                microBubbleMaterial.dispose();
                renderer.dispose();
                host.replaceChildren();
            }
        };
    }

    function createLessonFlowController(options = {}) {
        const windowObject = options.window || root;
        const documentObject = options.document || windowObject?.document;
        let box = null;
        let scene = null;
        let depthLayer = null;
        let initialized = false;
        let active = false;
            let previousMode = '';
            let latestModel = null;
        let liquidPalette = null;
        let sodaOptics = null;
        let carbonationStyle = null;
        let surfaceWave = null;
        let glassStyle = null;
            let transitionSeconds = DEFAULT_TRANSITION_SECONDS;

        const getNode = id => documentObject?.getElementById?.(id) || null;

        const setText = (id, value) => {
            const node = getNode(id);
            if (node && node.textContent !== value) node.textContent = value;
        };

        const animateModel = (model, modeChanged) => {
            if (!scene || !active || !modeChanged) return;
            const reducedMotion = windowObject?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
            const gsap = windowObject?.gsap;
            if (!gsap || reducedMotion) return;

            const title = getNode('lesson-flow-title');
            const primary = getNode('lesson-flow-primary');
            const context = scene.querySelector?.('.lesson-flow__context');
            const targets = [title, primary, context].filter(Boolean);
            gsap.killTweensOf?.(targets);
            const timeline = gsap.timeline?.({ defaults: { ease: 'power3.out' } });
            timeline?.fromTo(title, { autoAlpha: 0, xPercent: -8, rotationY: 8 }, { autoAlpha: 1, xPercent: 0, rotationY: 0, duration: transitionSeconds * 0.5 }, 0)
                .fromTo(primary, { autoAlpha: 0, xPercent: -10, scale: 0.8 }, { autoAlpha: 1, xPercent: 0, scale: 1, duration: transitionSeconds * 0.68, ease: 'back.out(1.35)' }, 0.12)
                .fromTo(context, { autoAlpha: 0, xPercent: -6 }, { autoAlpha: 1, xPercent: 0, duration: transitionSeconds * 0.48 }, 0.34);
        };

        const render = (status, scheduleSource = 'fallback') => {
            if (!box) return null;
            const model = buildLessonFlowViewModel(status, scheduleSource);
            latestModel = model;
            const modeChanged = previousMode !== model.mode;
            box.dataset.lessonFlowMode = model.mode;
            if (scene?.dataset) scene.dataset.mode = model.mode;
            scene?.style?.setProperty?.('--lesson-flow-progress', `${model.progress}%`);
            if (scene) {
                scene.classList?.toggle?.('is-message-mode', !model.showCountdown);
                scene.classList?.toggle?.('has-next', Boolean(model.next));
            }

            setText('lesson-flow-title', model.title);
            setText('lesson-flow-kicker', model.kicker);
            setText('lesson-flow-current', model.current);
            setText('lesson-flow-next-label', model.nextLabel);
            setText('lesson-flow-next', model.next);

            const primary = getNode('lesson-flow-primary');
            renderPrimaryValue(primary, model.primary, model.showCountdown, documentObject);
            if (primary?.classList) primary.classList.toggle('is-countdown', model.showCountdown);
            const current = getNode('lesson-flow-current');
            if (current) current.hidden = !model.current;
            const next = getNode('lesson-flow-next');
            if (next) next.hidden = !model.next;
            const nextLabel = getNode('lesson-flow-next-label');
            if (nextLabel) nextLabel.hidden = !model.nextLabel;
            const nextGroup = scene?.querySelector?.('.lesson-flow__next-group');
            if (nextGroup) nextGroup.hidden = !model.next;
            const context = scene?.querySelector?.('.lesson-flow__context');
            if (context) context.hidden = !model.current && !model.next;

            const progressbar = scene?.querySelector?.('[role="progressbar"]');
            progressbar?.setAttribute?.('aria-valuenow', String(Math.round(model.progress)));
            depthLayer?.setProgress?.(model.progress, model.mode);

            const contrast = resolveAdaptiveContrast(model.progress);
            const contrastTargets = {
                title: getNode('lesson-flow-title'),
                kicker: getNode('lesson-flow-kicker'),
                primary,
                context
            };
            Object.entries(contrastTargets).forEach(([zone, node]) => {
                node?.classList?.toggle?.('is-on-fill', contrast[zone]);
            });

            if (modeChanged) {
                depthLayer?.transition();
                animateModel(model, true);
            }
            previousMode = model.mode;
            return model;
        };

        const setThemeActive = nextActive => {
            active = Boolean(nextActive);
            if (scene) scene.hidden = !active;
            depthLayer?.setActive(active);
        };

        const loadManifest = async () => {
            if (typeof windowObject?.fetch !== 'function') return;
            try {
                const response = await windowObject.fetch('themes/magic-park/boxes/lesson-flow/lesson-flow.json');
                if (!response?.ok && response?.ok !== undefined) return;
                    const manifest = await response.json();
                    const milliseconds = Number(manifest?.timingMs?.transition);
                    if (Number.isFinite(milliseconds) && milliseconds >= 250) transitionSeconds = milliseconds / 1000;
                    if (manifest?.typography) applyTypographyStyle(scene, manifest.typography);
                        if (manifest?.water?.liquidKind === 'orange-soda' && manifest.water.liquidPalette) {
                            liquidPalette = manifest.water.liquidPalette;
                            sodaOptics = manifest.water.optics || null;
                            depthLayer?.setSodaStyle?.(liquidPalette, sodaOptics);
                        }
                        if (manifest?.water?.carbonation) {
                            carbonationStyle = manifest.water.carbonation;
                            depthLayer?.setCarbonationStyle?.(carbonationStyle);
                        }
                    if (manifest?.water?.surfaceWave) {
                        surfaceWave = manifest.water.surfaceWave;
                        depthLayer?.setWaveStyle?.(surfaceWave);
                    }
                    if (manifest?.water?.glass) {
                        glassStyle = manifest.water.glass;
                        depthLayer?.setGlassStyle?.(glassStyle);
                    }
            } catch (_) {
                // Local defaults mirror the manifest and preserve the CSS fallback.
            }
        };

        const initializeDepth = async () => {
            const host = scene?.querySelector?.('[data-lesson-flow-webgl]');
            if (!host) return;
            try {
                    depthLayer = await createThreeFlowLayer(host, windowObject);
                        if (scene?.dataset) scene.dataset.depth = depthLayer ? 'liquidfun' : 'css';
                        if (liquidPalette) depthLayer?.setSodaStyle?.(liquidPalette, sodaOptics);
                        if (carbonationStyle) depthLayer?.setCarbonationStyle?.(carbonationStyle);
                        if (surfaceWave) depthLayer?.setWaveStyle?.(surfaceWave);
                    if (glassStyle) depthLayer?.setGlassStyle?.(glassStyle);
                if (depthLayer && latestModel) depthLayer.setProgress(latestModel.progress, latestModel.mode);
                depthLayer?.setActive(active);
            } catch (_) {
                if (scene?.dataset) scene.dataset.depth = 'css';
            }
        };

        const handleStatus = event => {
            const detail = event?.detail || {};
            render(detail.status || {}, detail.scheduleSource || 'fallback');
        };
        const handleTheme = event => setThemeActive(event?.detail?.themeId === 'magic-park');

        return {
            init() {
                if (initialized) return this;
                box = documentObject?.getElementById?.('countdown-card') || null;
                scene = documentObject?.getElementById?.('magic-lesson-flow') || null;
                if (!box) return this;
                windowObject?.addEventListener?.('classroom:schedule-status-updated', handleStatus);
                windowObject?.addEventListener?.('classroom:theme-change', handleTheme);
                setThemeActive(documentObject?.body?.dataset?.theme === 'magic-park');
                loadManifest();
                initializeDepth();
                initialized = true;
                return this;
            },
            dispose() {
                if (!initialized) return;
                windowObject?.removeEventListener?.('classroom:schedule-status-updated', handleStatus);
                windowObject?.removeEventListener?.('classroom:theme-change', handleTheme);
                depthLayer?.dispose();
                depthLayer = null;
                initialized = false;
            },
            render,
            setThemeActive
        };
    }

    const api = {
        buildLessonFlowViewModel,
        splitCountdownParts,
        applyTypographyStyle,
        renderPrimaryValue,
        resolveAdaptiveContrast,
        resolveJarInteriorBounds,
        buildCarbonationSites,
        createLessonFlowController,
        createThreeFlowLayer,
        THREE_MODULE_URL,
        LIQUIDFUN_MODULE_URL,
        LIQUID_PHYSICS_ADAPTER_URL,
        JAR_BACKDROP_URL
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;

    if (root) {
        root.MagicLessonFlow = Object.assign(root.MagicLessonFlow || {}, api);
        if (root.document) {
            const boot = () => {
                root.MagicLessonFlow.controller?.dispose?.();
                root.MagicLessonFlow.controller = createLessonFlowController().init();
            };
            if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot, { once: true });
            else boot();
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
