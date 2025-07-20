'use strict';

import { performanceMonitor } from './js/performance.js';
import {
    calculateGravity,
    calculateEnergy,
    handleCollisions as physicsHandleCollisions,
    initializeOptimizedCollisionSystem,
    updateCollisionSystemCanvas,
    handleOptimizedCollisions,
    getCollisionPerformanceStats
} from './js/physics.js';
import {
    initializeTooltip,
    hideTooltip,
    findBodyAt,
    handleMouseMove,
    handleStart,
    handleMove,
    handleEnd,
    showError,
    updateDisplay as uiUpdateDisplay,
    initializeWelcomeModal,
    uiState
} from './js/ui.js';
import {
    drawBackground,
    setupGravityFieldCanvas,
    calculateAndDrawGravityField,
    handleCanvasResize,
    getDynamicBodyRenderer,
    setVisualQuality
} from './js/graphics.js';
import { ParticleSystem } from './js/particles.js';
import { Body } from './js/body.js';
import { SpecialEventsManager } from './js/specialEvents.js';
import { mobileOptimization } from './js/mobile-optimization.js';
import { BodyLauncher } from './js/body-launcher.js';

// グローバル変数
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bodies = [];
let isRunning = false;
let animationId = null;
let time = 0;

// シミュレーションパラメータ
let timeStep = 0.016;
let speed = 1.0;
let gravity = 150;

// 軌跡表示用パラメータとエラーカウント
let trailLength = 30;
let showTrails = true;
let errorCount = 0;

// 衝突判定フラグ
let enableCollisions = true;
let collisionSensitivity = 0.5;

// 重力場可視化関連
let showGravityField = false;

// FPS計測用変数
let frameCount = 0;
let lastFpsUpdate = Date.now();
let currentFps = 60;

// パーティクルシステム（統合版）
const particleSystem = new ParticleSystem();

// 動的天体レンダラー
let dynamicBodyRenderer = null;

// ★ 追加：特殊イベントマネージャー
const specialEvents = new SpecialEventsManager();

// ★ 追加：天体射出システム
const bodyLauncher = new BodyLauncher(canvas, ctx);

// 現在のプリセットを記憶
let currentPresetType = null;

/**
 * キャンバスサイズ設定
 */
