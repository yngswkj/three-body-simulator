import { calculateGravity, initializeOptimizedCollisionSystem, updateCollisionSystemCanvas, handleOptimizedCollisions } from './physics.js';
import { calculateGravityBarnesHut } from './barnes-hut.js';

self.onmessage = function (e) {
    const { type, payload } = e.data;

    if (type === 'init') {
        const { width, height } = payload;
        initializeOptimizedCollisionSystem(width, height);
    } else if (type === 'resize') {
        const { width, height } = payload;
        updateCollisionSystemCanvas(width, height);
    } else if (type === 'step') {
        const { bodies, gravity, dt, enableCollisions, collisionSensitivity, time } = payload;

        const events = [];
        const collisionCallback = (x, y, color1, color2, energy) => {
            events.push({ type: 'collision', x, y, color1, color2, energy });
        };

        const handleCollisionsWrapper = (validBodies) => {
            handleOptimizedCollisions(validBodies, collisionSensitivity, collisionCallback, time);
        };

        try {
            let updatedBodies;
            // Use Barnes-Hut algorithm for large number of bodies
            if (bodies.length > 50) {
                updatedBodies = calculateGravityBarnesHut(bodies, gravity, dt);
                if (enableCollisions) {
                    handleCollisionsWrapper(updatedBodies);
                }
            } else {
                updatedBodies = calculateGravity(bodies, gravity, dt, enableCollisions, handleCollisionsWrapper);
            }

            self.postMessage({ bodies: updatedBodies, events });
        } catch (error) {
            console.error('Worker physics error:', error);
            self.postMessage({ error: error.message });
        }
    }
};
