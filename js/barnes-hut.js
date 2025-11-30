import { PHYSICS_CONSTANTS } from './constants.js';

class QuadTree {
    constructor(x, y, size) {
        this.x = x; // Center x
        this.y = y; // Center y
        this.size = size;
        this.mass = 0;
        this.centerX = 0; // Center of mass X
        this.centerY = 0; // Center of mass Y
        this.body = null;
        this.children = null; // [NW, NE, SW, SE]
    }

    insert(body) {
        // Calculate effective mass for gravity generation (handling Black Hole multiplier)
        let effectiveMass = body.mass;
        if (body.isBlackHole) {
            effectiveMass *= PHYSICS_CONSTANTS.BLACK_HOLE_GRAVITY_MULTIPLIER;
        }

        if (this.mass === 0) {
            this.body = body;
            this.mass = effectiveMass;
            this.centerX = body.x;
            this.centerY = body.y;
        } else {
            if (!this.children) this.subdivide();

            if (this.body) {
                const oldBody = this.body;
                this.body = null;
                this.insertToChild(oldBody);
            }
            this.insertToChild(body);

            // Update center of mass using effective mass
            const totalMass = this.mass + effectiveMass;
            this.centerX = (this.centerX * this.mass + body.x * effectiveMass) / totalMass;
            this.centerY = (this.centerY * this.mass + body.y * effectiveMass) / totalMass;
            this.mass = totalMass;
        }
    }

    subdivide() {
        const half = this.size / 2;
        const quarter = this.size / 4;
        this.children = [
            new QuadTree(this.x - quarter, this.y - quarter, half), // NW
            new QuadTree(this.x + quarter, this.y - quarter, half), // NE
            new QuadTree(this.x - quarter, this.y + quarter, half), // SW
            new QuadTree(this.x + quarter, this.y + quarter, half)  // SE
        ];
    }

    insertToChild(body) {
        const idx = (body.x > this.x ? 1 : 0) + (body.y > this.y ? 2 : 0);
        this.children[idx].insert(body);
    }
}

export function calculateGravityBarnesHut(bodies, gravity, dt, theta = 0.5) {
    const validBodies = bodies.filter(b => b.isValid);
    if (validBodies.length < 2) return bodies;

    // 1. Build QuadTree
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of validBodies) {
        if (b.x < minX) minX = b.x;
        if (b.x > maxX) maxX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.y > maxY) maxY = b.y;
    }

    const size = Math.max(maxX - minX, maxY - minY) * 1.1 || 1000;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const root = new QuadTree(centerX, centerY, size);
    for (const b of validBodies) {
        root.insert(b);
    }

    // 2. Calculate forces
    const G = gravity * PHYSICS_CONSTANTS.GRAVITY_MULTIPLIER;

    for (const body of validBodies) {
        const force = { fx: 0, fy: 0 };
        calculateForce(root, body, force, theta, G);

        body.vx += (force.fx / body.mass) * dt;
        body.vy += (force.fy / body.mass) * dt;

        // Speed limit
        const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
        if (speed > PHYSICS_CONSTANTS.MAX_SPEED) {
            const factor = PHYSICS_CONSTANTS.MAX_SPEED / speed;
            body.vx *= factor;
            body.vy *= factor;
        }
    }

    return validBodies;
}

function calculateForce(node, body, force, theta, G) {
    if (node.mass === 0) return;

    const dx = node.centerX - body.x;
    const dy = node.centerY - body.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq + PHYSICS_CONSTANTS.SOFTENING);

    // If leaf node or far enough
    if (!node.children || (node.size / dist < theta)) {
        if (node.body === body) return; // Self

        // node.mass already includes Black Hole multiplier if applicable
        const F = G * body.mass * node.mass / (dist * dist);
        force.fx += F * dx / dist;
        force.fy += F * dy / dist;
    } else {
        // Recurse
        for (const child of node.children) {
            calculateForce(child, body, force, theta, G);
        }
    }
}
