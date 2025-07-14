'use strict';

import { PERFORMANCE_CONFIG } from './constants.js';

/**
 * モバイルデバイス検出とパフォーマンス最適化
 */
export class MobileOptimization {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isTablet = this.detectTablet();
        this.isTouchDevice = this.detectTouch();
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.isLowPowerMode = this.detectLowPowerMode();
        
        // デバイスに応じた最適化設定
        this.optimizationConfig = this.getOptimizationConfig();
        
        console.log('📱 デバイス情報:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            isTouchDevice: this.isTouchDevice,
            devicePixelRatio: this.devicePixelRatio,
            isLowPowerMode: this.isLowPowerMode,
            optimizationConfig: this.optimizationConfig
        });
        
        this.initializeOptimizations();
    }
    
    detectMobile() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = [
            'mobile', 'android', 'iphone', 'ipod', 'blackberry',
            'windows phone', 'opera mini', 'webos'
        ];
        
        return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
               window.innerWidth <= 767;
    }
    
    detectTablet() {
        const userAgent = navigator.userAgent.toLowerCase();
        const tabletKeywords = ['ipad', 'tablet', 'kindle'];
        
        return tabletKeywords.some(keyword => userAgent.includes(keyword)) ||
               (window.innerWidth >= 768 && window.innerWidth <= 1023 && this.isTouchDevice);
    }
    
    detectTouch() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 || 
               navigator.msMaxTouchPoints > 0;
    }
    
    detectLowPowerMode() {
        // バッテリーAPI利用可能な場合は低電力モードを検出
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                if (battery.level < 0.2) {
                    this.isLowPowerMode = true;
                    console.log('🔋 低バッテリー検出 - パフォーマンス最適化を強化');
                    this.applyLowPowerOptimizations();
                }
            }).catch(() => {
                console.log('バッテリー情報取得不可');
            });
        }
        
        // メモリ制限による推定
        if (performance.memory && performance.memory.usedJSHeapSize) {
            const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
            return memoryMB > 50; // 50MB以上使用時は低電力モードとみなす
        }
        
        return false;
    }
    
    getOptimizationConfig() {
        if (this.isMobile) {
            return {
                ...PERFORMANCE_CONFIG.MOBILE_OPTIMIZATION,
                renderScale: this.devicePixelRatio > 1 ? 0.75 : 1,
                updateFrequency: 60,
                particleQuality: 0.6,
                trailQuality: 0.7,
                effectQuality: 0.5
            };
        } else if (this.isTablet) {
            return {
                MAX_PARTICLES: 250,
                TRAIL_LIMIT: 25,
                UPDATE_INTERVAL: 1,
                GRAVITY_FIELD_SKIP: 1,
                renderScale: 0.9,
                updateFrequency: 60,
                particleQuality: 0.8,
                trailQuality: 0.85,
                effectQuality: 0.7
            };
        } else {
            return {
                ...PERFORMANCE_CONFIG.DESKTOP_OPTIMIZATION,
                renderScale: 1,
                updateFrequency: 60,
                particleQuality: 1,
                trailQuality: 1,
                effectQuality: 1
            };
        }
    }
    
    initializeOptimizations() {
        // キャンバス解像度の最適化
        this.optimizeCanvasResolution();
        
        // タッチイベントの最適化
        if (this.isTouchDevice) {
            this.optimizeTouchEvents();
        }
        
        // レンダリング最適化
        this.optimizeRendering();
        
        // メモリ管理の最適化
        this.optimizeMemoryManagement();
    }
    
    optimizeCanvasResolution() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;
        
        const scale = this.optimizationConfig.renderScale;
        const rect = canvas.getBoundingClientRect();
        
        // 高DPIディスプレイでの解像度調整
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        
        console.log(`🖼️ キャンバス解像度最適化: ${canvas.width}x${canvas.height} (scale: ${scale})`);
    }
    
    optimizeTouchEvents() {
        // passive リスナーでスクロール性能向上
        const passiveEvents = ['touchstart', 'touchmove', 'touchend'];
        
        passiveEvents.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                // 必要に応じてタッチイベントの処理を最適化
            }, { passive: true });
        });
        
        // タッチ遅延の削除
        if ('touchstart' in window) {
            const metaTag = document.createElement('meta');
            metaTag.name = 'viewport';
            metaTag.content = 'width=device-width, initial-scale=1.0, user-scalable=no, touch-action=manipulation';
            document.head.appendChild(metaTag);
        }
        
        console.log('👆 タッチイベント最適化完了');
    }
    
    optimizeRendering() {
        // requestAnimationFrame の最適化
        this.frameSkipCounter = 0;
        this.originalRequestAnimationFrame = window.requestAnimationFrame;
        
        if (this.isMobile && this.optimizationConfig.updateFrequency < 60) {
            const targetInterval = 1000 / this.optimizationConfig.updateFrequency;
            let lastTime = 0;
            
            window.requestAnimationFrame = (callback) => {
                const now = Date.now();
                if (now - lastTime >= targetInterval) {
                    lastTime = now;
                    return this.originalRequestAnimationFrame(callback);
                } else {
                    return setTimeout(() => callback(now), targetInterval - (now - lastTime));
                }
            };
            
            console.log(`🎯 フレームレート制限: ${this.optimizationConfig.updateFrequency}fps`);
        }
    }
    
    optimizeMemoryManagement() {
        // 自動ガベージコレクション（可能な場合）
        if (window.gc && this.isMobile) {
            this.gcInterval = setInterval(() => {
                if (performance.memory && performance.memory.usedJSHeapSize > 30 * 1024 * 1024) {
                    window.gc();
                    console.log('🗑️ 手動ガベージコレクション実行');
                }
            }, 30000); // 30秒ごと
        }
        
        // メモリ使用量監視
        if (performance.memory) {
            this.memoryCheckInterval = setInterval(() => {
                const memoryMB = performance.memory.usedJSHeapSize / (1024 * 1024);
                const memoryLimit = this.isMobile ? 50 : 100;
                
                if (memoryMB > memoryLimit) {
                    console.warn(`💾 メモリ使用量警告: ${memoryMB.toFixed(1)}MB (制限: ${memoryLimit}MB)`);
                    this.triggerMemoryOptimization();
                }
            }, 10000); // 10秒ごと
        }
    }
    
    applyLowPowerOptimizations() {
        this.optimizationConfig = {
            ...this.optimizationConfig,
            MAX_PARTICLES: Math.floor(this.optimizationConfig.MAX_PARTICLES * 0.5),
            TRAIL_LIMIT: Math.floor(this.optimizationConfig.TRAIL_LIMIT * 0.5),
            updateFrequency: 30,
            particleQuality: 0.3,
            trailQuality: 0.4,
            effectQuality: 0.2
        };
        
        console.log('🔋 低電力モード最適化適用');
    }
    
    triggerMemoryOptimization() {
        // カスタムイベントを発火してメモリ最適化を要求
        const event = new CustomEvent('memoryOptimizationRequired', {
            detail: {
                isMobile: this.isMobile,
                currentMemory: performance.memory ? performance.memory.usedJSHeapSize : 0
            }
        });
        window.dispatchEvent(event);
    }
    
    getParticleLimit() {
        return this.optimizationConfig.MAX_PARTICLES;
    }
    
    getTrailLimit() {
        return this.optimizationConfig.TRAIL_LIMIT;
    }
    
    getUpdateInterval() {
        return this.optimizationConfig.UPDATE_INTERVAL;
    }
    
    getRenderQuality() {
        return {
            particles: this.optimizationConfig.particleQuality,
            trails: this.optimizationConfig.trailQuality,
            effects: this.optimizationConfig.effectQuality
        };
    }
    
    shouldSkipFrame(frameCount) {
        if (!this.isMobile) return false;
        
        const skipInterval = this.optimizationConfig.UPDATE_INTERVAL;
        return frameCount % skipInterval !== 0;
    }
    
    adjustForOrientation() {
        if (!this.isMobile) return;
        
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // ランドスケープモードでは若干パフォーマンスを上げる
            this.optimizationConfig.MAX_PARTICLES = Math.floor(this.optimizationConfig.MAX_PARTICLES * 1.2);
        } else {
            // ポートレートモードでは控えめに
            this.optimizationConfig.MAX_PARTICLES = Math.floor(this.optimizationConfig.MAX_PARTICLES * 0.9);
        }
    }
    
    cleanup() {
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
        }
        
        if (this.memoryCheckInterval) {
            clearInterval(this.memoryCheckInterval);
        }
        
        if (this.originalRequestAnimationFrame) {
            window.requestAnimationFrame = this.originalRequestAnimationFrame;
        }
    }
}

// シングルトンインスタンス
export const mobileOptimization = new MobileOptimization();