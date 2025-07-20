'use strict';

/**
 * Level-of-Detail (LOD) システム
 * VISUAL_ANALYSIS_REPORT.md Phase 1の実装
 * パフォーマンス最適化のための描画品質制御
 */

/**
 * LODレベル定義
 */
export const LOD_LEVELS = {
    MINIMAL: {
        level: 0,
        name: 'minimal',
        particleCount: 0.1,
        effectQuality: 0.2,
        renderDistance: 50,
        features: {
            particles: false,
            trails: false,
            effects: false,
            coronas: false,
            magneticFields: false
        }
    },
    LOW: {
        level: 1,
        name: 'low',
        particleCount: 0.3,
        effectQuality: 0.4,
        renderDistance: 100,
        features: {
            particles: true,
            trails: true,
            effects: false,
            coronas: false,
            magneticFields: false
        }
    },
    MEDIUM: {
        level: 2,
        name: 'medium',
        particleCount: 0.6,
        effectQuality: 0.6,
        renderDistance: 200,
        features: {
            particles: true,
            trails: true,
            effects: true,
            coronas: true,
            magneticFields: false
        }
    },
    HIGH: {
        level: 3,
        name: 'high',
        particleCount: 0.8,
        effectQuality: 0.8,
        renderDistance: 400,
        features: {
            particles: true,
            trails: true,
            effects: true,
            coronas: true,
            magneticFields: true
        }
    },
    ULTRA: {
        level: 4,
        name: 'ultra',
        particleCount: 1.0,
        effectQuality: 1.0,
        renderDistance: 800,
        features: {
            particles: true,
            trails: true,
            effects: true,
            coronas: true,
            magneticFields: true
        }
    }
};

/**
 * LODシステムクラス
 */
export class LODSystem {
    constructor() {
        this.currentLOD = LOD_LEVELS.HIGH;
        this.autoAdjust = true;
        this.performanceHistory = [];
        this.maxHistoryLength = 60; // 1秒分のフレーム履歴
        this.adjustmentCooldown = 0;
        this.adjustmentInterval = 60; // 1秒間隔で調整
        
        // パフォーマンス閾値
        this.thresholds = {
            targetFPS: 55,
            lowFPS: 45,
            highFPS: 58,
            criticalFPS: 30
        };
        
        // デバッグ情報
        this.debugMode = false;
        this.lastAdjustment = Date.now();
        
        console.log('🎚️ LODシステム初期化完了');
    }
    
    /**
     * フレーム性能の記録
     */
    recordPerformance(fps, frameTime, complexity) {
        this.performanceHistory.push({
            fps: fps,
            frameTime: frameTime,
            complexity: complexity,
            timestamp: Date.now()
        });
        
        // 履歴の制限
        if (this.performanceHistory.length > this.maxHistoryLength) {
            this.performanceHistory.shift();
        }
        
        // 自動調整
        if (this.autoAdjust) {
            this.adjustmentCooldown--;
            if (this.adjustmentCooldown <= 0) {
                this.autoAdjustLOD();
                this.adjustmentCooldown = this.adjustmentInterval;
            }
        }
    }
    
    /**
     * LODレベルの自動調整
     */
    autoAdjustLOD() {
        if (this.performanceHistory.length < 30) return; // 十分な履歴が必要
        
        const recentPerformance = this.performanceHistory.slice(-30);
        const avgFPS = recentPerformance.reduce((sum, p) => sum + p.fps, 0) / recentPerformance.length;
        const minFPS = Math.min(...recentPerformance.map(p => p.fps));
        
        const oldLevel = this.currentLOD.level;
        
        // 性能に基づくLODレベル調整
        if (minFPS < this.thresholds.criticalFPS) {
            // 緊急時：最低品質に下げる
            this.setLODLevel(LOD_LEVELS.MINIMAL);
            if (this.debugMode) console.log(`🚨 緊急LOD調整: ${oldLevel} → ${this.currentLOD.level} (FPS: ${minFPS.toFixed(1)})`);
        } else if (avgFPS < this.thresholds.lowFPS) {
            // 低性能：品質を下げる
            this.decreaseLOD();
            if (this.debugMode) console.log(`⬇️ LOD品質低下: ${oldLevel} → ${this.currentLOD.level} (平均FPS: ${avgFPS.toFixed(1)})`);
        } else if (avgFPS > this.thresholds.highFPS && minFPS > this.thresholds.targetFPS) {
            // 高性能：品質を上げる
            this.increaseLOD();
            if (this.debugMode) console.log(`⬆️ LOD品質向上: ${oldLevel} → ${this.currentLOD.level} (平均FPS: ${avgFPS.toFixed(1)})`);
        }
        
        if (oldLevel !== this.currentLOD.level) {
            this.lastAdjustment = Date.now();
        }
    }
    
    /**
     * LODレベルの向上
     */
    increaseLOD() {
        const levels = Object.values(LOD_LEVELS);
        const currentIndex = levels.findIndex(l => l.level === this.currentLOD.level);
        if (currentIndex < levels.length - 1) {
            this.currentLOD = levels[currentIndex + 1];
            return true;
        }
        return false;
    }
    
    /**
     * LODレベルの低下
     */
    decreaseLOD() {
        const levels = Object.values(LOD_LEVELS);
        const currentIndex = levels.findIndex(l => l.level === this.currentLOD.level);
        if (currentIndex > 0) {
            this.currentLOD = levels[currentIndex - 1];
            return true;
        }
        return false;
    }
    
    /**
     * 特定のLODレベルに設定
     */
    setLODLevel(lodLevel) {
        this.currentLOD = lodLevel;
    }
    