function resizeCanvas() {
    try {
        const container = canvas.parentElement;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;

        if (canvas.width !== newWidth || canvas.height !== newHeight) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            handleCanvasResize(canvas);
            // ★ 最適化衝突システムのキャンバスサイズ更新
            updateCollisionSystemCanvas(newWidth, newHeight);
        }
    } catch (error) {
        console.warn('Canvas resize error:', error);
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ★ 最適化された衝突処理のラッパー関数
function handleCollisionsWrapper(validBodies) {
    const collisionCallback = (x, y, color1, color2, energy = 1) => {
        if (!particleSystem) return;
        
        try {
            // 従来の衝突エフェクト（エネルギー値を渡す）
            if (typeof particleSystem.createCollisionEffect === 'function') {
                particleSystem.createCollisionEffect(x, y, color1, color2, energy);
            }
            
            // 高度なエネルギーバーストエフェクト
            if (energy > 50 && typeof particleSystem.createAdvancedEffect === 'function') {
                particleSystem.createAdvancedEffect('energy_burst', x, y, energy / 100);
            }
        } catch (error) {
            console.warn('衝突エフェクト生成エラー:', error);
        }
    };
    
    // ★ 最適化された衝突処理を使用
    return handleOptimizedCollisions(validBodies, collisionSensitivity, collisionCallback, time);
}

/**
 * FPS更新（確実に表示されるよう改善）
 */
function updateFPS() {
    frameCount++;
    const now = Date.now();

    if (now - lastFpsUpdate >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;

        // ★ 修正：FPS表示を確実に更新
        const fpsElement = document.getElementById('fpsDisplay');
        if (fpsElement) {
            fpsElement.textContent = currentFps;
            // ★ 追加：低FPS時の警告色
            if (currentFps < 30) {
                fpsElement.style.color = '#ff6b6b';
                fpsElement.style.borderColor = 'rgba(255, 107, 107, 0.5)';
            } else if (currentFps < 45) {
                fpsElement.style.color = '#ff9500';
                fpsElement.style.borderColor = 'rgba(255, 149, 0, 0.5)';
            } else {
                fpsElement.style.color = '#4ecdc4';
                fpsElement.style.borderColor = 'rgba(78, 205, 196, 0.3)';
            }
        }
    }
}

/**
 * メインアニメーションループ
 */
function animate() {
    if (!isRunning) return;

    try {
        // ★ 追加：モバイル最適化によるフレームスキップ
        frameCount++;
        if (mobileOptimization.shouldSkipFrame(frameCount)) {
            animationId = requestAnimationFrame(animate);
            return;
        }

        // 背景描画
        drawBackground(ctx, canvas);

        // パフォーマンス監視
        performanceMonitor.monitorPerformance();
        performanceMonitor.updateAdaptiveQuality();

        // 緊急軌跡リセット処理
        performanceMonitor.handleEmergencyTrailReset(bodies);

        // 重力場描画
        if (showGravityField && performanceMonitor.optimizationLevel < 4) {
            const gravityFieldCanvas = calculateAndDrawGravityField(canvas, bodies, gravity, showGravityField);
            if (gravityFieldCanvas) {
                ctx.globalAlpha = 1.0;
                ctx.drawImage(gravityFieldCanvas, 0, 0);
            }
        }

        // ★ 追加：パーティクルシステムが設定されていない天体をチェック・修正
        bodies.forEach(body => {
            if (!body.particleSystem) {
                body.particleSystem = particleSystem;
                console.log(`天体 ${body.getTypeNameJapanese()} にパーティクルシステムを後付け設定`);
            }
        });

        // 物理計算
        const dt = timeStep * speed;
        bodies = calculateGravity(bodies, gravity, dt, enableCollisions, handleCollisionsWrapper);

        // 動的天体描画システムの準備
        if (!dynamicBodyRenderer) {
            dynamicBodyRenderer = getDynamicBodyRenderer(ctx);
        }
        
        // 時間更新（アニメーションのため）- 1回のみ実行
        dynamicBodyRenderer.update(timeStep * 1000);
        
        // 天体更新・描画（強化版）
        bodies.forEach(body => {
            body.update(dt, showTrails, trailLength, canvas);
            
            // 天体タイプに応じた高度な描画
            if (body.type === 'blackHole') {
                try {
                    // ★ 高度レンダラーに戻す
                    const useAdvancedRenderer = true; // サイズ修正完了のため高度レンダラーを使用
                    
                    if (useAdvancedRenderer && dynamicBodyRenderer && typeof dynamicBodyRenderer.renderBlackHole === 'function') {
                        // console.log(`🖤 ブラックホール描画開始: 質量=${body.mass}, 事象の地平線=${body.eventHorizonRadius}`);
                        dynamicBodyRenderer.renderBlackHole(ctx, body);
                        // console.log(`✅ ブラックホール描画完了`);
                    } else {
                        // console.log(`🔧 フォールバック描画使用: 質量=${body.mass}, 元の半径=${body.eventHorizonRadius}`);
                        // フォールバック：シンプルなブラックホール描画
                        // ★ 設定：ブラックホールのサイズを大幅拡大
                        const radius = body.eventHorizonRadius || Math.max(50, Math.sqrt(body.mass) * 8);
                        // console.log(`📏 描画半径: ${radius} (元=${body.eventHorizonRadius}, 基準=${baseRadius})`);
                        
                        // 降着円盤
                        for (let ring = 1; ring <= 3; ring++) {
                            const ringRadius = radius * (2 + ring * 0.5);
                            ctx.strokeStyle = `rgba(255, 150, 50, ${0.3 / ring})`;
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.arc(body.x, body.y, ringRadius, 0, Math.PI * 2);
                            ctx.stroke();
                        }
                        
                        // 事象の地平線
                        ctx.fillStyle = '#000000';
                        ctx.beginPath();
                        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // 境界
                        ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                } catch (error) {
                    console.error('ブラックホール描画エラー:', error);
                    // エラー時のフォールバック描画
                    body.draw(ctx, showTrails);
                }
            } else if (body.type === 'pulsar' || body.type === 'neutronStar' || body.type === 'whiteDwarf') {
                // 特殊天体は動的レンダラーで描画
                switch (body.type) {
                    case 'pulsar':
                        dynamicBodyRenderer.renderPulsar(ctx, body);
                        break;
                    case 'neutronStar':
                        dynamicBodyRenderer.renderNeutronStar(ctx, body);
                        break;
                    default:
                        body.draw(ctx, showTrails);
                        break;
                }
            } else if (body.type === 'planetSystem') {
                // 惑星系は従来の描画方法を使用
                body.draw(ctx, showTrails);
            } else if (body.type === 'star' || (body.mass > 50 && body.stellarProperties)) {
                // 明示的に恒星として設定された天体、または恒星プロパティを持つ大質量天体
                dynamicBodyRenderer.renderStar(ctx, body);
            } else {
                // 通常描画
                body.draw(ctx, showTrails);
            }
        });

        // ★ 削除：重複描画を除去（dynamic-bodies.jsで既に描画済み）
        // drawEinsteinRings(ctx, bodies);

        // ★ 追加：特殊イベントの更新と描画（シミュレーション時間を渡す）
        specialEvents.update(bodies, time, ctx, canvas);

        // ★ 追加：射出システムの描画（停止中のみ）
        if (!isRunning) {
            bodyLauncher.render(bodies);
        }

        // パーティクル管理（安全性チェック）
        if (particleSystem && typeof particleSystem.update === 'function') {
            try {
                particleSystem.update(ctx);
            } catch (error) {
                console.warn('パーティクルシステム更新エラー:', error);
            }
        }

        // パーティクル数制限（モバイル最適化適用）
        if (particleSystem && typeof particleSystem.limitParticles === 'function') {
            const baseMaxParticles = performanceMonitor.getMaxParticles();
            const mobileMaxParticles = mobileOptimization.getParticleLimit();
            const maxParticles = Math.min(baseMaxParticles, mobileMaxParticles);
            particleSystem.limitParticles(maxParticles);
        }

        // ★ 追加：ブラックホールのデバッグ情報（パーティクルシステム状態も含む）
        const blackHoles = bodies.filter(body => body.type === 'blackHole');
        if (blackHoles.length > 0 && Math.floor(time * 60) % 180 === 0) { // 3秒ごと
            blackHoles.forEach(bh => {
                console.log(`ブラックホール状態: 質量=${bh.mass.toFixed(1)}, 事象の地平線=${bh.eventHorizonRadius?.toFixed(1) || 'undefined'}, パーティクルシステム=${!!bh.particleSystem}, アインシュタインリング有効`);
            });
        }

        time += dt;
        updateDisplay();
        updateFPS();
        updatePerformanceStats();

        // 定期的なメモリチェック
        if (Math.floor(time * 60) % 300 === 0) {
            if (performanceMonitor.checkMemoryUsage()) {
                performanceMonitor.applyTrailOptimization(bodies, 0.5);
                const maxParticles = Math.max(50, 300 - 100);
                particleSystem.limitParticles(maxParticles);
            }
        }

        // ★ 修正：定期的な完全リセットの実行
        if (Math.floor(time * 60) % 1800 === 0) { // 30秒ごと
            const currentOptLevel = performanceMonitor.optimizationLevel;
            if (currentOptLevel > 2) {
                console.log(`定期リセット実行: 最適化レベル ${currentOptLevel} → 0`);
                try {
                    performanceMonitor.resetOptimization();
                    // 軌跡も完全にクリア
                    bodies.forEach(body => {
                        if (body.trail.length > trailLength * 2) {
                            body.trail = body.trail.slice(-trailLength);
                        }
                    });
                    
                    // ビジュアルエフェクト品質調整
                    const qualityLevel = currentFps > 45 ? 1.0 : (currentFps > 30 ? 0.7 : 0.5);
                    setVisualQuality(qualityLevel);
                    particleSystem.setQualityLevel(qualityLevel);
                    
                } catch (error) {
                    console.warn('定期リセットでエラーが発生:', error);
                    // エラーが発生しても軽量リセットを試行
                    try {
                        performanceMonitor.lightReset();
                    } catch (lightResetError) {
                        console.warn('軽量リセットも失敗:', lightResetError);
                    }
                }
            }
        }

        animationId = requestAnimationFrame(animate);

    } catch (error) {
        console.error('Animation error:', error);
        showError('アニメーションエラーが発生しました。');

        // ★ 修正：エラー時もパフォーマンス監視をリセット
        try {
            performanceMonitor.resetOptimization();
        } catch (resetError) {
            console.warn('エラー時のパフォーマンスリセットに失敗:', resetError);
        }

        stopSimulation();
    }
}

/**
 * 表示更新のラッパー
 */
function updateDisplay() {
    try {
        // ★ 修正：特殊イベント統計の取得時にエラーハンドリング追加
        let eventStats = {};
        if (specialEvents && typeof specialEvents.getEventStats === 'function') {
            eventStats = specialEvents.getEventStats();
        } else {
            console.warn('特殊イベントシステムが正しく初期化されていません');
            eventStats = {
                totalEvents: 0,
                eventTypes: {},
                rareEvents: 0,
                legendaryEvents: 0
            };
        }

        uiUpdateDisplay(bodies, time, () => calculateEnergy(bodies, gravity), eventStats);
    } catch (error) {
        console.error('updateDisplay error:', error);
        // フォールバック: 統計なしで表示更新
        uiUpdateDisplay(bodies, time, () => calculateEnergy(bodies, gravity), {
            totalEvents: 0,
            eventTypes: {},
            rareEvents: 0,
            legendaryEvents: 0
        });
    }
}

/**
 * シミュレーション停止
 */
function stopSimulation() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    const btn = document.getElementById('playPause');
    if (btn) {
        btn.textContent = '開始';
        btn.classList.remove('active');
    }
}

// コントロール
function toggleSimulation() {
    isRunning = !isRunning;
    const btn = document.getElementById('playPause');
    const mobileBtn = document.getElementById('playPauseMobile');
    
    const buttonText = isRunning ? '停止' : '開始';
    if (btn) {
        btn.textContent = buttonText;
        btn.classList.toggle('active', isRunning);
    }
    if (mobileBtn) {
        mobileBtn.textContent = buttonText;
        mobileBtn.classList.toggle('active', isRunning);
    }
    
    if (isRunning) {
        // ★ 追加：シミュレーション開始時にドラッグ履歴をクリア
        bodies.forEach(body => {
            body.wasDragged = false;
            body.dragArrow = null; // ★ 追加：矢印エフェクト情報をクリア
        });
        animate();
    }
}

document.getElementById('playPause')?.addEventListener('click', toggleSimulation);
document.getElementById('playPauseMobile')?.addEventListener('click', toggleSimulation);

function resetSimulation() {
    if (currentPresetType) {
        setPreset(currentPresetType);
    } else {
        bodies.forEach(body => {
            body.vx = 0;
            body.vy = 0;
            body.trail = [];
            body.isValid = true;
            body.wasDragged = false; // ★ 追加：ドラッグ履歴をクリア
            body.dragArrow = null; // ★ 追加：矢印エフェクト情報をクリア
        });
        particleSystem.clear();
        time = 0;
        errorCount = 0;

        // ★ 修正：エラーハンドリングを追加
        try {
            performanceMonitor.resetOptimization();
            console.log('パフォーマンス最適化レベルをリセットしました');
        } catch (error) {
            console.warn('パフォーマンス最適化リセットでエラーが発生:', error);
            // リセットに失敗してもシミュレーションは続行
        }

        // ★ 追加：特殊イベント統計もリセット
        specialEvents.resetStats();
        
        // ★ 追加：射出システムもリセット
        bodyLauncher.resetAllLaunches();

        updateDisplay();

        if (!isRunning) {
            drawBackground(ctx, canvas);
            bodies.forEach(body => {
                if (body.isValid) {
                    body.draw(ctx, showTrails);
                }
            });
            bodyLauncher.render(bodies);
        }
    }

    // シミュレーションをリセットしました（最適化レベル・イベント統計も初期化）
}

document.getElementById('reset')?.addEventListener('click', resetSimulation);
document.getElementById('resetMobile')?.addEventListener('click', resetSimulation);

function clearSimulation() {
    currentPresetType = null;
    bodies = [];
    particleSystem.clear();
    time = 0;
    errorCount = 0;

    // ★ 修正：エラーハンドリングを追加
    try {
        performanceMonitor.resetOptimization();
        console.log('パフォーマンス最適化レベルをリセットしました');
    } catch (error) {
        console.warn('パフォーマンス最適化リセットでエラーが発生:', error);
        // リセットに失敗してもシミュレーションは続行
    }

    // ★ 追加：特殊イベント統計もリセット
    specialEvents.resetStats();
    
    // ★ 追加：射出システムもリセット
    bodyLauncher.resetAllLaunches();

    updateDisplay();
    drawBackground(ctx, canvas);
    
    // ★ 追加：停止状態での矢印エフェクト表示
    bodies.forEach(body => {
        if (body.isValid) {
            body.draw(ctx, showTrails);
        }
    });
    bodyLauncher.render(bodies);

    // 天体をクリアしました（最適化レベル・イベント統計も初期化）
}

document.getElementById('clear')?.addEventListener('click', clearSimulation);
document.getElementById('clearMobile')?.addEventListener('click', clearSimulation);

// スライダー
document.getElementById('speedSlider')?.addEventListener('input', (e) => {
    speed = parseFloat(e.target.value);
    const speedValue = document.getElementById('speedValue');
    if (speedValue) speedValue.textContent = speed.toFixed(1);
});

document.getElementById('gravitySlider')?.addEventListener('input', (e) => {
    gravity = parseInt(e.target.value);
    const gravityValue = document.getElementById('gravityValue');
    if (gravityValue) gravityValue.textContent = gravity;
});

document.getElementById('trailSlider')?.addEventListener('input', (e) => {
    trailLength = parseInt(e.target.value);
    const trailValue = document.getElementById('trailValue');
    if (trailValue) trailValue.textContent = trailLength;

    if (performanceMonitor.optimizationActive) {
        performanceMonitor.originalTrailLength = trailLength;
        console.log(`軌跡長変更: ${trailLength} (最適化中)`);
    }

    if (trailLength > 500) {
        const qualityReduction = Math.min(0.8, (trailLength - 500) / 1000);
        performanceMonitor.trailRenderQuality = Math.max(0.2, 1.0 - qualityReduction);
        console.log(`高軌跡長 ${trailLength} - 品質を ${performanceMonitor.trailRenderQuality.toFixed(2)} に予防調整`);
    } else if (!performanceMonitor.optimizationActive) {
        performanceMonitor.trailRenderQuality = 1.0;
    }
});

document.getElementById('trailToggle')?.addEventListener('click', () => {
    showTrails = !showTrails;
    const btn = document.getElementById('trailToggle');
    if (btn) {
        btn.classList.toggle('active', showTrails);
        btn.textContent = showTrails ? '軌跡表示' : '軌跡非表示';
    }

    if (!showTrails) {
        bodies.forEach(body => body.trail = []);
    }
});

// ★ 統一された衝突判定切り替え関数
function toggleCollision() {
    enableCollisions = !enableCollisions;
    const btn = document.getElementById('collisionToggle');
    const mobileBtn = document.getElementById('collisionToggleMobile');
    
    const buttonText = enableCollisions ? '衝突有効' : '衝突無効';
    
    if (btn) {
        btn.classList.toggle('active', enableCollisions);
        btn.textContent = buttonText;
    }
    if (mobileBtn) {
        mobileBtn.classList.toggle('active', enableCollisions);
        mobileBtn.textContent = buttonText;
    }
    
    console.log(`衝突判定: ${enableCollisions ? '有効' : '無効'}`);
}

// ★ 統一された重力場表示切り替え関数
function toggleGravityField() {
    showGravityField = !showGravityField;
    const btn = document.getElementById('gravityFieldToggle');
    const mobileBtn = document.getElementById('gravityFieldToggleMobile');
    
    const buttonText = showGravityField ? '重力場表示' : '重力場非表示';
    
    if (btn) {
        btn.classList.toggle('active', showGravityField);
        btn.textContent = buttonText;
    }
    if (mobileBtn) {
        mobileBtn.classList.toggle('active', showGravityField);
        mobileBtn.textContent = buttonText;
    }
    
    console.log(`重力場表示: ${showGravityField ? '有効' : '無効'}`);
}

// イベントリスナーの設定
document.getElementById('collisionToggle')?.addEventListener('click', toggleCollision);
document.getElementById('collisionToggleMobile')?.addEventListener('click', toggleCollision);

document.getElementById('gravityFieldToggle')?.addEventListener('click', toggleGravityField);
document.getElementById('gravityFieldToggleMobile')?.addEventListener('click', toggleGravityField);

document.getElementById('collisionSensitivitySlider')?.addEventListener('input', (e) => {
    collisionSensitivity = parseFloat(e.target.value);
    const sensitivityValue = document.getElementById('collisionSensitivityValue');
    if (sensitivityValue) sensitivityValue.textContent = collisionSensitivity.toFixed(1);
});

// プリセット
function setPreset(type) {
    try {
        currentPresetType = type;
        bodies = [];
        particleSystem.clear();
        time = 0;
        errorCount = 0;

        // ★ 修正：エラーハンドリングを追加
        try {
            performanceMonitor.resetOptimization();
            console.log('パフォーマンス最適化レベルをリセットしました');
        } catch (error) {
            console.warn('パフォーマンス最適化リセットでエラーが発生:', error);
            // リセットに失敗してもプリセット設定は続行
        }

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        switch (type) {
            case 'binary':
                // ★ 修正：異なる恒星タイプの連星系
                const mass1 = 35 + Math.random() * 30; // G/F型星（質量35-65）
                const mass2 = 15 + Math.random() * 25; // K/M型星（質量15-40）
                bodies.push(new Body(cx - 40, cy, 30, 30, mass1, particleSystem));
                bodies.push(new Body(cx + 40, cy, -30, -30, mass2, particleSystem));
                break;

            case 'triangle':
                const r = 120;
                for (let i = 0; i < 3; i++) {
                    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    const vx = -35 * Math.sin(angle);
                    const vy = 35 * Math.cos(angle);
                    // ★ 修正：多様な恒星タイプ
                    const mass = [25, 45, 70][i] + Math.random() * 15;
                    bodies.push(new Body(x, y, vx, vy, mass, particleSystem));
                }
                break;

            case 'figure_eight':
                // ★ 修正：8の字軌道も異なる恒星タイプで
                const masses = [30, 50, 120].map(m => m + Math.random() * 20);
                bodies.push(new Body(cx, cy, 25, 38, masses[0], particleSystem));
                bodies.push(new Body(cx - 180, cy, -12.5, -19, masses[1], particleSystem));
                bodies.push(new Body(cx + 180, cy, -12.5, -19, masses[2], particleSystem));
                break;

            case 'random':
                const count = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i++) {
                    const x = 120 + Math.random() * (canvas.width - 240);
                    const y = 120 + Math.random() * (canvas.height - 240);
                    const vx = (Math.random() - 0.5) * 60;
                    const vy = (Math.random() - 0.5) * 60;
                    
                    // ★ 修正：多様な天体を生成（元の質量範囲）
                    const rand = Math.random();
                    let mass;
                    if (rand < 0.5) {
                        // 50%: 恒星分類対象（質量10-80）
                        mass = 10 + Math.random() * 70;
                    } else if (rand < 0.8) {
                        // 30%: 白色矮星～中性子星（質量80-250）
                        mass = 80 + Math.random() * 170;
                    } else {
                        // 20%: 惑星系～ブラックホール（質量250-500）
                        mass = 250 + Math.random() * 250;
                    }
                    
                    bodies.push(new Body(x, y, vx, vy, mass, particleSystem));
                }
                break;
        }

        // ★ 追加：プリセット作成後にパーティクルシステムが正しく設定されているか確認
        bodies.forEach((body, index) => {
            if (!body.particleSystem) {
                body.particleSystem = particleSystem;
                console.warn(`プリセット天体${index}のパーティクルシステムを修正しました`);
            }
        });

        updateDisplay();
        drawBackground(ctx, canvas);

        // ★ 追加：停止状態での天体描画と射出システム描画
        bodies.forEach(body => {
            if (body.isValid) {
                body.draw(ctx, showTrails);
            }
        });
        bodyLauncher.render(bodies);

        if (!isRunning) {
            isRunning = true;
            const btn = document.getElementById('playPause');
            if (btn) {
                btn.textContent = '停止';
                btn.classList.add('active');
            }
            animate();
        }

        console.log(`プリセット「${type}」を設定しました（最適化レベルも初期化）`);

    } catch (error) {
        console.error('Preset error:', error);
        showError('プリセット設定エラーが発生しました。');
    }
}

