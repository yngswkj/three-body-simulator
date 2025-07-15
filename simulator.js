'use strict';

import { performanceMonitor } from './js/performance.js';
import {
    calculateGravity,
    calculateEnergy,
    handleCollisions as physicsHandleCollisions
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
    uiState
} from './js/ui.js';
import {
    drawBackground,
    setupGravityFieldCanvas,
    calculateAndDrawGravityField,
    handleCanvasResize,
    drawEinsteinRings // ★ 追加
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

// パーティクルシステム
const particleSystem = new ParticleSystem();

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
        }
    } catch (error) {
        console.warn('Canvas resize error:', error);
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 物理計算のラッパー関数
function handleCollisionsWrapper(validBodies) {
    physicsHandleCollisions(validBodies, collisionSensitivity,
        (x, y, color1, color2) => particleSystem.createCollisionEffect(x, y, color1, color2),
        time);
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

        // 天体更新・描画
        bodies.forEach(body => {
            body.update(dt, showTrails, trailLength, canvas);
            body.draw(ctx, showTrails);
        });

        // ★ 追加：アインシュタインリング描画（天体描画後、パーティクル描画前）
        drawEinsteinRings(ctx, bodies);

        // ★ 追加：特殊イベントの更新と描画（シミュレーション時間を渡す）
        specialEvents.update(bodies, time, ctx, canvas);

        // ★ 追加：射出システムの描画（停止中のみ）
        if (!isRunning) {
            bodyLauncher.render(bodies);
        }

        // パーティクル管理
        particleSystem.update(ctx);

        // パーティクル数制限（モバイル最適化適用）
        const baseMaxParticles = performanceMonitor.getMaxParticles();
        const mobileMaxParticles = mobileOptimization.getParticleLimit();
        const maxParticles = Math.min(baseMaxParticles, mobileMaxParticles);
        particleSystem.limitParticles(maxParticles);

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
document.getElementById('playPause')?.addEventListener('click', () => {
    isRunning = !isRunning;
    const btn = document.getElementById('playPause');
    btn.textContent = isRunning ? '停止' : '開始';
    btn.classList.toggle('active', isRunning);
    if (isRunning) {
        animate();
    }
});

document.getElementById('reset')?.addEventListener('click', () => {
    if (currentPresetType) {
        setPreset(currentPresetType);
    } else {
        bodies.forEach(body => {
            body.vx = 0;
            body.vy = 0;
            body.trail = [];
            body.isValid = true;
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

    console.log('シミュレーションをリセットしました（最適化レベル・イベント統計も初期化）');
});

document.getElementById('clear')?.addEventListener('click', () => {
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

    console.log('天体をクリアしました（最適化レベル・イベント統計も初期化）');
});

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

document.getElementById('collisionToggle')?.addEventListener('click', () => {
    enableCollisions = !enableCollisions;
    const btn = document.getElementById('collisionToggle');
    if (btn) {
        btn.classList.toggle('active', enableCollisions);
        btn.textContent = enableCollisions ? '衝突有効' : '衝突無効';
    }
});

document.getElementById('gravityFieldToggle')?.addEventListener('click', () => {
    showGravityField = !showGravityField;
    const btn = document.getElementById('gravityFieldToggle');
    if (btn) {
        btn.classList.toggle('active', showGravityField);
        btn.textContent = showGravityField ? '重力場表示' : '重力場非表示';
    }
});

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
                bodies.push(new Body(cx - 40, cy, 30, 30, 35, particleSystem));
                bodies.push(new Body(cx + 40, cy, -30, -30, 35, particleSystem));
                break;

            case 'triangle':
                const r = 120;
                for (let i = 0; i < 3; i++) {
                    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    const vx = -35 * Math.sin(angle);
                    const vy = 35 * Math.cos(angle);
                    bodies.push(new Body(x, y, vx, vy, 30, particleSystem));
                }
                break;

            case 'figure_eight':
                bodies.push(new Body(cx, cy, 25, 38, 28, particleSystem));
                bodies.push(new Body(cx - 180, cy, -12.5, -19, 28, particleSystem));
                bodies.push(new Body(cx + 180, cy, -12.5, -19, 28, particleSystem));
                break;

            case 'random':
                const count = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i++) {
                    const x = 120 + Math.random() * (canvas.width - 240);
                    const y = 120 + Math.random() * (canvas.height - 240);
                    const vx = (Math.random() - 0.5) * 60;
                    const vy = (Math.random() - 0.5) * 60;
                    const mass = 20 + Math.random() * 25;
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
    // ★ 修正：実際のisRunning状態を渡す
    handleMove(e, canvas, () => drawBackground(ctx, canvas), bodies, isRunning, bodyLauncher);
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

    // ツールチップの初期化
    initializeTooltip();

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

    // ★ 追加：FPS表示の初期化
    const fpsElement = document.getElementById('fpsDisplay');
    if (fpsElement) {
        fpsElement.textContent = currentFps;
        console.log('FPS表示を初期化しました');
    } else {
        console.warn('FPS表示要素が見つかりません');
    }

    // ★ 追加：特殊イベントシステムの初期化確認
    console.log('特殊イベントシステムの初期化確認...');
    if (specialEvents && typeof specialEvents.getEventStats === 'function') {
        console.log('✓ 特殊イベントシステムが正常に初期化されました');
        console.log('✓ getEventStats メソッドが利用可能です');
    } else {
        console.error('✗ 特殊イベントシステムの初期化に失敗しました');
    }

    // ★ 修正：イベント統計表示の初期化（常に表示）
    const eventStatsElement = document.getElementById('eventStats');
    if (eventStatsElement) {
        eventStatsElement.style.display = 'block'; // ★ 常に表示に変更
        console.log('イベント統計表示を初期化しました（常時表示）');
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

    console.log('🚀 三体問題シミュレータが初期化されました（完全モジュール分割版）');

} catch (error) {
    console.error('Initialization error:', error);
    showError('初期化エラーが発生しました。');
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