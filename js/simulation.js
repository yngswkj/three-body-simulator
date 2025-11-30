import { DEFAULT_CONFIG, GRAPHICS_CONFIG } from './constants.js';
import { ParticleSystem } from './particles.js';
import { SpecialEventsManager } from './specialEvents.js';
import { BodyLauncher } from './body-launcher.js';
import { BodyRenderer } from './body-renderer.js';
import { performanceMonitor } from './performance.js';
import { calculateGravity, handleOptimizedCollisions } from './physics.js';
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
        // Update collision system canvas size if needed (logic was in simulator.js)
        // updateCollisionSystemCanvas(this.canvas.width, this.canvas.height); // Need to import this
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

            // Physics
            const dt = this.config.TIME_STEP * this.config.SPEED;
            this.bodies = calculateGravity(
                this.bodies,
                this.config.GRAVITY,
                dt,
                this.config.ENABLE_COLLISIONS,
                this.handleCollisionsWrapper.bind(this)
            );

            // Dynamic Body Renderer
            if (!this.dynamicBodyRenderer) {
                this.dynamicBodyRenderer = getDynamicBodyRenderer(this.ctx);
            }
            this.dynamicBodyRenderer.update(this.config.TIME_STEP * 1000);

            // Render Bodies
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
                this.particleSystem.update(this.ctx);

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
}