    /**
     * 距離ベースのLOD判定
     */
    getDistanceBasedLOD(object, viewCenter, canvas) {
        const distance = Math.sqrt(
            (object.x - viewCenter.x) ** 2 + 
            (object.y - viewCenter.y) ** 2
        );
        
        const maxDistance = Math.max(canvas.width, canvas.height);
        const normalizedDistance = distance / maxDistance;
        
        // 距離に基づくLODレベル
        if (normalizedDistance > 0.8) return LOD_LEVELS.MINIMAL;
        if (normalizedDistance > 0.6) return LOD_LEVELS.LOW;
        if (normalizedDistance > 0.4) return LOD_LEVELS.MEDIUM;
        if (normalizedDistance > 0.2) return LOD_LEVELS.HIGH;
        return LOD_LEVELS.ULTRA;
    }
    
    /**
     * オブジェクトサイズベースのLOD判定
     */
    getSizeBasedLOD(objectSize, canvas) {
        const screenSize = Math.max(canvas.width, canvas.height);
        const sizeRatio = objectSize / screenSize;
        
        if (sizeRatio < 0.01) return LOD_LEVELS.MINIMAL;
        if (sizeRatio < 0.02) return LOD_LEVELS.LOW;
        if (sizeRatio < 0.05) return LOD_LEVELS.MEDIUM;
        if (sizeRatio < 0.1) return LOD_LEVELS.HIGH;
        return LOD_LEVELS.ULTRA;
    }
    
    /**
     * 複合LOD判定（距離・サイズ・グローバル品質）
     */
    calculateLOD(object, viewCenter, canvas) {
        const distanceLOD = this.getDistanceBasedLOD(object, viewCenter, canvas);
        const sizeLOD = this.getSizeBasedLOD(object.radius || 10, canvas);
        const globalLOD = this.currentLOD;
        
        // 最も低い品質レベルを採用（保守的アプローチ）
        const minLevel = Math.min(distanceLOD.level, sizeLOD.level, globalLOD.level);
        
        return Object.values(LOD_LEVELS).find(lod => lod.level === minLevel);
    }
    
    /**
     * パーティクル数の制限計算
     */
    limitParticleCount(requestedCount, lodLevel = this.currentLOD) {
        return Math.floor(requestedCount * lodLevel.particleCount);
    }
    
    /**
     * エフェクト品質の計算
     */
    getEffectQuality(lodLevel = this.currentLOD) {
        return lodLevel.effectQuality;
    }
    
    /**
     * 機能の有効/無効判定
     */
    isFeatureEnabled(featureName, lodLevel = this.currentLOD) {
        return lodLevel.features[featureName] || false;
    }
    
    /**
     * レンダリング距離の制限
     */
    getRenderDistance(lodLevel = this.currentLOD) {
        return lodLevel.renderDistance;
    }
    
    /**
     * カリング判定（描画スキップ）
     */
    shouldCull(object, viewCenter, canvas, lodLevel = null) {
        const actualLOD = lodLevel || this.calculateLOD(object, viewCenter, canvas);
        const distance = Math.sqrt(
            (object.x - viewCenter.x) ** 2 + 
            (object.y - viewCenter.y) ** 2
        );
        
        return distance > actualLOD.renderDistance;
    }
    
    /**
     * 複雑度の計算
     */
    calculateComplexity(bodies, particles, specialEvents) {
        let complexity = 0;
        
        // 天体の複雑度
        complexity += bodies.length * 1.0;
        
        // パーティクルの複雑度
        complexity += (particles || 0) * 0.1;
        
        // 特殊イベントの複雑度
        complexity += (specialEvents || 0) * 2.0;
        
        return complexity;
    }
    
    /**
     * パフォーマンス統計の取得
     */
    getPerformanceStats() {
        if (this.performanceHistory.length === 0) return null;
        
        const recent = this.performanceHistory.slice(-30);
        const avgFPS = recent.reduce((sum, p) => sum + p.fps, 0) / recent.length;
        const minFPS = Math.min(...recent.map(p => p.fps));
        const maxFPS = Math.max(...recent.map(p => p.fps));
        const avgFrameTime = recent.reduce((sum, p) => sum + p.frameTime, 0) / recent.length;
        
        return {
            avgFPS: avgFPS.toFixed(1),
            minFPS: minFPS.toFixed(1),
            maxFPS: maxFPS.toFixed(1),
            avgFrameTime: avgFrameTime.toFixed(2),
            currentLOD: this.currentLOD.name,
            adjustmentCount: this.performanceHistory.length,
            lastAdjustment: this.lastAdjustment
        };
    }
    
    /**
     * デバッグ情報の取得
     */
    getDebugInfo() {
        const stats = this.getPerformanceStats();
        
        return {
            ...stats,
            autoAdjust: this.autoAdjust,
            thresholds: this.thresholds,
            features: this.currentLOD.features,
            particleMultiplier: this.currentLOD.particleCount,
            effectQuality: this.currentLOD.effectQuality,
            renderDistance: this.currentLOD.renderDistance
        };
    }
    
    /**
     * 設定の更新
     */
    updateSettings(settings) {
        if (settings.autoAdjust !== undefined) this.autoAdjust = settings.autoAdjust;
        if (settings.debugMode !== undefined) this.debugMode = settings.debugMode;
        if (settings.targetFPS !== undefined) this.thresholds.targetFPS = settings.targetFPS;
        if (settings.lodLevel !== undefined) {
            const level = Object.values(LOD_LEVELS).find(l => l.name === settings.lodLevel);
            if (level) this.setLODLevel(level);
        }
    }
}

// グローバルインスタンス
export const lodSystem = new LODSystem();