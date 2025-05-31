'use strict';

import { PHYSICS_CONSTANTS } from './constants.js';

/**
 * 重力計算と位置更新
 */
export function calculateGravity(bodies, gravity, dt, enableCollisions, handleCollisions) {
    try {
        const G = gravity * PHYSICS_CONSTANTS.GRAVITY_MULTIPLIER;
        const validBodies = bodies.filter(b => b.isValid);
        if (validBodies.length < 2) return validBodies;

        for (let i = 0; i < validBodies.length; i++) {
            let fx = 0, fy = 0;

            for (let j = 0; j < validBodies.length; j++) {
                if (i === j) continue;

                const dx = validBodies[j].x - validBodies[i].x;
                const dy = validBodies[j].y - validBodies[i].y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq + PHYSICS_CONSTANTS.SOFTENING);

                let effectiveG = G;
                if (validBodies[j].isBlackHole) {
                    effectiveG *= PHYSICS_CONSTANTS.BLACK_HOLE_GRAVITY_MULTIPLIER;
                }

                const F = effectiveG * validBodies[i].mass * validBodies[j].mass / (dist * dist);
                fx += F * dx / dist;
                fy += F * dy / dist;
            }

            validBodies[i].vx += (fx / validBodies[i].mass) * dt;
            validBodies[i].vy += (fy / validBodies[i].mass) * dt;

            const speed = Math.sqrt(validBodies[i].vx * validBodies[i].vx + validBodies[i].vy * validBodies[i].vy);
            if (speed > PHYSICS_CONSTANTS.MAX_SPEED) {
                const factor = PHYSICS_CONSTANTS.MAX_SPEED / speed;
                validBodies[i].vx *= factor;
                validBodies[i].vy *= factor;
            }
        }

        if (enableCollisions) {
            handleCollisions(validBodies);
        }

        return validBodies;

    } catch (err) {
        console.error('Gravity calculation error:', err);
        return bodies.filter(b => b.isValid);
    }
}

/**
 * エネルギー計算
 */
export function calculateEnergy(bodies, gravity) {
    try {
        const G = gravity * PHYSICS_CONSTANTS.GRAVITY_MULTIPLIER;
        let kinetic = 0, potential = 0;

        bodies.forEach(b => {
            if (!b.isValid) return;
            kinetic += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
        });

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                if (!bodies[i].isValid || !bodies[j].isValid) continue;
                const dx = bodies[j].x - bodies[i].x;
                const dy = bodies[j].y - bodies[i].y;
                const d = Math.sqrt(dx * dx + dy * dy) + 10;
                potential -= G * bodies[i].mass * bodies[j].mass / d;
            }
        }

        return (kinetic + potential) / 10000;
    } catch {
        return 0;
    }
}

/**
 * 天体衝突の検出と処理
 */
export function handleCollisions(bodies, collisionSensitivity, createCollisionEffect, time) {
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            if (!bodies[i].isValid || !bodies[j].isValid) continue;

            const dx = bodies[j].x - bodies[i].x;
            const dy = bodies[j].y - bodies[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const radius1 = Math.sqrt(bodies[i].mass) * 1.5;
            const radius2 = Math.sqrt(bodies[j].mass) * 1.5;
            const collisionDistance = (radius1 + radius2) * collisionSensitivity;

            if (distance < collisionDistance) {
                // 質量の大きい方を残す
                let survivor, victim;
                if (bodies[i].mass >= bodies[j].mass) {
                    survivor = bodies[i];
                    victim = bodies[j];
                } else {
                    survivor = bodies[j];
                    victim = bodies[i];
                }

                // 運動量保存の法則で新しい速度を計算
                const totalMass = survivor.mass + victim.mass;
                const newVx = (survivor.mass * survivor.vx + victim.mass * victim.vx) / totalMass;
                const newVy = (survivor.mass * survivor.vy + victim.mass * victim.vy) / totalMass;

                // 衝突による角運動量の計算
                const relativeVx = victim.vx - survivor.vx;
                const relativeVy = victim.vy - survivor.vy;
                const impactSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

                // 質量の重心で新しい位置を計算
                const newX = (survivor.mass * survivor.x + victim.mass * victim.x) / totalMass;
                const newY = (survivor.mass * survivor.y + victim.mass * victim.y) / totalMass;

                // 生存者の属性を更新
                survivor.x = newX;
                survivor.y = newY;
                survivor.vx = newVx;
                survivor.vy = newVy;
                survivor.mass = Math.min(totalMass, 400);
                survivor.trail = [];

                // 衝突エフェクト生成
                createCollisionEffect(newX, newY, survivor.color, victim.color);

                // 被害者を無効化
                victim.isValid = false;

                // 衝突時刻の記録
                survivor.lastCollisionTime = time;
                survivor.collisionImpactSpeed = impactSpeed;

                // 衝突による進化処理
                try {
                    survivor.handleCollisionEvolution(impactSpeed, totalMass);
                } catch (error) {
                    console.warn('Collision evolution failed:', error);
                }

                console.log(`天体衝突: 質量 ${survivor.mass.toFixed(1)}, 衝突速度 ${impactSpeed.toFixed(1)}`);
                return; // 1フレームに1回の衝突のみ処理
            }
        }
    }
}

/**
 * 重力場強度計算
 */
export function calculateGravityFieldStrength(x, y, bodies, gravity) {
    let totalFieldStrength = 0;
    const G = gravity * PHYSICS_CONSTANTS.GRAVITY_MULTIPLIER;

    for (let body of bodies) {
        if (!body.isValid) continue;

        const dx = x - body.x;
        const dy = y - body.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const bodyRadius = Math.sqrt(body.mass) * 1.5;
        const safeDistance = Math.max(distance, bodyRadius * 0.5);

        let effectiveG = G;
        let massMultiplier = 1;

        if (body.isBlackHole) {
            effectiveG *= PHYSICS_CONSTANTS.BLACK_HOLE_GRAVITY_MULTIPLIER;
            if (distance < body.eventHorizonRadius) {
                massMultiplier = 10;
            } else if (distance < body.eventHorizonRadius * 2) {
                const ratio = distance / body.eventHorizonRadius;
                massMultiplier = 1 + 9 * Math.exp(-(ratio - 1) * 3);
            }
        }

        const fieldStrength = (effectiveG * body.mass * massMultiplier) / (safeDistance * safeDistance);
        totalFieldStrength += fieldStrength;
    }

    return totalFieldStrength;
}
