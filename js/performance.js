'use strict';

import { PERFORMANCE_CONFIG } from './constants.js';

export class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastFpsCheck = Date.now();
        this.currentFps = 60;
        this.fpsHistory = [];
        this.lowFpsCount = 0;
        this.optimizationActive = false;
        this.optimizationLevel = 0;
        this.consecutiveLowFps = 0;
        this.lastOptimizationTime = 0;
        this.trailRenderQuality = 1.0;
        this.startTime = Date.now();
        this.isInitializing = true;
        this.stabilizationPeriod = 3000; // ★ 追加：安定化期間（3秒）
        this.emergencyResetCount = 0; // ★ 追加：緊急リセット回数追跡
    }

    monitorPerformance() {
        this.frameCount++;
        const now = Date.now();

        // ★ 修正：初期化期間と安定化期間を分離
        const timeSinceStart = now - this.startTime;
        if (timeSinceStart < PERFORMANCE_CONFIG.INITIALIZATION_PERIOD) {
            this.isInitializing = true;
            if (now - this.lastFpsCheck >= 1000) {
                this.currentFps = this.frameCount;
                this.frameCount = 0;
                this.lastFpsCheck = now;
                console.log(`🔄 初期化中 (残り${Math.ceil((PERFORMANCE_CONFIG.INITIALIZATION_PERIOD - timeSinceStart) / 1000)}秒): FPS ${this.currentFps}`);
            }
            return;
        } else if (this.isInitializing) {
            this.isInitializing = false;
            console.log('✅ パフォーマンス監視初期化完了 - 安定化期間開始');
        }

        // 1秒ごとにFPSを計算
        if (now - this.lastFpsCheck >= 1000) {
            this.currentFps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsCheck = now;

            // ★ 修正：安定化期間中はFPS履歴に追加するが最適化は行わない
            const isStabilizing = timeSinceStart < (PERFORMANCE_CONFIG.INITIALIZATION_PERIOD + this.stabilizationPeriod);

            if (isStabilizing) {
                // 安定化期間中：履歴のみ蓄積、極端に低いFPSは除外
                if (this.currentFps > 20) { // 極端に低いFPS（20未満）は除外
                    this.fpsHistory.push(this.currentFps);
                    if (this.fpsHistory.length > 10) {
                        this.fpsHistory.shift();
                    }
                }
                console.log(`📊 安定化中 (残り${Math.ceil((PERFORMANCE_CONFIG.INITIALIZATION_PERIOD + this.stabilizationPeriod - timeSinceStart) / 1000)}秒): FPS ${this.currentFps} (履歴${this.fpsHistory.length}個)`);
            } else {
                // 通常期間：FPS履歴を保持し最適化判定を実行
                this.fpsHistory.push(this.currentFps);
                if (this.fpsHistory.length > 10) {
                    this.fpsHistory.shift();
                }

                // 十分な履歴が蓄積されてからパフォーマンス最適化を開始
                if (this.fpsHistory.length >= PERFORMANCE_CONFIG.MIN_HISTORY_LENGTH) {
                    this.optimizePerformance();
                }
            }
        }
    }

    optimizePerformance() {
        if (this.isInitializing) return;

        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        const now = Date.now();

        // 連続低FPS検出
        const currentIsLow = this.currentFps < PERFORMANCE_CONFIG.TARGET_FPS;
        const averageIsLow = avgFps < PERFORMANCE_CONFIG.TARGET_FPS;

        if (currentIsLow && averageIsLow) {
            this.consecutiveLowFps++;
        } else if (!currentIsLow && !averageIsLow) {
            this.consecutiveLowFps = Math.max(0, this.consecutiveLowFps - 1);
        }

        // ★ 修正：緊急最適化の条件をより厳格に
        const emergencyCondition = avgFps < PERFORMANCE_CONFIG.EMERGENCY_FPS &&
            this.currentFps < PERFORMANCE_CONFIG.EMERGENCY_FPS &&
            this.consecutiveLowFps >= 3; // 3回連続に変更

        if (emergencyCondition) {
            this.executeEmergencyOptimization();
            return;
        }

        // 段階的最適化
        if (now - this.lastOptimizationTime > 3000) {
            if (this.consecutiveLowFps >= 3 && averageIsLow) {
                this.activateNextOptimizationLevel(avgFps);
            } else if (this.optimizationActive && avgFps > PERFORMANCE_CONFIG.TARGET_FPS + 5) {
                this.relaxOptimization();
            }
            this.lastOptimizationTime = now;
        }
    }

    executeEmergencyOptimization() {
        this.emergencyResetCount++;
        console.warn(`🚨 緊急最適化発動！ FPSが極端に低下しています (${this.emergencyResetCount}回目)`);
        this.optimizationLevel = 4;
        this.optimizationActive = true;
        this.trailRenderQuality = 0.1;

        // ★ 復活：緊急時の軌跡リセット機能
        this.triggerEmergencyTrailReset();
    }

    // ★ 復活：緊急時軌跡リセット機能
    triggerEmergencyTrailReset() {
        // グローバルなbodies配列にアクセスできないため、フラグを設定
        this.emergencyTrailResetRequested = true;
        console.warn('🧹 緊急軌跡リセット要求 - メインループで処理されます');
    }

    // ★ 追加：メインループから呼び出される緊急リセット処理
    handleEmergencyTrailReset(bodies) {
        if (this.emergencyTrailResetRequested) {
            bodies.forEach(body => {
                if (body && body.trail) {
                    body.trail = [];
                }
            });
            this.emergencyTrailResetRequested = false;
            console.warn('🧹 緊急軌跡リセット実行完了');
        }
    }

    activateNextOptimizationLevel(avgFps) {
        let targetLevel = 0;
        if (avgFps < 40) targetLevel = 4;
        else if (avgFps < 45) targetLevel = 3;
        else if (avgFps < 50) targetLevel = 2;
        else if (avgFps < 55) targetLevel = 1;

        if (targetLevel > this.optimizationLevel) {
            this.optimizationLevel = targetLevel;
            this.optimizationActive = true;
            this.applyOptimizationLevel(targetLevel);
            console.log(`📈 最適化レベル ${targetLevel} 発動 - FPS: ${avgFps.toFixed(1)}`);
        }
    }

    applyOptimizationLevel(level) {
        const qualityMap = [1.0, 0.8, 0.6, 0.4, 0.2];
        this.trailRenderQuality = qualityMap[level];
    }

    relaxOptimization() {
        if (this.optimizationLevel > 0) {
            this.optimizationLevel--;
            if (this.optimizationLevel === 0) {
                this.optimizationActive = false;
                this.trailRenderQuality = 1.0;
                console.log('📉 パフォーマンス最適化解除');
            } else {
                this.applyOptimizationLevel(this.optimizationLevel);
                console.log(`📉 最適化レベル ${this.optimizationLevel} に緩和`);
            }
        }
    }

    updateAdaptiveQuality() {
        if (this.optimizationActive) {
            if (this.currentFps < PERFORMANCE_CONFIG.CRITICAL_FPS) {
                this.trailRenderQuality = Math.max(0.1, this.trailRenderQuality - 0.05);
            } else if (this.currentFps > PERFORMANCE_CONFIG.TARGET_FPS) {
                const qualityMap = [1.0, 0.8, 0.6, 0.4, 0.2];
                const targetQuality = qualityMap[this.optimizationLevel];
                this.trailRenderQuality = Math.min(targetQuality, this.trailRenderQuality + 0.02);
            }
        }
    }

    checkMemoryUsage() {
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
            if (memoryUsage > PERFORMANCE_CONFIG.MEMORY_LIMIT_MB) {
                console.warn(`💾 高メモリ使用量検出: ${memoryUsage.toFixed(1)}MB`);
                return true;
            }
        }
        return false;
    }

    getMaxParticles() {
        return this.optimizationActive ?
            PERFORMANCE_CONFIG.OPTIMIZATION_LEVELS[this.optimizationLevel] :
            PERFORMANCE_CONFIG.MAX_PARTICLES;
    }

    // 軌跡削減関数群
    applyTrailOptimization(bodies, targetReduction = 0.8) {
        bodies.forEach(body => {
            if (body.trail && body.trail.length > body.trail.length * targetReduction) {
                const targetLength = Math.floor(body.trail.length * targetReduction);
                body.trail = this.adaptiveTrailReduction(body.trail, targetLength);
            }
        });
    }

    adaptiveTrailReduction(trail, targetLength) {
        if (trail.length <= targetLength) return trail;

        const reducedTrail = [];
        const recentCount = Math.floor(targetLength / 3);
        const recentTrail = trail.slice(-recentCount);
        const oldTrail = trail.slice(0, -recentCount);
        const oldTargetCount = targetLength - recentCount;

        for (let i = 0; i < oldTargetCount; i++) {
            const index = Math.floor(i * (oldTrail.length / oldTargetCount));
            if (oldTrail[index]) {
                reducedTrail.push(oldTrail[index]);
            }
        }

        return [...reducedTrail, ...recentTrail];
    }

    // ★ 追加：パフォーマンス統計取得
    getPerformanceStats() {
        const avgFps = this.fpsHistory.length > 0 ?
            (this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length).toFixed(1) : 'N/A';

        return {
            currentFps: this.currentFps,
            avgFps: avgFps,
            optimizationLevel: this.optimizationLevel,
            optimizationActive: this.optimizationActive,
            trailQuality: this.trailRenderQuality.toFixed(2),
            emergencyResets: this.emergencyResetCount,
            consecutiveLowFps: this.consecutiveLowFps
        };
    }

    /**
     * ★ 追加：最適化状態を完全リセット
     */
    resetOptimization() {
        console.log('🔄 パフォーマンス最適化状態をリセット中...');

        // 最適化レベルをリセット
        this.optimizationLevel = 0;
        this.optimizationActive = false;

        // 描画品質をリセット
        this.trailRenderQuality = 1.0;
        this.particleRenderQuality = 1.0;
        this.effectQuality = 1.0;

        // FPS監視をリセット
        this.fpsHistory = [];
        this.averageFps = 60;
        this.lowFpsCount = 0;
        this.lastOptimizationTime = 0;

        // メモリ使用量をリセット
        this.memoryPressure = 0;
        this.lastGCTime = 0;

        // 軌跡最適化をリセット
        this.originalTrailLength = null;
        this.trailOptimizationApplied = false;

        // パーティクル制限をリセット
        this.maxParticles = PERFORMANCE_CONFIG.MAX_PARTICLES;

        // 緊急モードをリセット
        this.emergencyMode = false;
        this.emergencyModeStartTime = 0;

        // 統計情報をリセット
        this.optimizationCount = 0;
        this.totalOptimizationTime = 0;

        console.log('✅ パフォーマンス最適化状態をリセット完了');

        // リセット完了を外部に通知
        this.dispatchResetEvent();
    }

    /**
     * ★ 追加：リセット完了イベントの発火
     */
    dispatchResetEvent() {
        try {
            const event = new CustomEvent('performanceReset', {
                detail: {
                    timestamp: Date.now(),
                    previousOptimizationLevel: this.optimizationLevel,
                    resetSuccess: true
                }
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.warn('リセットイベント発火エラー:', error);
        }
    }

    /**
     * ★ 追加：現在の最適化状態を取得
     */
    getOptimizationStatus() {
        return {
            level: this.optimizationLevel,
            active: this.optimizationActive,
            trailQuality: this.trailRenderQuality,
            particleQuality: this.particleRenderQuality,
            effectQuality: this.effectQuality,
            averageFps: this.averageFps,
            maxParticles: this.maxParticles,
            emergencyMode: this.emergencyMode,
            memoryPressure: this.memoryPressure
        };
    }

    /**
     * ★ 追加：軽量リセット（レベルのみリセット）
     */
    lightReset() {
        console.log('🔄 軽量リセット実行中...');

        this.optimizationLevel = Math.max(0, this.optimizationLevel - 1);
        this.trailRenderQuality = Math.min(1.0, this.trailRenderQuality + 0.2);
        this.particleRenderQuality = Math.min(1.0, this.particleRenderQuality + 0.2);
        this.effectQuality = Math.min(1.0, this.effectQuality + 0.2);

        if (this.optimizationLevel === 0) {
            this.optimizationActive = false;
            this.trailRenderQuality = 1.0;
            this.particleRenderQuality = 1.0;
            this.effectQuality = 1.0;
        }

        console.log(`軽量リセット完了 - 最適化レベル: ${this.optimizationLevel}`);
    }

    /**
     * ★ 追加：緊急モード強制解除
     */
    forceExitEmergencyMode() {
        if (this.emergencyMode) {
            console.log('🚨 緊急モード強制解除');
            this.emergencyMode = false;
            this.emergencyModeStartTime = 0;
            this.optimizationLevel = Math.max(0, this.optimizationLevel - 2);

            if (this.optimizationLevel === 0) {
                this.resetOptimization();
            }
        }
    }
}

// シングルトンインスタンスをエクスポート
export const performanceMonitor = new PerformanceMonitor();