// マウス/タッチイベントの処理
canvas.addEventListener('touchstart', (e) => {
    const result = handleStart(e, canvas, bodies, currentPresetType, updateDisplay,
        () => drawBackground(ctx, canvas), isRunning, showError, Body, bodyLauncher);
    if (result.currentPresetType !== undefined) {
        currentPresetType = result.currentPresetType;
    }
    if (result.selectedBody !== undefined) {
        uiState.selectedBody = result.selectedBody;
        uiState.isDragging = result.isDragging;
        uiState.isLaunching = result.isLaunching;
        uiState.dragOffset = result.dragOffset;
    }
    // ★ 追加：新しく作成された天体にパーティクルシステムを設定
    if (result.newBody) {
        result.newBody.particleSystem = particleSystem;
        console.log('新しい天体にパーティクルシステムを設定しました');
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    // ★ 修正：タッチムーブ時の射出システム処理を優先
    if (bodyLauncher.isLaunching) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        bodyLauncher.updateDrag(x, y);
        
        // 停止状態での即座描画更新
        if (!isRunning) {
            drawBackground(ctx, canvas);
            bodies.forEach(body => {
                if (body.isValid) {
                    body.draw(ctx, showTrails);
                }
            });
            bodyLauncher.render(bodies);
        }
    } else {
        handleMove(e, canvas, () => drawBackground(ctx, canvas), bodies, isRunning, bodyLauncher);
    }
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    const result = handleStart(e, canvas, bodies, currentPresetType, updateDisplay,
        () => drawBackground(ctx, canvas), isRunning, showError, Body, bodyLauncher);
    if (result.currentPresetType !== undefined) {
        currentPresetType = result.currentPresetType;
    }
    if (result.selectedBody !== undefined) {
        uiState.selectedBody = result.selectedBody;
        uiState.isDragging = result.isDragging;
        uiState.isLaunching = result.isLaunching;
        uiState.dragOffset = result.dragOffset;
    }
    // ★ 追加：新しく作成された天体にパーティクルシステムを設定
    if (result.newBody) {
        result.newBody.particleSystem = particleSystem;
        console.log('新しい天体にパーティクルシステムを設定しました');
    }
});

