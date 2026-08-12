import * as core from '@box2d/core';
import '@box2d/particles/dist/particles/src/index.js';
import * as particles from '@box2d/particles/dist/particles/src/index.js';

export const {
    b2BodyDef,
    b2BodyType,
    b2EdgeShape,
    b2PolygonShape,
    b2Vec2,
    b2World
} = core;

export const {
    b2ParticleDef,
    b2ParticleFlag,
    b2ParticleSystemDef
} = particles;
