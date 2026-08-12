(function initLessonFlowLiquidPhysics(root) {
    'use strict';

    const TANK_WIDTH = 4;
    const TANK_HEIGHT = 2.32;
    const HALF_WIDTH = TANK_WIDTH / 2;
    const PARTICLE_RADIUS = 0.074;
    const FIXED_STEP = 1 / 60;
    const SURFACE_GRID_SIZE = 128;
    const DEFAULT_WAVE_STYLE = Object.freeze({
        propagation: 0.225,
        velocityRetention: 0.996,
        displacementRetention: 0.99965,
        reflection: 0.82,
        maximumAmplitude: 0.086,
        impulseRadius: 7,
        impulseGain: 0.0135
    });

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function createSeededRandom(seed = 19) {
        let state = (Number(seed) || 19) >>> 0;
        return () => {
            state = ((state * 1664525) + 1013904223) >>> 0;
            return state / 0x100000000;
        };
    }

    function createLiquidPhysics(engine, options = {}) {
        if (!engine?.b2World || !engine?.b2ParticleSystemDef) {
            throw new TypeError('LiquidFun engine is required');
        }

        const maxParticles = Math.max(120, Math.round(Number(options.maxParticles) || 640));
        const random = createSeededRandom(options.seed);
        const world = new engine.b2World(new engine.b2Vec2(0, -8.8));
        const tank = world.CreateBody();

        const addWall = (halfWidth, halfHeight, centerX, centerY) => {
            const shape = new engine.b2PolygonShape();
            shape.SetAsBox(halfWidth, halfHeight, new engine.b2Vec2(centerX, centerY), 0);
            tank.CreateFixture({ shape, density: 0, friction: 0.01, restitution: 0.01 });
        };
        addWall(HALF_WIDTH + 0.16, 0.12, 0, -0.12);
        addWall(0.12, (TANK_HEIGHT + 0.24) / 2, -HALF_WIDTH - 0.08, TANK_HEIGHT / 2);
        addWall(0.12, (TANK_HEIGHT + 0.24) / 2, HALF_WIDTH + 0.08, TANK_HEIGHT / 2);

        const systemDefinition = new engine.b2ParticleSystemDef();
        systemDefinition.radius = PARTICLE_RADIUS;
        systemDefinition.density = 1.05;
        systemDefinition.dampingStrength = 0.22;
        systemDefinition.viscousStrength = 0.34;
        systemDefinition.surfaceTensionPressureStrength = 0.24;
        systemDefinition.surfaceTensionNormalStrength = 0.36;
        systemDefinition.staticPressureStrength = 0.32;
        systemDefinition.staticPressureRelaxation = 0.24;
        systemDefinition.maxCount = maxParticles + 64;
        const particleSystem = world.CreateParticleSystem(systemDefinition);

        const waterFlags = engine.b2ParticleFlag.b2_viscousParticle
            | engine.b2ParticleFlag.b2_tensileParticle
            | engine.b2ParticleFlag.b2_staticPressureParticle;
        let targetCount = 0;
        let targetFillRatio = 0;
        let disposed = false;
        let accumulator = 0;
        let spawnCursor = 0;
        let surfaceTime = 0;
        let waveStyle = { ...DEFAULT_WAVE_STYLE };
        const surfaceDisplacement = new Float32Array(SURFACE_GRID_SIZE);
        const surfaceVelocity = new Float32Array(SURFACE_GRID_SIZE);

        const setWaveStyle = (style = {}) => {
            waveStyle = {
                propagation: clamp(Number(style.propagation) || DEFAULT_WAVE_STYLE.propagation, 0.08, 0.32),
                velocityRetention: clamp(Number(style.velocityRetention) || DEFAULT_WAVE_STYLE.velocityRetention, 0.97, 0.9995),
                displacementRetention: clamp(Number(style.displacementRetention) || DEFAULT_WAVE_STYLE.displacementRetention, 0.98, 0.99995),
                reflection: clamp(Number(style.reflection) || DEFAULT_WAVE_STYLE.reflection, 0.2, 0.95),
                maximumAmplitude: clamp(Number(style.maximumAmplitude) || DEFAULT_WAVE_STYLE.maximumAmplitude, 0.02, 0.14),
                impulseRadius: Math.round(clamp(Number(style.impulseRadius) || DEFAULT_WAVE_STYLE.impulseRadius, 4, 18)),
                impulseGain: clamp(Number(style.impulseGain) || DEFAULT_WAVE_STYLE.impulseGain, 0.004, 0.025)
            };
        };
        setWaveStyle(options.surfaceWave);

        const createParticle = () => {
            const count = particleSystem.GetParticleCount();
            const estimatedLevel = clamp((count / maxParticles) * TANK_HEIGHT, 0.12, TANK_HEIGHT - 0.16);
            const columns = 25;
            const column = spawnCursor % columns;
            const rowJitter = Math.floor(spawnCursor / columns) % 3;
            spawnCursor += 1;
            const definition = new engine.b2ParticleDef();
            definition.flags = waterFlags;
            definition.position.Set(
                -HALF_WIDTH + 0.18 + ((column / (columns - 1)) * (TANK_WIDTH - 0.36)) + ((random() - 0.5) * 0.028),
                clamp(estimatedLevel - (PARTICLE_RADIUS * 0.65) + (rowJitter * 0.018), 0.14, TANK_HEIGHT - 0.16)
            );
            definition.velocity.Set((random() - 0.5) * 0.12, (random() - 0.5) * 0.025);
            particleSystem.CreateParticle(definition);
        };

        const reconcileVolume = () => {
            let count = particleSystem.GetParticleCount();
            const delta = targetCount - count;
            if (delta > 0) {
                const additions = Math.min(delta, 14);
                for (let index = 0; index < additions; index += 1) createParticle();
            } else if (delta < 0) {
                const removals = Math.min(-delta, 18);
                for (let index = 0; index < removals; index += 1) {
                    count = particleSystem.GetParticleCount();
                    if (count > 0) particleSystem.DestroyParticle(count - 1, false);
                }
            }
        };

        const stepSurfaceWaves = () => {
            surfaceTime += FIXED_STEP;
            const nextVelocity = new Float32Array(SURFACE_GRID_SIZE);
            for (let index = 1; index < SURFACE_GRID_SIZE - 1; index += 1) {
                const laplacian = surfaceDisplacement[index - 1]
                    - (2 * surfaceDisplacement[index])
                    + surfaceDisplacement[index + 1];
                nextVelocity[index] = (surfaceVelocity[index] + (laplacian * waveStyle.propagation))
                    * waveStyle.velocityRetention;
            }
            if (targetFillRatio > 0.015 && targetFillRatio < 0.995) {
                nextVelocity[8] += Math.sin(surfaceTime * 1.45) * 0.00022;
                nextVelocity[33] += Math.sin((surfaceTime * 1.08) + 0.7) * 0.00014;
                nextVelocity[62] += Math.sin((surfaceTime * 0.69) + 2.2) * 0.00012;
                nextVelocity[95] += Math.sin((surfaceTime * 0.93) + 1.4) * 0.00016;
                nextVelocity[SURFACE_GRID_SIZE - 9] += Math.sin((surfaceTime * 1.31) + 2.7) * 0.0002;
                for (let index = 5; index < SURFACE_GRID_SIZE - 5; index += 1) {
                    const edgeFade = Math.min(1, index / 18, (SURFACE_GRID_SIZE - 1 - index) / 18);
                    const travelingPressure = Math.sin((surfaceTime * 1.72) - (index * 0.31)) * 0.000012;
                    const returningPressure = Math.sin((surfaceTime * 0.94) + (index * 0.19) + 1.8) * 0.000006;
                    nextVelocity[index] += (travelingPressure + returningPressure) * edgeFade;
                }
            }
            for (let index = 1; index < SURFACE_GRID_SIZE - 1; index += 1) {
                surfaceVelocity[index] = nextVelocity[index];
                surfaceDisplacement[index] = clamp(
                    (surfaceDisplacement[index] + surfaceVelocity[index]) * waveStyle.displacementRetention,
                    -waveStyle.maximumAmplitude,
                    waveStyle.maximumAmplitude
                );
            }
            surfaceDisplacement[0] = surfaceDisplacement[1] * 0.985;
            surfaceDisplacement[SURFACE_GRID_SIZE - 1] = surfaceDisplacement[SURFACE_GRID_SIZE - 2] * 0.985;
            surfaceVelocity[0] = surfaceVelocity[1] * -waveStyle.reflection;
            surfaceVelocity[SURFACE_GRID_SIZE - 1] = surfaceVelocity[SURFACE_GRID_SIZE - 2] * -waveStyle.reflection;
        };

        const fixedStep = () => {
            reconcileVolume();
            world.Step(FIXED_STEP, {
                velocityIterations: 8,
                positionIterations: 3,
                particleIterations: 5
            });
            stepSurfaceWaves();
        };

        const getSurfaceProfile = (requestedSamples = 128) => {
            const sampleCount = Math.round(clamp(Number(requestedSamples) || 128, 16, 512));
            const profile = new Float32Array(sampleCount);
            if (targetFillRatio <= 0) return profile;
            const edgeAttenuation = Math.min(1, targetFillRatio * 7, (1 - targetFillRatio) * 7);
            for (let index = 0; index < sampleCount; index += 1) {
                const sourcePosition = (index / (sampleCount - 1)) * (SURFACE_GRID_SIZE - 1);
                const left = Math.floor(sourcePosition);
                const right = Math.min(SURFACE_GRID_SIZE - 1, left + 1);
                const fraction = sourcePosition - left;
                const wave = surfaceDisplacement[left]
                    + ((surfaceDisplacement[right] - surfaceDisplacement[left]) * fraction);
                profile[index] = clamp(targetFillRatio + (wave * edgeAttenuation), 0, 1);
            }
            for (let pass = 0; pass < 2; pass += 1) {
                const correctedMean = profile.reduce((total, value) => total + value, 0) / sampleCount;
                const correction = targetFillRatio - correctedMean;
                for (let index = 0; index < sampleCount; index += 1) {
                    profile[index] = clamp(profile[index] + correction, 0, 1);
                }
            }
            return profile;
        };

        return {
            setWaveStyle,
            setTargetFill(value) {
                targetFillRatio = clamp(Number(value) || 0, 0, 1);
                targetCount = Math.round(targetFillRatio * maxParticles);
            },
            step(deltaSeconds = FIXED_STEP) {
                if (disposed) return;
                accumulator = Math.min(0.12, accumulator + clamp(Number(deltaSeconds) || 0, 0, 0.05));
                while (accumulator >= FIXED_STEP) {
                    fixedStep();
                    accumulator -= FIXED_STEP;
                }
            },
            getSurfaceHeight(xNormalized) {
                const x = clamp(Number(xNormalized) || 0, -1, 1) * HALF_WIDTH;
                const positions = particleSystem.GetPositionBuffer();
                const count = particleSystem.GetParticleCount();
                let surface = 0;
                for (let index = 0; index < count; index += 1) {
                    const point = positions[index];
                    if (point && Math.abs(point.x - x) < 0.22) surface = Math.max(surface, point.y + PARTICLE_RADIUS);
                }
                return clamp(surface / TANK_HEIGHT, 0, 1);
            },
            getSurfaceProfile,
            sampleVelocity(xNormalized, yNormalized) {
                const x = clamp(Number(xNormalized) || 0, -1, 1) * HALF_WIDTH;
                const y = clamp(Number(yNormalized) || 0, 0, 1) * TANK_HEIGHT;
                const positions = particleSystem.GetPositionBuffer();
                const velocities = particleSystem.GetVelocityBuffer();
                const count = particleSystem.GetParticleCount();
                let weightTotal = 0;
                let velocityX = 0;
                let velocityY = 0;
                for (let index = 0; index < count; index += 1) {
                    const point = positions[index];
                    const velocity = velocities[index];
                    if (!point || !velocity) continue;
                    const dx = point.x - x;
                    const dy = point.y - y;
                    const distanceSquared = (dx * dx) + (dy * dy);
                    if (distanceSquared > 0.22) continue;
                    const weight = 1 / (0.035 + distanceSquared);
                    weightTotal += weight;
                    velocityX += velocity.x * weight;
                    velocityY += velocity.y * weight;
                }
                if (!weightTotal) return { x: 0, y: 0 };
                return {
                    x: clamp((velocityX / weightTotal) / 3, -1, 1),
                    y: clamp((velocityY / weightTotal) / 3, -1, 1)
                };
            },
            disturb(xNormalized, strength = 0.25) {
                const x = clamp(Number(xNormalized) || 0, -1, 1) * HALF_WIDTH;
                const positions = particleSystem.GetPositionBuffer();
                const velocities = particleSystem.GetVelocityBuffer();
                const count = particleSystem.GetParticleCount();
                for (let index = 0; index < count; index += 1) {
                    const point = positions[index];
                    const velocity = velocities[index];
                    if (!point || !velocity) continue;
                    const distance = Math.abs(point.x - x);
                    if (distance < 0.42) velocity.y += (1 - (distance / 0.42)) * strength;
                }
                const center = Math.round(clamp((Number(xNormalized) + 1) * 0.5, 0, 1) * (SURFACE_GRID_SIZE - 1));
                const radius = waveStyle.impulseRadius;
                for (let offset = -radius; offset <= radius; offset += 1) {
                    const index = center + offset;
                    if (index <= 0 || index >= SURFACE_GRID_SIZE - 1) continue;
                    const envelope = Math.cos((Math.abs(offset) / radius) * Math.PI * 0.5);
                    surfaceVelocity[index] += envelope
                        * clamp(Number(strength) || 0.25, -1, 1)
                        * waveStyle.impulseGain;
                }
            },
            getSnapshot() {
                const source = particleSystem.GetPositionBuffer();
                const count = particleSystem.GetParticleCount();
                const positions = new Float32Array(count * 2);
                for (let index = 0; index < count; index += 1) {
                    const point = source[index];
                    positions[index * 2] = clamp(point.x / HALF_WIDTH, -1, 1);
                    positions[(index * 2) + 1] = clamp(point.y / TANK_HEIGHT, 0, 1);
                }
                return { particleCount: count, targetCount, positions };
            },
            dispose() {
                disposed = true;
                targetCount = 0;
            }
        };
    }

    const api = { createLiquidPhysics, createSeededRandom };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LessonFlowLiquidPhysics = Object.assign(root.LessonFlowLiquidPhysics || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