canvas.addEventListener('mousemove', (e) => {
    // ★ 修正：射出システム対応のマウスムーブ処理
    if (bodyLauncher.isLaunching) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        bodyLauncher.updateDrag(x, y);
        
        // 停止状態での即座描画更新
        if (!isRunning) {
            drawBackground(ctx, canvas);
            bodies.forEach(body => {
                if (body.isValid) {
                    body.draw(ctx, showTrails);
                }
            });
            bodyLauncher.render(bodies);
        }
    } else {
        handleMouseMove(e, canvas, bodies, gravity, () => drawBackground(ctx, canvas), findBodyAt, isRunning);
    }
});

canvas.addEventListener('touchend', (e) => {
    // ★ 修正：実際のisRunning状態を渡す
    const result = handleEnd(e, canvas, () => drawBackground(ctx, canvas), bodies, isRunning, bodyLauncher);
    uiState.isDragging = result.isDragging;
    uiState.isLaunching = result.isLaunching;
    uiState.selectedBody = result.selectedBody;
});

canvas.addEventListener('mouseup', (e) => {
    // ★ 修正：実際のisRunning状態を渡す
    const result = handleEnd(e, canvas, () => drawBackground(ctx, canvas), bodies, isRunning, bodyLauncher);
    uiState.isDragging = result.isDragging;
    uiState.isLaunching = result.isLaunching;
    uiState.selectedBody = result.selectedBody;
});

