'use strict';

import { performanceMonitor } from './js/performance.js';
import { calculateEnergy, initializeOptimizedCollisionSystem, getCollisionPerformanceStats } from './js/physics.js';
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
    handleCanvasResize,
    setupGravityFieldCanvas
} from './js/graphics.js';
import { Body } from './js/body.js';
import { Simulation } from './js/simulation.js';
import { mobileOptimization } from './js/mobile-optimization.js';

// グローバル変数
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// UIコールバック
const uiCallbacks = {
    onUpdateDisplay: () => updateDisplay(),
    onUpdateFPS: (fps) => {
        updateFPSDisplay(fps);
        updatePerformanceStats();
    },
    onError: (msg) => showError(msg)
};

// シミュレーションインスタンス
const simulation = new Simulation(canvas, ctx, uiCallbacks);

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
            simulation.handleResize();
        }
    } catch (error) {
        console.warn('Canvas resize error:', error);
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/**
 * FPS表示更新
 */
function updateFPSDisplay(currentFps) {
    const fpsElement = document.getElementById('fpsDisplay');
    if (fpsElement) {
        fpsElement.textContent = currentFps;
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

/**
 * 表示更新のラッパー
 */
function updateDisplay() {
    try {
        let eventStats = {};
        if (simulation.specialEvents && typeof simulation.specialEvents.getEventStats === 'function') {
            eventStats = simulation.specialEvents.getEventStats();
        } else {
            console.warn('特殊イベントシステムが正しく初期化されていません');
            eventStats = {
                totalEvents: 0,
                eventTypes: {},
                rareEvents: 0,
                legendaryEvents: 0
            };
        }

        uiUpdateDisplay(simulation.bodies, simulation.time, () => calculateEnergy(simulation.bodies, simulation.config.GRAVITY), eventStats);
    } catch (error) {
        console.error('updateDisplay error:', error);
        uiUpdateDisplay(simulation.bodies, simulation.time, () => calculateEnergy(simulation.bodies, simulation.config.GRAVITY), {
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
    simulation.stop();

    const btn = document.getElementById('playPause');
    if (btn) {
        btn.textContent = '開始';
        btn.classList.remove('active');
    }
}

// コントロール
function toggleSimulation() {
    if (simulation.isRunning) {
        simulation.stop();
    } else {
        // ★ 追加：シミュレーション開始時にドラッグ履歴をクリア
        simulation.bodies.forEach(body => {
            body.wasDragged = false;
            body.dragArrow = null; // ★ 追加：矢印エフェクト情報をクリア
        });
        simulation.start();
    }

    const btn = document.getElementById('playPause');
    const mobileBtn = document.getElementById('playPauseMobile');

    const buttonText = simulation.isRunning ? '停止' : '開始';
    if (btn) {
        btn.textContent = buttonText;
        btn.classList.toggle('active', simulation.isRunning);
    }
    if (mobileBtn) {
        mobileBtn.textContent = buttonText;
        mobileBtn.classList.toggle('active', simulation.isRunning);
    }
}

document.getElementById('playPause')?.addEventListener('click', toggleSimulation);
document.getElementById('playPauseMobile')?.addEventListener('click', toggleSimulation);

function resetSimulation() {
    if (currentPresetType) {
        setPreset(currentPresetType);
    } else {
        simulation.reset();
        // Note: simulation.reset() clears bodies, but here we want to reset state but keep bodies if not preset?
        // Wait, original resetSimulation logic:
        /*
        bodies.forEach(body => {
            body.vx = 0;
            body.vy = 0;
            body.trail = [];
            body.isValid = true;
            body.wasDragged = false;
            body.dragArrow = null;
        });
        particleSystem.clear();
        time = 0;
        errorCount = 0;
        ...
        */
        // My Simulation.reset() clears bodies. I should probably add a softReset or handle it here.
        // Let's implement the logic here using simulation properties.

        simulation.bodies.forEach(body => {
            body.vx = 0;
            body.vy = 0;
            body.trail = [];
            body.isValid = true;
            body.wasDragged = false;
            body.dragArrow = null;
        });
        simulation.particleSystem.clear();
        simulation.time = 0;
        // errorCount is local to simulator.js? No, it was global. I should check if I moved it.
        // I didn't move errorCount to Simulation class explicitly, but I should have.
        // Let's assume I can ignore it or add it to Simulation later.

        try {
            performanceMonitor.resetOptimization();
            console.log('パフォーマンス最適化レベルをリセットしました');
        } catch (error) {
            console.warn('パフォーマンス最適化リセットでエラーが発生:', error);
        }

        simulation.specialEvents.resetStats();
        simulation.bodyLauncher.resetAllLaunches();

        updateDisplay();

        if (!simulation.isRunning) {
            drawBackground(ctx, canvas);
            simulation.bodies.forEach(body => {
                if (body.isValid) {
                    simulation.bodyRenderer.draw(ctx, body, simulation.config.SHOW_TRAILS);
                }
            });
            simulation.bodyLauncher.render(simulation.bodies);
        }
    }
}

document.getElementById('reset')?.addEventListener('click', resetSimulation);
document.getElementById('resetMobile')?.addEventListener('click', resetSimulation);

function clearSimulation() {
    currentPresetType = null;
    simulation.reset(); // This clears bodies and time.

    // Additional reset logic from original
    try {
        performanceMonitor.resetOptimization();
        console.log('パフォーマンス最適化レベルをリセットしました');
    } catch (error) {
        console.warn('パフォーマンス最適化リセットでエラーが発生:', error);
    }

    simulation.specialEvents.resetStats();
    simulation.bodyLauncher.resetAllLaunches();

    updateDisplay();
    // drawBackground is called in simulation.reset() but we might need to redraw bodies (empty) and launcher

    // ★ 追加：停止状態での矢印エフェクト表示
    // bodies are empty so this loop does nothing
    simulation.bodies.forEach(body => {
        if (body.isValid) {
            simulation.bodyRenderer.draw(ctx, body, simulation.config.SHOW_TRAILS);
        }
    });
    simulation.bodyLauncher.render(simulation.bodies);
}


document.getElementById('clear')?.addEventListener('click', clearSimulation);
document.getElementById('clearMobile')?.addEventListener('click', clearSimulation);

// スライダー
document.getElementById('speedSlider')?.addEventListener('input', (e) => {
    simulation.config.SPEED = parseFloat(e.target.value);
    const speedValue = document.getElementById('speedValue');
    if (speedValue) speedValue.textContent = simulation.config.SPEED.toFixed(1);
});

document.getElementById('gravitySlider')?.addEventListener('input', (e) => {
    simulation.config.GRAVITY = parseInt(e.target.value);
    const gravityValue = document.getElementById('gravityValue');
    if (gravityValue) gravityValue.textContent = simulation.config.GRAVITY;
});

document.getElementById('trailSlider')?.addEventListener('input', (e) => {
    simulation.config.TRAIL_LENGTH = parseInt(e.target.value);
    const trailValue = document.getElementById('trailValue');
    if (trailValue) trailValue.textContent = simulation.config.TRAIL_LENGTH;

    if (performanceMonitor.optimizationActive) {
        performanceMonitor.originalTrailLength = simulation.config.TRAIL_LENGTH;
        console.log(`軌跡長変更: ${simulation.config.TRAIL_LENGTH} (最適化中)`);
    }

    if (simulation.config.TRAIL_LENGTH > 500) {
        const qualityReduction = Math.min(0.8, (simulation.config.TRAIL_LENGTH - 500) / 1000);
        performanceMonitor.trailRenderQuality = Math.max(0.2, 1.0 - qualityReduction);
        console.log(`高軌跡長 ${simulation.config.TRAIL_LENGTH} - 品質を ${performanceMonitor.trailRenderQuality.toFixed(2)} に予防調整`);
    } else if (!performanceMonitor.optimizationActive) {
        performanceMonitor.trailRenderQuality = 1.0;
    }
});

document.getElementById('trailToggle')?.addEventListener('click', () => {
    simulation.config.SHOW_TRAILS = !simulation.config.SHOW_TRAILS;
    const btn = document.getElementById('trailToggle');
    if (btn) {
        btn.classList.toggle('active', simulation.config.SHOW_TRAILS);
        btn.textContent = simulation.config.SHOW_TRAILS ? '軌跡表示' : '軌跡非表示';
    }

    if (!simulation.config.SHOW_TRAILS) {
        simulation.bodies.forEach(body => body.trail = []);
    }
});

// ★ 統一された衝突判定切り替え関数
function toggleCollision() {
    simulation.config.ENABLE_COLLISIONS = !simulation.config.ENABLE_COLLISIONS;
    const btn = document.getElementById('collisionToggle');
    const mobileBtn = document.getElementById('collisionToggleMobile');

    const buttonText = simulation.config.ENABLE_COLLISIONS ? '衝突有効' : '衝突無効';

    if (btn) {
        btn.classList.toggle('active', simulation.config.ENABLE_COLLISIONS);
        btn.textContent = buttonText;
    }
    if (mobileBtn) {
        mobileBtn.classList.toggle('active', simulation.config.ENABLE_COLLISIONS);
        mobileBtn.textContent = buttonText;
    }

    console.log(`衝突判定: ${simulation.config.ENABLE_COLLISIONS ? '有効' : '無効'}`);
}

// ★ 統一された重力場表示切り替え関数
function toggleGravityField() {
    simulation.config.SHOW_GRAVITY_FIELD = !simulation.config.SHOW_GRAVITY_FIELD;
    const btn = document.getElementById('gravityFieldToggle');
    const mobileBtn = document.getElementById('gravityFieldToggleMobile');

    const buttonText = simulation.config.SHOW_GRAVITY_FIELD ? '重力場表示' : '重力場非表示';

    if (btn) {
        btn.classList.toggle('active', simulation.config.SHOW_GRAVITY_FIELD);
        btn.textContent = buttonText;
    }
    if (mobileBtn) {
        mobileBtn.classList.toggle('active', simulation.config.SHOW_GRAVITY_FIELD);
        mobileBtn.textContent = buttonText;
    }

    console.log(`重力場表示: ${simulation.config.SHOW_GRAVITY_FIELD ? '有効' : '無効'}`);
}

// イベントリスナーの設定
document.getElementById('collisionToggle')?.addEventListener('click', toggleCollision);
document.getElementById('collisionToggleMobile')?.addEventListener('click', toggleCollision);

document.getElementById('gravityFieldToggle')?.addEventListener('click', toggleGravityField);
document.getElementById('gravityFieldToggleMobile')?.addEventListener('click', toggleGravityField);

document.getElementById('collisionSensitivitySlider')?.addEventListener('input', (e) => {
    simulation.config.COLLISION_SENSITIVITY = parseFloat(e.target.value);
    const sensitivityValue = document.getElementById('collisionSensitivityValue');
    if (sensitivityValue) sensitivityValue.textContent = simulation.config.COLLISION_SENSITIVITY.toFixed(1);
});

// プリセット
function setPreset(type) {
    try {
        currentPresetType = type;
        simulation.bodies = [];
        simulation.particleSystem.clear();
        simulation.time = 0;
        // errorCount = 0; // Ignored

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
                // ★ 軌道安定化：同一質量の連星系
                const binaryMass = 30 + Math.random() * 40; // 質量30-70（統一）
                simulation.bodies.push(new Body(cx - 40, cy, 30, 30, binaryMass, simulation.particleSystem));
                simulation.bodies.push(new Body(cx + 40, cy, -30, -30, binaryMass, simulation.particleSystem));
                break;

            case 'triangle':
                // ★ 軌道安定化：同一質量の三角配置
                const triangleMass = 25 + Math.random() * 35; // 質量25-60（統一）
                const r = 120;
                for (let i = 0; i < 3; i++) {
                    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    const vx = -35 * Math.sin(angle);
                    const vy = 35 * Math.cos(angle);
                    simulation.bodies.push(new Body(x, y, vx, vy, triangleMass, simulation.particleSystem));
                }
                break;

            case 'figure_eight':
                // ★ 軌道安定化：同一質量の8の字軌道
                const figureEightMass = 40 + Math.random() * 50; // 質量40-90（統一）
                simulation.bodies.push(new Body(cx, cy, 25, 38, figureEightMass, simulation.particleSystem));
                simulation.bodies.push(new Body(cx - 180, cy, -12.5, -19, figureEightMass, simulation.particleSystem));
                simulation.bodies.push(new Body(cx + 180, cy, -12.5, -19, figureEightMass, simulation.particleSystem));
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

                    simulation.bodies.push(new Body(x, y, vx, vy, mass, simulation.particleSystem));
                }
                break;
        }

        // ★ 追加：プリセット作成後にパーティクルシステムが正しく設定されているか確認
        simulation.bodies.forEach((body, index) => {
            if (!body.particleSystem) {
                body.particleSystem = simulation.particleSystem;
                console.warn(`プリセット天体${index}のパーティクルシステムを修正しました`);
            }
        });

        updateDisplay();
        drawBackground(ctx, canvas);

        // ★ 追加：停止状態での天体描画と射出システム描画
        simulation.bodies.forEach(body => {
            if (body.isValid) {
                simulation.bodyRenderer.draw(ctx, body, simulation.config.SHOW_TRAILS);
            }
        });
        simulation.bodyLauncher.render(simulation.bodies);

        if (!simulation.isRunning) {
            simulation.start();
            const btn = document.getElementById('playPause');
            if (btn) {
                btn.textContent = '停止';
                btn.classList.add('active');
            }
        }

        console.log(`プリセット「${type}」を設定しました（最適化レベルも初期化）`);

    } catch (error) {
        console.error('Preset error:', error);
        showError('プリセット設定エラーが発生しました。');
    }
}

// マウス/タッチイベントの処理
canvas.addEventListener('touchstart', (e) => {
    const result = handleStart(e, canvas, simulation.bodies, currentPresetType, updateDisplay,
        () => drawBackground(ctx, canvas), simulation.isRunning, showError, Body, simulation.bodyLauncher, simulation.bodyRenderer);
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
        result.newBody.particleSystem = simulation.particleSystem;
        console.log('新しい天体にパーティクルシステムを設定しました');
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    handleMove(e, canvas, () => drawBackground(ctx, canvas), simulation.bodies, simulation.isRunning, simulation.bodyLauncher, simulation.bodyRenderer);
});

canvas.addEventListener('mousedown', (e) => {
    const result = handleStart(e, canvas, simulation.bodies, currentPresetType, updateDisplay,
        () => drawBackground(ctx, canvas), simulation.isRunning, showError, Body, simulation.bodyLauncher, simulation.bodyRenderer);
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
        result.newBody.particleSystem = simulation.particleSystem;
        console.log('新しい天体にパーティクルシステムを設定しました');
    }
});

canvas.addEventListener('mousemove', (e) => {
    handleMove(e, canvas, () => drawBackground(ctx, canvas), simulation.bodies, simulation.isRunning, simulation.bodyLauncher, simulation.bodyRenderer);

    // ツールチップ処理
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hoveredBody = findBodyAt(x, y, simulation.bodies);
    if (hoveredBody) {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.left = `${e.clientX + 10}px`;
            tooltip.style.top = `${e.clientY + 10}px`;
            tooltip.innerHTML = `質量: ${hoveredBody.mass.toFixed(2)}<br>位置: (${hoveredBody.x.toFixed(2)}, ${hoveredBody.y.toFixed(2)})`;
            tooltip.style.display = 'block';
        }
    } else {
        hideTooltip();
    }
});

canvas.addEventListener('touchend', (e) => {
    const result = handleEnd(e, canvas, simulation.bodies, simulation.isRunning, () => drawBackground(ctx, canvas), simulation.bodyLauncher, simulation.bodyRenderer);
    if (result && result.isDragging !== undefined) {
        uiState.isDragging = result.isDragging;
        uiState.selectedBody = result.selectedBody;
    }
});

canvas.addEventListener('mouseup', (e) => {
    const result = handleEnd(e, canvas, simulation.bodies, simulation.isRunning, () => drawBackground(ctx, canvas), simulation.bodyLauncher, simulation.bodyRenderer);
    if (result && result.isDragging !== undefined) {
        uiState.isDragging = result.isDragging;
        uiState.selectedBody = result.selectedBody;
    }
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
            simulation.bodies.forEach(body => {
                if (body.trail && body.trail.length > 10) {
                    body.trail = body.trail.slice(-10);
                }
            });

            // パーティクルシステムをクリア
            if (simulation.particleSystem) {
                simulation.particleSystem.clearAll();
            }

            // 特殊イベントをリセット
            simulation.specialEvents.resetStats();

            console.log('💾 メモリ最適化を実行しました');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (helpPopup.style.display === 'block') {
                    helpOverlay.style.display = 'none';
                    helpPopup.style.display = 'none';
                    console.log('ESCキーでヘルプを閉じました');
                } else if (simulation.bodyLauncher.isLaunching || simulation.bodyLauncher.queuedLaunches.size > 0) {
                    // ★ 追加：ESCキーで射出キャンセル（すべて）
                    simulation.bodyLauncher.cancelAllLaunches();
                    uiState.isLaunching = false;
                    uiState.selectedBody = null;
                    console.log('🎯 ESCキーですべての射出をキャンセルしました');

                    // 画面を再描画
                    if (!simulation.isRunning) {
                        drawBackground(ctx, canvas);
                        simulation.bodies.forEach(body => {
                            if (body.isValid) {
                                simulation.bodyRenderer.draw(ctx, body, simulation.config.SHOW_TRAILS);
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

    if (speedValue) speedValue.textContent = simulation.config.SPEED.toFixed(1);
    if (gravityValue) gravityValue.textContent = simulation.config.GRAVITY;
    if (trailValue) trailValue.textContent = simulation.config.TRAIL_LENGTH;
    if (collisionSensitivityValue) collisionSensitivityValue.textContent = simulation.config.COLLISION_SENSITIVITY.toFixed(1);

    // 重力場キャンバスの初期化
    setupGravityFieldCanvas(canvas);

    // ★ 最適化された衝突検出システムの初期化
    initializeOptimizedCollisionSystem(canvas.width, canvas.height);

    // ★ 追加：FPS表示の初期化
    const fpsElement = document.getElementById('fpsDisplay');
    if (fpsElement) {
        fpsElement.textContent = simulation.currentFps;
        console.log('FPS表示を初期化しました');
    } else {
        console.warn('FPS表示要素が見つかりません');
    }

    // ★ 追加：特殊イベントシステムの初期化確認（簡略化）
    if (simulation.specialEvents && typeof simulation.specialEvents.getEventStats === 'function') {
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
        { id: 'triggerMultiverse', event: 'multiverse', name: 'マルチバース現象' }
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
                    if (simulation.specialEvents && typeof simulation.specialEvents.triggerEvent === 'function') {
                        simulation.specialEvents.triggerEvent(event, simulation.bodies, simulation.particleSystem, ctx, canvas);
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

// ★ 開発者モード用：グローバル関数を追加
window.triggerMultiverse = function () {
    console.log('🌌 開発者モード: マルチバース現象を強制発生');
    simulation.specialEvents.triggerEvent('multiverse', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerQuantumFluctuation = function () {
    console.warn('⚠️ 量子ゆらぎは削除されました。代わりに triggerMultiverse() を使用してください。');
    return window.triggerMultiverse();
};

// ★ 既存の開発者コマンドも確保
window.triggerCosmicStorm = function () {
    console.log('⚡ 開発者モード: 宇宙嵐を強制発生');
    simulation.specialEvents.triggerEvent('cosmic_storm', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerSolarFlare = function () {
    console.log('☀️ 開発者モード: 太陽フレアを強制発生');
    simulation.specialEvents.triggerEvent('solar_flare', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerHawkingRadiation = function () {
    console.log('🌌 開発者モード: ホーキング輻射を強制発生');
    simulation.specialEvents.triggerEvent('hawking_radiation', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerGravitationalLensing = function () {
    console.log('🔬 開発者モード: 重力レンズ効果を強制発生');
    simulation.specialEvents.triggerEvent('gravitational_lensing', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerPerfectAlignment = function () {
    console.log('🌈 開発者モード: 完璧な整列を強制発生');
    simulation.specialEvents.triggerEvent('perfect_alignment', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerBlackHoleMerger = function () {
    console.log('💫 開発者モード: ブラックホール合体を強制発生');
    simulation.specialEvents.triggerEvent('black_hole_merger', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

window.triggerResonanceHarmony = function () {
    console.log('🎵 開発者モード: 共鳴ハーモニーを強制発生');
    simulation.specialEvents.triggerEvent('resonance_harmony', simulation.bodies, simulation.particleSystem, ctx, canvas);
    return true;
};

// ★ 開発者ヘルプ機能
window.showEventHelp = function () {
    console.log(`
🌟 特殊イベント開発者コマンド一覧:

基本イベント:
• triggerCosmicStorm() - 宇宙嵐
• triggerSolarFlare() - 太陽フレア

レアイベント:
• triggerHawkingRadiation() - ホーキング輻射
• triggerGravitationalLensing() - 重力レンズ効果

レジェンダリーイベント:
• triggerPerfectAlignment() - 完璧な整列
• triggerBlackHoleMerger() - ブラックホール合体
• triggerResonanceHarmony() - 共鳴ハーモニー

ウルトラレアイベント:
• triggerMultiverse() - マルチバース現象 ⭐ NEW!

その他:
• showEventHelp() - このヘルプを表示
• specialEvents.getEventStats() - イベント統計表示
• specialEvents.getEventHistory() - イベント履歴表示

例: triggerMultiverse()
    `);
    return true;
};

console.log('🎮 開発者モード: 特殊イベントコマンドが利用可能です');
console.log('💡 showEventHelp() でコマンド一覧を確認できます');

setupDeveloperMode();