import { DEFAULT_CONFIG, GRAPHICS_CONFIG } from './constants.js';
import { ParticleSystem } from './particles.js';
import { SpecialEventsManager } from './specialEvents.js';
import { BodyLauncher } from './body-launcher.js';
import { BodyRenderer } from './body-renderer.js';
import { performanceMonitor } from './performance.js';
import { calculateGravity, handleOptimizedCollisions } from './physics.js';
import { calculateGravityBarnesHut } from './barnes-hut.js';
import { mobileOptimization } from './mobile-optimization.js';
import {
    getDynamicBodyRenderer,
    drawBackground,
    calculateAndDrawGravityField,
    setVisualQuality,
    handleCanvasResize
} from './graphics.js';

export class Simulation {
    constructor(canvas, ctx, uiCallbacks = {}) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.uiCallbacks = uiCallbacks; // { onUpdateDisplay, onUpdateFPS, onError }

        this.bodies = [];
        this.isRunning = false;
        this.animationId = null;
        this.time = 0;

        // Config
        this.config = { ...DEFAULT_CONFIG };

        // Worker Initialization
        try {
            this.worker = new Worker('js/physics-worker.js', { type: 'module' });
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                this.isPhysicsProcessing = false;
            };
            this.isPhysicsProcessing = false;

            this.worker.postMessage({
                type: 'init',
                payload: { width: canvas.width, height: canvas.height }
            });
        } catch (e) {
            console.error('Failed to initialize worker:', e);
            this.worker = null;
        }

        // Systems
        this.particleSystem = new ParticleSystem();
        this.specialEvents = new SpecialEventsManager();
        this.bodyLauncher = new BodyLauncher(canvas, ctx);
        this.bodyRenderer = new BodyRenderer();
        this.dynamicBodyRenderer = getDynamicBodyRenderer(ctx);

        // State
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        this.currentFps = 60;

        // Bind animate to this
        this.animate = this.animate.bind(this);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    reset() {
        this.stop();
        this.bodies = [];
        this.time = 0;
        this.frameCount = 0;
        this.particleSystem.clear();
        this.specialEvents.reset();

        // Reset performance monitor
        performanceMonitor.reset();

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        drawBackground(this.ctx, this.canvas);

        if (this.uiCallbacks.onUpdateDisplay) {
            this.uiCallbacks.onUpdateDisplay();
        }
    }

    handleResize() {
        handleCanvasResize(this.canvas);
        // if (this.worker) {
        //     this.worker.postMessage({
        //         type: 'resize',
        //         payload: { width: this.canvas.width, height: this.canvas.height }
        //     });
        // }
    }

    animate() {
        if (!this.isRunning) return;

        try {
            // Mobile optimization frame skip
            this.frameCount++;
            if (mobileOptimization.shouldSkipFrame(this.frameCount)) {
                this.animationId = requestAnimationFrame(this.animate);
                return;
            }

            // Background
            // ★ 修正：背景描画時にコンテキストをリセットしない（drawBackground内で制御）
            drawBackground(this.ctx, this.canvas);

            // Performance monitoring
            performanceMonitor.monitorPerformance();
            performanceMonitor.updateAdaptiveQuality();
            performanceMonitor.handleEmergencyTrailReset(this.bodies);

            // Gravity field
            if (this.config.SHOW_GRAVITY_FIELD && performanceMonitor.optimizationLevel < 4) {
                const gravityFieldCanvas = calculateAndDrawGravityField(
                    this.canvas,
                    this.bodies,
                    this.config.GRAVITY,
                    this.config.SHOW_GRAVITY_FIELD
                );
                if (gravityFieldCanvas) {
                    this.ctx.globalAlpha = 1.0;
                    this.ctx.drawImage(gravityFieldCanvas, 0, 0);
                }
            }

            // Ensure particle system on bodies
            this.bodies.forEach(body => {
                if (!body.particleSystem) {
                    body.particleSystem = this.particleSystem;
                }
            });

            // Physics (Web Worker)
            const dt = this.config.TIME_STEP * this.config.SPEED;

            if (this.worker) {
                if (!this.isPhysicsProcessing) {
                    this.isPhysicsProcessing = true;

                    // Track IDs sent to worker to handle synchronization correctly
                    this.sentBodyIds = new Set(this.bodies.map(b => b.id));

                    // Prepare payload (strip circular deps)
                    const bodiesPayload = this.bodies.map(b => ({
                        id: b.id,
                        x: b.x, y: b.y,
                        vx: b.vx, vy: b.vy,
                        mass: b.mass,
                        type: b.type,
                        isValid: b.isValid,
                        isBlackHole: b.isBlackHole,
                        eventHorizonRadius: b.eventHorizonRadius,
                        // Essential properties for evolution system
                        magneticField: b.magneticField,
                        pulsarAge: b.pulsarAge,
                        rotationPeriod: b.rotationPeriod,
                        beamRotation: b.beamRotation,
                        rotation: b.rotation,
                        temperature: b.temperature,
                        stellarClass: b.stellarClass,
                        evolutionStage: b.evolutionStage,
                        stellarAge: b.stellarAge,
                        color: b.color
                    }));

                    this.worker.postMessage({
                        type: 'step',
                        payload: {
                            bodies: bodiesPayload,
                            gravity: this.config.GRAVITY,
                            dt: dt,
                            enableCollisions: this.config.ENABLE_COLLISIONS,
                            collisionSensitivity: this.config.COLLISION_SENSITIVITY,
                            time: this.time
                        }
                    });
                }
            } else {
                // Fallback to main thread physics
                if (this.bodies.length > 50) {
                    calculateGravityBarnesHut(this.bodies, this.config.GRAVITY, dt);
                    if (this.config.ENABLE_COLLISIONS) {
                        this.handleCollisionsWrapper(this.bodies);
                    }
                } else {
                    calculateGravity(this.bodies, this.config.GRAVITY, dt, this.config.ENABLE_COLLISIONS, this.handleCollisionsWrapper.bind(this));
                }
            }

            // Dynamic Body Renderer
            if (!this.dynamicBodyRenderer) {
                this.dynamicBodyRenderer = getDynamicBodyRenderer(this.ctx);
            }
            this.dynamicBodyRenderer.update(this.config.TIME_STEP * 1000);

            // Render Bodies
            // ★ 追加：天体描画前に加算合成をリセット（念のため）
            this.ctx.globalCompositeOperation = 'source-over';
            this.renderBodies();

            // Special Events
            this.specialEvents.update(this.bodies, this.time, this.ctx, this.canvas);

            // Body Launcher (only when stopped, but animate runs when running... wait, simulator.js logic: if (!isRunning) bodyLauncher.render(bodies))
            // But animate() only runs if isRunning is true. 
            // Ah, simulator.js might have had a loop that runs even if paused? 
            // Checking simulator.js: function animate() { if (!isRunning) return; ... }
            // So bodyLauncher.render(bodies) inside animate() was unreachable if !isRunning?
            // Let's check simulator.js again.

            // Particle System Update
            if (this.particleSystem) {
                // ★ 追加：パーティクル描画時は加算合成を有効化
                this.ctx.globalCompositeOperation = 'lighter';
                this.particleSystem.update(this.ctx);
                this.ctx.globalCompositeOperation = 'source-over'; // 戻す

                const baseMaxParticles = performanceMonitor.getMaxParticles();
                const mobileMaxParticles = mobileOptimization.getParticleLimit();
                const maxParticles = Math.min(baseMaxParticles, mobileMaxParticles);
                this.particleSystem.limitParticles(maxParticles);
            }

            // Debug info for Black Holes
            const blackHoles = this.bodies.filter(body => body.type === 'blackHole');
            if (blackHoles.length > 0 && Math.floor(this.time * 60) % 180 === 0) {
                // Debug log
            }

            this.time += dt;

            // UI Updates
            if (this.uiCallbacks.onUpdateDisplay) this.uiCallbacks.onUpdateDisplay();
            this.updateFPS();

            // Periodic checks
            this.performPeriodicChecks();

            this.animationId = requestAnimationFrame(this.animate);

        } catch (error) {
            console.error('Animation error:', error);
            if (this.uiCallbacks.onError) this.uiCallbacks.onError('アニメーションエラーが発生しました。');

            try {
                performanceMonitor.resetOptimization();
            } catch (e) { }

            this.stop();
        }
    }

    renderBodies() {
        this.bodies.forEach(body => {
            body.update(this.config.TIME_STEP * this.config.SPEED, this.config.SHOW_TRAILS, this.config.TRAIL_LENGTH, this.canvas);

            if (body.type === 'blackHole') {
                this.renderBlackHole(body);
            } else if (this.dynamicBodyRenderer && ['pulsar', 'neutronStar'].includes(body.type)) {
                if (body.type === 'pulsar') this.dynamicBodyRenderer.renderPulsar(this.ctx, body);
                else if (body.type === 'neutronStar') this.dynamicBodyRenderer.renderNeutronStar(this.ctx, body);
            } else if (this.dynamicBodyRenderer && (body.type === 'star' || (body.mass > 50 && body.stellarProperties))) {
                this.dynamicBodyRenderer.renderStar(this.ctx, body);
            } else {
                this.bodyRenderer.draw(this.ctx, body, this.config.SHOW_TRAILS);
            }
        });
    }

    renderBlackHole(body) {
        try {
            if (this.dynamicBodyRenderer && typeof this.dynamicBodyRenderer.renderBlackHole === 'function') {
                this.dynamicBodyRenderer.renderBlackHole(this.ctx, body);
            } else {
                // Fallback
                this.bodyRenderer.draw(this.ctx, body, this.config.SHOW_TRAILS);
            }
        } catch (error) {
            this.bodyRenderer.draw(this.ctx, body, this.config.SHOW_TRAILS);
        }
    }

    updateFPS() {
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = now;
            if (this.uiCallbacks.onUpdateFPS) this.uiCallbacks.onUpdateFPS(this.currentFps);
        }
    }

    performPeriodicChecks() {
        // Memory check
        if (Math.floor(this.time * 60) % 300 === 0) {
            if (performanceMonitor.checkMemoryUsage()) {
                performanceMonitor.applyTrailOptimization(this.bodies, 0.5);
                const maxParticles = Math.max(50, 300 - 100);
                this.particleSystem.limitParticles(maxParticles);
            }
        }

        // Periodic reset
        if (Math.floor(this.time * 60) % 1800 === 0) {
            const currentOptLevel = performanceMonitor.optimizationLevel;
            if (currentOptLevel > 2) {
                try {
                    performanceMonitor.resetOptimization();
                    this.bodies.forEach(body => {
                        if (body.trail.length > this.config.TRAIL_LENGTH * 2) {
                            body.trail = body.trail.slice(-this.config.TRAIL_LENGTH);
                        }
                    });
                    const qualityLevel = this.currentFps > 45 ? 1.0 : (this.currentFps > 30 ? 0.7 : 0.5);
                    setVisualQuality(qualityLevel);
                    this.particleSystem.setQualityLevel(qualityLevel);
                } catch (error) {
                    try { performanceMonitor.lightReset(); } catch (e) { }
                }
            }
        }
    }

    handleCollisionsWrapper(validBodies) {
        const collisionCallback = (x, y, color1, color2, energy = 1) => {
            if (!this.particleSystem) return;

            try {
                if (typeof this.particleSystem.createCollisionEffect === 'function') {
                    this.particleSystem.createCollisionEffect(x, y, color1, color2, energy);
                }
                if (energy > 50 && typeof this.particleSystem.createAdvancedEffect === 'function') {
                    this.particleSystem.createAdvancedEffect('energy_burst', x, y, energy / 100);
                }
            } catch (error) {
                console.warn('Collision effect error:', error);
            }
        };

        return handleOptimizedCollisions(validBodies, this.config.COLLISION_SENSITIVITY, collisionCallback, this.time);
    }

    handleWorkerMessage(e) {
        if (e.data.error) {
            console.error('Worker error:', e.data.error);
            this.isPhysicsProcessing = false;
            return;
        }

        const { bodies: workerBodies, events } = e.data;

        // Create a map of returned bodies for O(1) lookup
        const workerBodyMap = new Map(workerBodies.map(b => [b.id, b]));

        // Update existing bodies and remove those that are missing from worker response
        // BUT only if they were actually sent to the worker.
        this.bodies = this.bodies.filter(body => {
            if (workerBodyMap.has(body.id)) {
                // Update body properties from worker
                // ★ 修正：Object.assignを使用せず、物理演算結果のみを反映する
                // これにより、メインスレッドで行われた天体進化（type変更など）が上書きされるのを防ぐ
                const workerBody = workerBodyMap.get(body.id);
                body.x = workerBody.x;
                body.y = workerBody.y;
                body.vx = workerBody.vx;
                body.vy = workerBody.vy;
                body.mass = workerBody.mass;

                // 衝突関連のプロパティ更新
                if (workerBody.isValid !== undefined) body.isValid = workerBody.isValid;
                if (workerBody.lastCollisionTime !== undefined) body.lastCollisionTime = workerBody.lastCollisionTime;
                if (workerBody.collisionImpactSpeed !== undefined) body.collisionImpactSpeed = workerBody.collisionImpactSpeed;

                return true;
            } else {
                // Body is missing from worker response.
                // If it was sent to worker, it means it was destroyed (e.g. collision). Remove it.
                // If it was NOT sent to worker, it means it's a new body added locally. Keep it.
                if (this.sentBodyIds && this.sentBodyIds.has(body.id)) {
                    return false; // Destroyed
                } else {
                    return true; // New body, keep it
                }
            }
        });

        // Handle events
        if (events) {
            events.forEach(event => {
                if (event.type === 'collision') {
                    if (this.particleSystem) {
                        this.particleSystem.createCollisionEffect(event.x, event.y, event.color1, event.color2, event.energy);
                    }
                }
            });
        }

        this.isPhysicsProcessing = false;
    }
}