canvas.addEventListener('mouseleave', hideTooltip);

// 初期化
try {
    // ヘルプボタンイベント設定
    const helpButton = document.getElementById('helpButton');
    const helpOverlay = document.getElementById('helpOverlay');
    const helpPopup = document.getElementById('helpPopup');
    const helpCloseButton = document.getElementById('helpCloseButton');

    if (helpButton && helpOverlay && helpPopup && helpCloseButton) {
        helpButton.addEventListener('click', () => {
            helpOverlay.style.display = 'block';
            helpPopup.style.display = 'block';
            console.log('ヘルプポップアップを表示しました');
        });

        helpCloseButton.addEventListener('click', () => {
            helpOverlay.style.display = 'none';
            helpPopup.style.display = 'none';
            console.log('ヘルプポップアップを閉じました');
        });

        helpOverlay.addEventListener('click', () => {
            helpOverlay.style.display = 'none';
            helpPopup.style.display = 'none';
            console.log('オーバーレイクリックでヘルプを閉じました');
        });

        // ★ 追加：コントロールパネルトグル機能
        const controlsToggle = document.getElementById('controlsToggle');
        const controlsPanel = document.querySelector('.controls');
        let isControlsVisible = !mobileOptimization.isMobile; // デスクトップでは初期表示

        if (controlsToggle && controlsPanel) {
            // モバイルでは初期状態で折りたたみ
            if (mobileOptimization.isMobile) {
                controlsPanel.classList.add('collapsed');
                controlsToggle.textContent = '⚙️';
                controlsToggle.classList.remove('active');
            }

            controlsToggle.addEventListener('click', () => {
                isControlsVisible = !isControlsVisible;
                
                if (isControlsVisible) {
                    controlsPanel.classList.remove('collapsed');
                    controlsToggle.textContent = '✕';
                    controlsToggle.classList.add('active');
                    console.log('📱 コントロールパネルを表示');
                } else {
                    controlsPanel.classList.add('collapsed');
                    controlsToggle.textContent = '⚙️';
                    controlsToggle.classList.remove('active');
                    console.log('📱 コントロールパネルを非表示');
                }
            });

            // 画面回転時の調整
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    mobileOptimization.adjustForOrientation();
                    console.log('📱 画面回転を検出 - レイアウトを調整');
                }, 100);
            });

            console.log('📱 コントロールパネルトグル機能を初期化');
        }

        // ★ 追加：メモリ最適化イベントリスナー
        window.addEventListener('memoryOptimizationRequired', (event) => {
            console.warn('💾 メモリ最適化要求を受信:', event.detail);
            
            // 軌跡を短縮
            bodies.forEach(body => {
                if (body.trail && body.trail.length > 10) {
                    body.trail = body.trail.slice(-10);
                }
            });
            
            // パーティクルシステムをクリア
            if (particleSystem) {
                particleSystem.clearAll();
            }
            
            // 特殊イベントをリセット
            specialEvents.resetStats();
            
            console.log('💾 メモリ最適化を実行しました');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (helpPopup.style.display === 'block') {
                    helpOverlay.style.display = 'none';
                    helpPopup.style.display = 'none';
                    console.log('ESCキーでヘルプを閉じました');
                } else if (bodyLauncher.isLaunching || bodyLauncher.queuedLaunches.size > 0) {
                    // ★ 追加：ESCキーで射出キャンセル（すべて）
                    bodyLauncher.cancelAllLaunches();
                    uiState.isLaunching = false;
                    uiState.selectedBody = null;
                    console.log('🎯 ESCキーですべての射出をキャンセルしました');
                    
                    // 画面を再描画
                    if (!isRunning) {
                        drawBackground(ctx, canvas);
                        bodies.forEach(body => {
                            if (body.isValid) {
                                body.draw(ctx, showTrails);
                            }
                        });
                    }
                }
            }
        });

        console.log('ヘルプ機能が正常に初期化されました');
    } else {
        console.error('ヘルプ要素が見つかりません');
    }

    // プリセットボタンのイベントリスナー
    const presetButtons = {
        'presetBinary': 'binary',
        'presetTriangle': 'triangle',
        'presetFigureEight': 'figure_eight',
        'presetRandom': 'random'
    };

    Object.entries(presetButtons).forEach(([buttonId, presetType]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                setPreset(presetType);
                console.log(`プリセット「${presetType}」が選択されました`);
            });
        } else {
            console.warn(`プリセットボタンが見つかりません: ${buttonId}`);
        }
    });

    // ツールチップとウェルカムモーダルの初期化
    initializeTooltip();
    initializeWelcomeModal();

    // スライダーの初期値を設定
    const speedValue = document.getElementById('speedValue');
    const gravityValue = document.getElementById('gravityValue');
    const trailValue = document.getElementById('trailValue');
    const collisionSensitivityValue = document.getElementById('collisionSensitivityValue');

    if (speedValue) speedValue.textContent = speed.toFixed(1);
    if (gravityValue) gravityValue.textContent = gravity;
    if (trailValue) trailValue.textContent = trailLength;
    if (collisionSensitivityValue) collisionSensitivityValue.textContent = collisionSensitivity.toFixed(1);

    // 重力場キャンバスの初期化
    setupGravityFieldCanvas(canvas);
    
    // ★ 最適化された衝突検出システムの初期化
    initializeOptimizedCollisionSystem(canvas.width, canvas.height);

    // ★ 追加：FPS表示の初期化
    const fpsElement = document.getElementById('fpsDisplay');
    if (fpsElement) {
        fpsElement.textContent = currentFps;
        console.log('FPS表示を初期化しました');
    } else {
        console.warn('FPS表示要素が見つかりません');
    }

    // ★ 追加：特殊イベントシステムの初期化確認（簡略化）
    if (specialEvents && typeof specialEvents.getEventStats === 'function') {
        // 特殊イベントシステムが正常に初期化されました
    } else {
        console.error('✗ 特殊イベントシステムの初期化に失敗しました');
    }

    // ★ 修正：イベント統計表示の初期化（常に表示）
    const eventStatsElement = document.getElementById('eventStats');
    if (eventStatsElement) {
        eventStatsElement.style.display = 'block'; // ★ 常に表示に変更
        // イベント統計表示を初期化しました（常時表示）
    } else {
        console.warn('イベント統計表示要素が見つかりません');
    }

    // ★ 修正：初期状態でも統計を表示（エラーハンドリング付き）
    try {
        updateDisplay();
    } catch (displayError) {
        console.warn('初期表示更新でエラーが発生:', displayError);
    }

    drawBackground(ctx, canvas);

    // ★ 追加：開発者モード機能の初期化
    setupDeveloperMode();

    console.log('🚀 三体問題シミュレータが初期化されました（完全モジュール分割版）');

} catch (error) {
    console.error('Initialization error:', error);
    showError('初期化エラーが発生しました。');
}

/**
 * ★ 追加：開発者モード機能の設定
 */
function setupDeveloperMode() {
    const devModeToggle = document.getElementById('devModeToggle');
    const specialEventsPanel = document.getElementById('specialEventsPanel');
    const performanceStatsToggle = document.getElementById('performanceStatsToggle');
    const performanceStatsPanel = document.getElementById('performanceStatsPanel');
    
    if (!devModeToggle || !specialEventsPanel) {
        console.warn('開発者モード要素が見つかりません');
        return;
    }
    
    let developerMode = false;
    let performanceStatsVisible = false;
    
    // 開発者モード切り替え
    devModeToggle.addEventListener('click', () => {
        developerMode = !developerMode;
        
        if (developerMode) {
            devModeToggle.classList.add('active');
            devModeToggle.textContent = '開発者モード ON';
            specialEventsPanel.style.display = 'block';
            console.log('🛠️ 開発者モードを有効化しました');
        } else {
            devModeToggle.classList.remove('active');
            devModeToggle.textContent = '開発者モード';
            specialEventsPanel.style.display = 'none';
            console.log('🛠️ 開発者モードを無効化しました');
        }
    });
    
    // パフォーマンス統計切り替え
    if (performanceStatsToggle && performanceStatsPanel) {
        performanceStatsToggle.addEventListener('click', () => {
            performanceStatsVisible = !performanceStatsVisible;
            
            if (performanceStatsVisible) {
                performanceStatsToggle.classList.add('active');
                performanceStatsToggle.textContent = '衝突統計 ON';
                performanceStatsPanel.style.display = 'block';
                console.log('⚡ パフォーマンス統計表示を有効化しました');
            } else {
                performanceStatsToggle.classList.remove('active');
                performanceStatsToggle.textContent = '衝突統計';
                performanceStatsPanel.style.display = 'none';
                console.log('⚡ パフォーマンス統計表示を無効化しました');
            }
        });
    } else {
        console.warn('パフォーマンス統計要素が見つかりません');
    }
    
    // 特殊イベントトリガーボタンの設定
    const eventButtons = [
        { id: 'triggerCosmicStorm', event: 'cosmic_storm', name: '宇宙嵐' },
        { id: 'triggerSolarFlare', event: 'solar_flare', name: '太陽フレア' },
        { id: 'triggerHawkingRadiation', event: 'hawking_radiation', name: 'ホーキング輻射' },
        { id: 'triggerGravityLens', event: 'gravity_lens', name: '重力レンズ' },
        { id: 'triggerPerfectAlignment', event: 'perfect_alignment', name: '完璧な整列' },
        { id: 'triggerBlackHoleMerger', event: 'black_hole_merger', name: 'ブラックホール合体' },
        { id: 'triggerResonanceHarmony', event: 'resonance_harmony', name: '共鳴ハーモニー' },
        { id: 'triggerQuantumFluctuation', event: 'quantum_fluctuation', name: '量子ゆらぎ' }
    ];
    
    eventButtons.forEach(({ id, event, name }) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', () => {
                if (!developerMode) {
                    console.warn('開発者モードが無効です');
                    return;
                }
                
                try {
                    // 特殊イベントを強制発生
                    if (specialEvents && typeof specialEvents.triggerEvent === 'function') {
                        specialEvents.triggerEvent(event, bodies, particleSystem, ctx, canvas);
                        console.log(`🎯 開発者モード: ${name}を発生させました`);
                        
                        // ボタンの視覚的フィードバック
                        button.style.transform = 'scale(0.95)';
                        button.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.8)';
                        
                        setTimeout(() => {
                            button.style.transform = '';
                            button.style.boxShadow = '';
                        }, 200);
                        
                        // 統計更新
                        updateDisplay();
                    } else {
                        console.error('特殊イベントシステムが利用できません');
                        showError('特殊イベントシステムエラー');
                    }
                } catch (error) {
                    console.error(`${name}の発生でエラー:`, error);
                    showError(`${name}の発生に失敗しました`);
                }
            });
        } else {
            console.warn(`特殊イベントボタンが見つかりません: ${id}`);
        }
    });
    
    console.log('🛠️ 開発者モード機能を初期化しました');
}

/**
 * ★ 追加：最適化された軌跡描画関数
 */
function drawOptimizedTrail(body, ctx) { // ★ 修正：ctxを引数として追加
    if (!body.trail || body.trail.length < 3) return;

    const quality = performanceMonitor.trailRenderQuality;
    const trail = body.trail;

    // 品質に応じて描画する点を間引き
    const skipRate = Math.max(1, Math.floor(1 / quality));

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 最適化された軌跡描画
    for (let i = 2; i < trail.length - 1; i += skipRate) {
        const progress = i / trail.length;
        const alpha = progress * 0.8 * quality;
        const width = (progress * 4 + 0.5) * quality;

        const p1 = trail[i - 1];
        const p2 = trail[i];

        // シンプルな線描画（品質が低い場合）またはグラデーション（品質が高い場合）
        if (quality < 0.5) {
            // 低品質：シンプルな線
            ctx.strokeStyle = body.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        } else {
            // 高品質：グラデーション線
            const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            const prevAlpha = Math.floor(((i - 1) / trail.length) * 255).toString(16).padStart(2, '0');
            const currAlpha = Math.floor(alpha * 255).toString(16).padStart(2, '0');

            gradient.addColorStop(0, body.color + prevAlpha);
            gradient.addColorStop(1, body.color + currAlpha);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    // 軌跡の終端グロー効果（高品質時のみ）
    if (quality > 0.6 && trail.length > 0) {
        const lastPoint = trail[trail.length - 1];
        const glowRadius = 3 * quality;

        const glowGradient = ctx.createRadialGradient(
            lastPoint.x, lastPoint.y, 0,
            lastPoint.x, lastPoint.y, glowRadius
        );
        glowGradient.addColorStop(0, body.color + 'AA');
        glowGradient.addColorStop(0.5, body.color + '66');
        glowGradient.addColorStop(1, body.color + '00');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ★ 追加：パフォーマンスリセットイベントリスナー
try {
    window.addEventListener('performanceReset', (event) => {
        console.log('パフォーマンスリセット完了:', event.detail);

        // UI表示の更新
        updateDisplay();

        // FPS表示のリセット
        const fpsElement = document.getElementById('fpsDisplay');
        if (fpsElement) {
            fpsElement.style.color = '#4ecdc4'; // 正常色に戻す
        }
    });
} catch (error) {
    console.warn('パフォーマンスリセットイベントリスナー設定エラー:', error);
}

/**
 * パフォーマンス統計の更新と表示
 */
function updatePerformanceStats() {
    const performanceStatsPanel = document.getElementById('performanceStatsPanel');
    const performanceStatsContent = document.getElementById('performanceStatsContent');
    
    if (!performanceStatsPanel || !performanceStatsContent) {
        return;
    }
    
    // 表示状態を確認
    if (performanceStatsPanel.style.display === 'none') {
        return;
    }
    
    // 衝突検出パフォーマンス統計を取得
    const collisionStats = getCollisionPerformanceStats();
    
    if (!collisionStats) {
        performanceStatsContent.innerHTML = `
            <div class="performance-stat">
                <span class="stat-label">状態:</span>
                <span class="stat-value">未初期化</span>
            </div>
            <div class="performance-stat">
                <span class="stat-label">システム:</span>
                <span class="stat-value">従来方式使用中</span>
            </div>
        `;
        return;
    }
    
    const { performance, spatialGrid, frameCount } = collisionStats;
    
    // 統計情報を更新
    performanceStatsContent.innerHTML = `
        <div class="performance-stat">
            <span class="stat-label">処理時間 (平均):</span>
            <span class="stat-value">${performance.averageProcessingTime.toFixed(3)}ms</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">処理時間 (ピーク):</span>
            <span class="stat-value">${performance.peakProcessingTime.toFixed(3)}ms</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">総衝突数:</span>
            <span class="stat-value">${performance.totalCollisions}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">ペアチェック数:</span>
            <span class="stat-value">${performance.pairsChecked}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">スキップ数:</span>
            <span class="stat-value">${performance.pairsSkipped}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">フレーム数:</span>
            <span class="stat-value">${frameCount}</span>
        </div>
        <div class="performance-section-title">🌐 空間グリッド</div>
        <div class="performance-stat">
            <span class="stat-label">総セル数:</span>
            <span class="stat-value">${spatialGrid.totalCells}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">使用セル数:</span>
            <span class="stat-value">${spatialGrid.occupiedCells}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">セル内平均天体数:</span>
            <span class="stat-value">${spatialGrid.averageBodiesPerCell.toFixed(1)}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">セル内最大天体数:</span>
            <span class="stat-value">${spatialGrid.maxBodiesPerCell}</span>
        </div>
        <div class="performance-stat">
            <span class="stat-label">キャッシュサイズ:</span>
            <span class="stat-value">${spatialGrid.cacheSize}</span>
        </div>
    `;
}