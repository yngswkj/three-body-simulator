'use strict';

// グローバル変数
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let bodies = [];
let isRunning = false;
let animationId = null;
let time = 0;
let selectedBody = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// シミュレーションパラメータ
let timeStep = 0.016;  // 60FPSで約16ms
let speed = 1.0;
let gravity = 150;

// 軌跡表示用パラメータとエラーカウント
let trailLength = 30;
let showTrails = true;
let errorCount = 0;

// ★ 追加：衝突判定フラグ
let enableCollisions = true;

// ★ 追加：衝突判定の感度パラメータ
let collisionSensitivity = 0.5; // 0.1(厳しい) ～ 1.0(緩い)

// ★ 追加：ブラックホール関連定数
const BLACK_HOLE_MASS_THRESHOLD = 400; // ★ 変更：ブラックホール化する質量の閾値を厳しく（200→300）
const BLACK_HOLE_GRAVITY_MULTIPLIER = 3; // ブラックホールの重力倍率

// ★ 追加：新しい天体タイプの閾値
const WHITE_DWARF_MASS_THRESHOLD = 80;   // 白色矮星化する質量の閾値
const PULSAR_MASS_THRESHOLD = 160;       // パルサー化する質量の閾値
const NEUTRON_STAR_MASS_THRESHOLD = 190; // 中性子星化する質量の閾値
const PLANET_SYSTEM_MASS_THRESHOLD = 250; // 惑星系化する質量の閾値

// ★ 追加：重力場可視化関連
let showGravityField = false;
let gravityFieldResolution = 60; // ★ 変更：解像度を倍増（30→60）
let gravityFieldCanvas = null;
let gravityFieldCtx = null;
let gravityFieldUpdateCounter = 0; // 更新頻度制御用

// 星の背景用変数
let stars = [];
let backgroundGenerated = false;

// FPS計測用変数
let frameCount = 0;
let lastFpsUpdate = Date.now();
let currentFps = 60;

// パーティクル配列をグローバルに定義
let particles = [];

// 現在のプリセットを記憶
let currentPresetType = null;

// ★ 追加：パフォーマンス監視システム
let performanceMonitor = {
    frameCount: 0,
    lastFpsCheck: Date.now(),
    currentFps: 60,
    fpsHistory: [],
    lowFpsCount: 0,
    optimizationActive: false,
    originalTrailLength: trailLength,
    targetFps: 55,
    criticalFps: 50,
    emergencyFps: 45,
    optimizationLevel: 0,
    consecutiveLowFps: 0,
    lastOptimizationTime: 0,
    trailRenderQuality: 1.0,
    // ★ 追加：初期化制御用パラメータ
    initializationPeriod: 5000, // 5秒間は最適化を無効
    startTime: Date.now(),
    isInitializing: true,
    minHistoryLength: 3 // 最低3回のFPS計測後に判定開始
};

/**
 * ★ 修正：FPS監視とパフォーマンス最適化（初期化期間を考慮）
 */
function monitorPerformance() {
    performanceMonitor.frameCount++;
    const now = Date.now();

    // ★ 追加：初期化期間の判定
    const timeSinceStart = now - performanceMonitor.startTime;
    if (timeSinceStart < performanceMonitor.initializationPeriod) {
        performanceMonitor.isInitializing = true;
        // 初期化期間中はFPS履歴のみ更新、最適化は無効
        if (now - performanceMonitor.lastFpsCheck >= 1000) {
            performanceMonitor.currentFps = performanceMonitor.frameCount;
            performanceMonitor.frameCount = 0;
            performanceMonitor.lastFpsCheck = now;
            currentFps = performanceMonitor.currentFps;

            console.log(`🔄 初期化中 (残り${Math.ceil((performanceMonitor.initializationPeriod - timeSinceStart) / 1000)}秒): FPS ${performanceMonitor.currentFps}`);
        }
        return;
    } else if (performanceMonitor.isInitializing) {
        // 初期化完了
        performanceMonitor.isInitializing = false;
        console.log('✅ パフォーマンス監視初期化完了 - 最適化システム有効化');
    }

    // 1秒ごとにFPSを計算
    if (now - performanceMonitor.lastFpsCheck >= 1000) {
        performanceMonitor.currentFps = performanceMonitor.frameCount;
        performanceMonitor.frameCount = 0;
        performanceMonitor.lastFpsCheck = now;

        // FPS履歴を保持（最大10秒分）
        performanceMonitor.fpsHistory.push(performanceMonitor.currentFps);
        if (performanceMonitor.fpsHistory.length > 10) {
            performanceMonitor.fpsHistory.shift();
        }

        // ★ 修正：十分な履歴が蓄積されてからパフォーマンス最適化を開始
        if (performanceMonitor.fpsHistory.length >= performanceMonitor.minHistoryLength) {
            optimizePerformance();
        }

        // FPS表示を更新
        currentFps = performanceMonitor.currentFps;
    }
}

/**
 * ★ 修正：段階的パフォーマンス最適化システム（誤判定防止）
 */
function optimizePerformance() {
    // ★ 追加：初期化中は最適化を実行しない
    if (performanceMonitor.isInitializing) {
        return;
    }

    const avgFps = performanceMonitor.fpsHistory.reduce((a, b) => a + b, 0) / performanceMonitor.fpsHistory.length;
    const now = Date.now();

    // ★ 修正：連続低FPS検出をより厳密に
    const currentIsLow = performanceMonitor.currentFps < performanceMonitor.targetFps;
    const averageIsLow = avgFps < performanceMonitor.targetFps;

    if (currentIsLow && averageIsLow) {
        performanceMonitor.consecutiveLowFps++;
    } else if (!currentIsLow && !averageIsLow) {
        // 現在と平均の両方が良好な場合のみリセット
        performanceMonitor.consecutiveLowFps = Math.max(0, performanceMonitor.consecutiveLowFps - 1);
    }

    // ★ 修正：緊急最適化の条件を厳しく
    const emergencyCondition = avgFps < performanceMonitor.emergencyFps &&
        performanceMonitor.currentFps < performanceMonitor.emergencyFps &&
        performanceMonitor.consecutiveLowFps >= 2;

    if (emergencyCondition) {
        executeEmergencyOptimization();
        return;
    }

    // ★ 修正：段階的最適化の条件を厳しく（3秒間隔、連続3回低下）
    if (now - performanceMonitor.lastOptimizationTime > 3000) {
        if (performanceMonitor.consecutiveLowFps >= 3 && averageIsLow) {
            activateNextOptimizationLevel(avgFps);
        } else if (performanceMonitor.optimizationActive && avgFps > performanceMonitor.targetFps + 5) {
            // ★ 修正：緩和条件を厳しく（目標FPS + 5以上で緩和）
            relaxOptimization();
        }
        performanceMonitor.lastOptimizationTime = now;
    }
}

/**
 * ★ 追加：緊急最適化（即座に軌跡を大幅削減）
 */
function executeEmergencyOptimization() {
    console.warn('🚨 緊急最適化発動！ FPSが極端に低下しています');

    // 軌跡を即座に10%まで削減
    const emergencyLength = Math.max(5, Math.floor(trailLength * 0.1));
    bodies.forEach(body => {
        if (body.trail.length > emergencyLength) {
            // 最新の軌跡のみ保持
            body.trail = body.trail.slice(-emergencyLength);
        }
    });

    // パーティクルも大幅削減
    if (particles.length > 50) {
        particles.splice(0, particles.length - 50);
    }

    // 最適化レベルを最大に
    performanceMonitor.optimizationLevel = 4;
    performanceMonitor.optimizationActive = true;
    performanceMonitor.trailRenderQuality = 0.1;

    console.log(`緊急最適化完了 - 軌跡長: ${emergencyLength}, パーティクル数: ${particles.length}`);
}

/**
 * ★ 追加：段階的最適化レベル適用
 */
function activateNextOptimizationLevel(avgFps) {
    const totalTrailPoints = bodies.reduce((sum, body) => sum + body.trail.length, 0);

    // 最適化レベルを決定
    let targetLevel = 0;
    if (avgFps < 40) targetLevel = 4;
    else if (avgFps < 45) targetLevel = 3;
    else if (avgFps < 50) targetLevel = 2;
    else if (avgFps < 55) targetLevel = 1;

    if (targetLevel > performanceMonitor.optimizationLevel) {
        performanceMonitor.optimizationLevel = targetLevel;
        performanceMonitor.optimizationActive = true;

        console.log(`最適化レベル ${targetLevel} 発動 - FPS: ${avgFps.toFixed(1)}, 軌跡点数: ${totalTrailPoints}`);

        switch (targetLevel) {
            case 1: // 軽微な最適化
                applyLightOptimization();
                break;
            case 2: // 中程度の最適化
                applyModerateOptimization();
                break;
            case 3: // 重度の最適化
                applyHeavyOptimization();
                break;
            case 4: // 最大最適化
                applyMaximumOptimization();
                break;
        }
    }
}

/**
 * ★ 追加：緊急最適化発動時のパラメータ調整
 */
function adjustParametersForEmergencyOptimization() {
    // 緊急最適化発動時にパラメータを調整
    speed = Math.max(0.5, speed * 0.7);
    gravity = Math.min(300, gravity * 1.2);
    trailLength = Math.max(5, Math.floor(trailLength * 0.1));

    // スライダーの値を更新
    document.getElementById('speedSlider').value = speed;
    document.getElementById('gravitySlider').value = gravity;
    document.getElementById('trailSlider').value = trailLength;

    // 表示を更新
    document.getElementById('speedValue').textContent = speed.toFixed(1);
    document.getElementById('gravityValue').textContent = gravity;
    document.getElementById('trailValue').textContent = trailLength;
}

/**
 * ★ 追加：軽微な最適化（レベル1）
 */
function applyLightOptimization() {
    performanceMonitor.trailRenderQuality = 0.8;

    // 軌跡を80%に削減
    bodies.forEach(body => {
        if (body.trail.length > trailLength * 0.8) {
            const targetLength = Math.floor(trailLength * 0.8);
            body.trail = adaptiveTrailReduction(body.trail, targetLength);
        }
    });

    console.log('軽微な最適化適用 - 軌跡品質: 80%');
}

/**
 * ★ 追加：中程度の最適化（レベル2）
 */
function applyModerateOptimization() {
    performanceMonitor.trailRenderQuality = 0.6;

    // 軌跡を60%に削減
    bodies.forEach(body => {
        if (body.trail.length > trailLength * 0.6) {
            const targetLength = Math.floor(trailLength * 0.6);
            body.trail = adaptiveTrailReduction(body.trail, targetLength);
        }
    });

    // パーティクル数制限
    if (particles.length > 200) {
        particles.splice(0, particles.length - 200);
    }

    console.log('中程度の最適化適用 - 軌跡品質: 60%, パーティクル制限: 200');
}

/**
 * ★ 追加：重度の最適化（レベル3）
 */
function applyHeavyOptimization() {
    performanceMonitor.trailRenderQuality = 0.4;

    // 軌跡を40%に削減
    bodies.forEach(body => {
        if (body.trail.length > trailLength * 0.4) {
            const targetLength = Math.floor(trailLength * 0.4);
            body.trail = adaptiveTrailReduction(body.trail, targetLength);
        }
    });

    // パーティクル数を大幅制限
    if (particles.length > 100) {
        particles.splice(0, particles.length - 100);
    }

    // 重力場表示を無効化
    if (showGravityField) {
        showGravityField = false;
        const btn = document.getElementById('gravityFieldToggle');
        if (btn) {
            btn.classList.remove('active');
            btn.textContent = '重力場非表示';
        }
        console.log('重力場表示を自動無効化');
    }

    console.log('重度の最適化適用 - 軌跡品質: 40%, パーティクル制限: 100');
}

/**
 * ★ 追加：最大最適化（レベル4）
 */
function applyMaximumOptimization() {
    performanceMonitor.trailRenderQuality = 0.2;

    // 軌跡を20%に削減
    bodies.forEach(body => {
        if (body.trail.length > trailLength * 0.2) {
            const targetLength = Math.max(5, Math.floor(trailLength * 0.2));
            body.trail = adaptiveTrailReduction(body.trail, targetLength);
        }
    });

    // パーティクルを最小限に
    if (particles.length > 50) {
        particles.splice(0, particles.length - 50);
    }

    console.log('最大最適化適用 - 軌跡品質: 20%, パーティクル制限: 50');
}

/**
 * ★ 追加：スマートな軌跡削減（重要な点を保持）
 */
function adaptiveTrailReduction(trail, targetLength) {
    if (trail.length <= targetLength) return trail;

    const reducedTrail = [];

    // 最新の1/3は必ず保持
    const recentCount = Math.floor(targetLength / 3);
    const recentTrail = trail.slice(-recentCount);

    // 古い軌跡は間引き
    const oldTrail = trail.slice(0, -recentCount);
    const oldTargetCount = targetLength - recentCount;

    for (let i = 0; i < oldTargetCount; i++) {
        const index = Math.floor(i * (oldTrail.length / oldTargetCount));
        if (oldTrail[index]) {
            reducedTrail.push(oldTrail[index]);
        }
    }

    // 最新の軌跡を追加
    return [...reducedTrail, ...recentTrail];
}

/**
 * ★ 追加：最適化の段階的緩和
 */
function relaxOptimization() {
    if (performanceMonitor.optimizationLevel > 0) {
        performanceMonitor.optimizationLevel--;

        if (performanceMonitor.optimizationLevel === 0) {
            performanceMonitor.optimizationActive = false;
            performanceMonitor.trailRenderQuality = 1.0;
            console.log('パフォーマンス最適化解除');
        } else {
            // 段階的に品質を向上
            const qualityMap = [1.0, 0.8, 0.6, 0.4, 0.2];
            performanceMonitor.trailRenderQuality = qualityMap[performanceMonitor.optimizationLevel];
            console.log(`最適化レベル ${performanceMonitor.optimizationLevel} に緩和`);
        }
    }
}

/**
 * ★ 追加：適応的品質調整関数
 */
function updateAdaptiveQuality() {
    // 軌跡描画品質の動的調整
    if (performanceMonitor.optimizationActive) {
        // 最適化中は品質をさらに動的調整
        if (performanceMonitor.currentFps < performanceMonitor.criticalFps) {
            performanceMonitor.trailRenderQuality = Math.max(0.1, performanceMonitor.trailRenderQuality - 0.05);
        } else if (performanceMonitor.currentFps > performanceMonitor.targetFps) {
            const qualityMap = [1.0, 0.8, 0.6, 0.4, 0.2];
            const targetQuality = qualityMap[performanceMonitor.optimizationLevel];
            performanceMonitor.trailRenderQuality = Math.min(targetQuality, performanceMonitor.trailRenderQuality + 0.02);
        }
    }
}

/**
 * ★ 追加：メモリ使用量監視の強化
 */
function checkMemoryUsage() {
    if (performance.memory) {
        const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        const memoryLimit = 150; // MB

        if (memoryUsage > memoryLimit) {
            console.warn(`高メモリ使用量検出: ${memoryUsage.toFixed(1)}MB - 軌跡を最適化します`);

            // メモリ使用量に応じた軌跡削減
            const reductionRatio = Math.min(0.5, (memoryUsage - memoryLimit) / memoryLimit);
            const targetLength = Math.floor(trailLength * (1 - reductionRatio));

            bodies.forEach(body => {
                if (body.trail.length > targetLength) {
                    body.trail = adaptiveTrailReduction(body.trail, targetLength);
                }
            });

            // パーティクルも削減
            const maxParticles = Math.max(50, 300 - Math.floor(reductionRatio * 200));
            if (particles.length > maxParticles) {
                particles.splice(0, particles.length - maxParticles);
            }

            console.log(`メモリ最適化完了 - 目標軌跡長: ${targetLength}, 最大パーティクル: ${maxParticles}`);
        }

        // パフォーマンス統計をFPS表示に反映
        const fpsElement = document.getElementById('fpsDisplay');
        if (fpsElement) {
            let fpsText = performanceMonitor.currentFps.toString();
            if (performanceMonitor.optimizationActive) {
                fpsText += ` (最適化Lv${performanceMonitor.optimizationLevel})`;
            }
            fpsElement.textContent = fpsText;
        }
    }
}

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
            generateStars(); // サイズ変更時に星を再生成

            // ★ 追加：重力場キャンバスのリサイズ
            setupGravityFieldCanvas();
        }
    } catch (error) {
        console.warn('Canvas resize error:', error);
    }
}

// ★ 追加：重力場キャンバスの設定
function setupGravityFieldCanvas() {
    if (!gravityFieldCanvas) {
        gravityFieldCanvas = document.createElement('canvas');
        gravityFieldCtx = gravityFieldCanvas.getContext('2d');
    }
    gravityFieldCanvas.width = canvas.width;
    gravityFieldCanvas.height = canvas.height;
}

// ★ 追加：重力場の計算と描画
function calculateAndDrawGravityField() {
    if (!showGravityField || bodies.length === 0) return;

    // パフォーマンスのため3フレームに1回更新
    gravityFieldUpdateCounter++;
    if (gravityFieldUpdateCounter % 3 !== 0) return;

    const width = canvas.width;
    const height = canvas.height;
    const stepX = width / gravityFieldResolution;
    const stepY = height / gravityFieldResolution;

    // 重力場キャンバスをクリア
    gravityFieldCtx.clearRect(0, 0, width, height);

    // ★ 変更：重力場強度を計算（ポテンシャルではなく重力加速度）
    let minFieldStrength = Infinity;
    let maxFieldStrength = -Infinity;
    const fieldStrengths = [];

    for (let i = 0; i <= gravityFieldResolution; i++) {
        fieldStrengths[i] = [];
        for (let j = 0; j <= gravityFieldResolution; j++) {
            const x = i * stepX;
            const y = j * stepY;
            const fieldStrength = calculateGravityFieldStrength(x, y);
            fieldStrengths[i][j] = fieldStrength;

            if (fieldStrength < minFieldStrength) minFieldStrength = fieldStrength;
            if (fieldStrength > maxFieldStrength) maxFieldStrength = fieldStrength;
        }
    }

    // ★ 変更：対数スケールで正規化（重力場の広いダイナミックレンジに対応）
    const logMin = Math.log10(Math.max(minFieldStrength, 0.001));
    const logMax = Math.log10(Math.max(maxFieldStrength, 0.001));

    // 重力場を描画
    for (let i = 0; i < gravityFieldResolution; i++) {
        for (let j = 0; j < gravityFieldResolution; j++) {
            const x = i * stepX;
            const y = j * stepY;
            const fieldStrength = fieldStrengths[i][j];

            // ★ 変更：対数スケールで正規化
            let normalizedStrength = 0;
            if (fieldStrength > 0.001 && logMax !== logMin) {
                const logValue = Math.log10(fieldStrength);
                normalizedStrength = (logValue - logMin) / (logMax - logMin);
                normalizedStrength = Math.max(0, Math.min(1, normalizedStrength));
            }

            // ★ 変更：より鮮明な色マッピング
            const color = getEnhancedHeatmapColor(normalizedStrength, fieldStrength);

            gravityFieldCtx.fillStyle = color;
            gravityFieldCtx.fillRect(x, y, stepX + 1, stepY + 1);
        }
    }
}

// ★ 変更：重力場強度計算（ポテンシャルから重力加速度へ）
function calculateGravityFieldStrength(x, y) {
    let totalFieldStrength = 0;
    const G = gravity * 50;

    for (let body of bodies) {
        if (!body.isValid) continue;

        const dx = x - body.x;
        const dy = y - body.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // ★ 変更：最小距離を天体の半径に基づいて設定
        const bodyRadius = Math.sqrt(body.mass) * 1.5;
        const safeDistance = Math.max(distance, bodyRadius * 0.5);

        // ★ 変更：ブラックホールの潮汐力を現実的に表現
        let effectiveG = G;
        let massMultiplier = 1;

        if (body.isBlackHole) {
            effectiveG *= BLACK_HOLE_GRAVITY_MULTIPLIER;
            // ブラックホールの事象の地平線内では極端に強い重力場
            if (distance < body.eventHorizonRadius) {
                massMultiplier = 10; // 事象の地平線内では重力場を10倍に
            } else if (distance < body.eventHorizonRadius * 2) {
                // 事象の地平線周辺での急激な重力勾配
                const ratio = distance / body.eventHorizonRadius;
                massMultiplier = 1 + 9 * Math.exp(-(ratio - 1) * 3);
            }
        }

        // 重力加速度の大きさ: a = GM/r²
        const fieldStrength = (effectiveG * body.mass * massMultiplier) / (safeDistance * safeDistance);
        totalFieldStrength += fieldStrength;
    }

    return totalFieldStrength;
}

// ★ 変更：強化されたヒートマップ色計算
function getEnhancedHeatmapColor(value, rawFieldStrength) {
    // 0-1の値をより鮮明な色グラデーションに変換
    value = Math.max(0, Math.min(1, value));

    let r, g, b, alpha;

    // ★ 変更：より多段階の色変化で重力場の強度を表現
    if (value < 0.1) {
        // 極弱い重力場：透明に近い紫
        const t = value / 0.1;
        r = Math.floor(t * 50);
        g = 0;
        b = Math.floor(t * 100);
        alpha = t * 0.1;
    } else if (value < 0.3) {
        // 弱い重力場：紫→青
        const t = (value - 0.1) / 0.2;
        r = Math.floor(50 + t * 50);
        g = Math.floor(t * 100);
        b = Math.floor(100 + t * 155);
        alpha = 0.1 + t * 0.15;
    } else if (value < 0.5) {
        // 中程度の重力場：青→水色
        const t = (value - 0.3) / 0.2;
        r = Math.floor(100 - t * 100);
        g = Math.floor(100 + t * 155);
        b = 255;
        alpha = 0.25 + t * 0.15;
    } else if (value < 0.7) {
        // 強い重力場：水色→緑
        const t = (value - 0.5) / 0.2;
        r = 0;
        g = 255;
        b = Math.floor(255 - t * 255);
        alpha = 0.4 + t * 0.15;
    } else if (value < 0.85) {
        // 非常に強い重力場：緑→黄
        const t = (value - 0.7) / 0.15;
        r = Math.floor(t * 255);
        g = 255;
        b = 0;
        alpha = 0.55 + t * 0.15;
    } else if (value < 0.95) {
        // 極強い重力場：黄→オレンジ
        const t = (value - 0.85) / 0.1;
        r = 255;
        g = Math.floor(255 - t * 100);
        b = 0;
        alpha = 0.7 + t * 0.15;
    } else {
        // ブラックホール級の重力場：オレンジ→赤→白
        const t = (value - 0.95) / 0.05;
        r = 255;
        g = Math.floor(155 * (1 - t) + 255 * t);
        b = Math.floor(255 * t);
        alpha = 0.85 + t * 0.15;
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ★ 追加：重力ポテンシャル計算（既存の関数を維持、エネルギー計算で使用）
function calculateGravityPotential(x, y) {
    let potential = 0;
    const G = gravity * 50;

    for (let body of bodies) {
        if (!body.isValid) continue;

        const dx = x - body.x;
        const dy = y - body.y;
        const distance = Math.sqrt(dx * dx + dy * dy) + 10; // ゼロ除算防止

        // ブラックホールの重力を考慮
        let effectiveG = G;
        if (body.isBlackHole) {
            effectiveG *= BLACK_HOLE_GRAVITY_MULTIPLIER;
        }

        potential -= (effectiveG * body.mass) / distance;
    }

    return potential;
}

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
            generateStars(); // サイズ変更時に星を再生成

            // ★ 追加：重力場キャンバスのリサイズ
            setupGravityFieldCanvas();
        }
    } catch (error) {
        console.warn('Canvas resize error:', error);
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/**
 * 星の背景生成（最適化）
 */
function generateStars() {
    stars = [];
    const starCount = Math.min(150, Math.floor((canvas.width * canvas.height) / 8000));

    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.8 + 0.2,
            twinkle: Math.random() * Math.PI * 2
        });
    }
    backgroundGenerated = true;
}

/**
 * パーティクルクラス
 */
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = Math.random() * 3 + 1;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    draw() {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.life * 0.6;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

/**
 * 天体クラス
 */
class Body {
    constructor(x, y, vx = 0, vy = 0, mass = 25) {
        // ★ 基本物理パラメータ
        this.x = x;                                        // X座標位置
        this.y = y;                                        // Y座標位置
        this.vx = vx;                                      // X方向速度
        this.vy = vy;                                      // Y方向速度
        this.mass = Math.max(10, Math.min(400, mass));     // 質量（10-400の範囲）

        // ★ 視覚効果パラメータ
        this.trail = [];                                   // 軌跡座標の配列
        this.color = this.generateColor();                 // 天体の色

        // ★ アニメーション制御パラメータ
        this.trailUpdateCounter = 0;                       // 軌跡更新カウンター
        this.isValid = true;                               // 天体が有効かどうかのフラグ
        this.pulsePhase = Math.random() * Math.PI * 2;     // 脈動効果の位相
        this.particleTimer = 0;                            // パーティクル生成タイマー

        // ★ 天体タイプ別パラメータ
        this.type = this.determineBodyType();              // 天体種別（normal, whiteDwarf, neutronStar等）
        this.rotation = 0;                                 // 回転角度
        this.temperature = 1.0;                            // 温度係数（白色矮星用）
        this.magneticField = 0;                            // 磁場強度（中性子星・パルサー用）
        this.beamRotation = 0;                             // ビーム回転角度（パルサー用）
        this.planets = [];                                 // 惑星配列（惑星系用）

        // ★ ブラックホール専用パラメータ
        this.isBlackHole = this.type === 'blackHole';      // ブラックホールフラグ
        this.blackHoleRotation = 0;                        // ブラックホール回転角度
        this.eventHorizonRadius = 0;                       // 事象の地平線半径

        // ★ パルサー専用パラメータ
        this.pulsarAge = 0;                                // パルサー年齢（時間経過）
        this.rotationPeriod = 0.001;                       // 回転周期（秒）
        this.lastCollisionTime = 0;                        // 最後の衝突時刻

        // 初期化完了
        this.initializeByType();
    }

    // ★ 修正：天体タイプ判定ロジックを物理的に正しく
    determineBodyType() {
        if (this.mass >= BLACK_HOLE_MASS_THRESHOLD) {
            return 'blackHole';
        } else if (this.mass >= PLANET_SYSTEM_MASS_THRESHOLD) {
            return 'planetSystem';
        } else if (this.mass >= NEUTRON_STAR_MASS_THRESHOLD) {
            // ★ 修正：パルサーは若い中性子星の特殊状態
            // 既存のパルサーは磁場減衰で中性子星に進化する可能性
            if (this.type === 'pulsar') {
                // パルサーの磁場減衰チェック（時間経過で中性子星になる）
                return this.shouldPulsarDecay() ? 'neutronStar' : 'pulsar';
            }
            // 新規生成時：10%の確率でパルサー（若い中性子星）
            return Math.random() < 0.1 ? 'pulsar' : 'neutronStar';
        } else if (this.mass >= PULSAR_MASS_THRESHOLD) {
            // ★ 修正：この質量範囲では中性子星前駆体
            // 激しい衝突や回転エネルギーがある場合のみパルサー化
            if (this.hasHighRotationalEnergy()) {
                return 'pulsar';
            }
            return 'neutronStar';
        } else if (this.mass >= WHITE_DWARF_MASS_THRESHOLD) {
            return 'whiteDwarf';
        } else {
            return 'normal';
        }
    }

    // ★ 追加：パルサーの磁場減衰判定
    shouldPulsarDecay() {
        // 年齢（時間経過）と磁場強度に基づく減衰
        if (!this.pulsarAge) this.pulsarAge = 0;
        this.pulsarAge += 1;

        // 磁場強度の減衰（時間と共に減少）
        this.magneticField = Math.max(0.1, this.magneticField - 0.0001);

        // 磁場が弱くなると通常の中性子星になる
        // また、一定確率で磁場が完全に減衰
        return this.magneticField < 0.5 || (this.pulsarAge > 500 && Math.random() < 0.001);
    }

    // ★ 追加：高回転エネルギー判定
    hasHighRotationalEnergy() {
        // 速度（回転に相当）が高い場合にパルサー化しやすい
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const rotationalThreshold = 100; // 高速度閾値

        // 最近衝突した場合（質量が急激に増加した場合）
        const recentCollision = this.lastCollisionTime && (time - this.lastCollisionTime) < 100;

        return speed > rotationalThreshold || recentCollision;
    }

    // ★ 修正：タイプ別初期化
    initializeByType() {
        switch (this.type) {
            case 'blackHole':
                this.becomeBlackHole();
                break;
            case 'neutronStar':
                this.color = '#E6E6FA'; // 薄紫
                this.magneticField = 0.3 + Math.random() * 0.4; // ★ 修正：弱い磁場
                this.rotation = 0;
                break;
            case 'whiteDwarf':
                this.color = '#F0F8FF'; // アリスブルー
                this.temperature = 2.0; // 高温から開始
                break;
            case 'pulsar':
                this.color = '#00FFFF'; // シアン
                this.magneticField = 1.2 + Math.random() * 0.6; // ★ 修正：強い磁場
                this.beamRotation = 0;
                this.pulsarAge = 0; // ★ 追加：パルサー年齢初期化
                this.rotationPeriod = 0.001 + Math.random() * 0.1; // ★ 追加：回転周期（短い）
                console.log(`パルサー誕生: 質量 ${this.mass.toFixed(1)}, 磁場強度 ${this.magneticField.toFixed(2)}, 回転周期 ${this.rotationPeriod.toFixed(3)}s`);
                break;
            case 'planetSystem':
                this.color = '#FFD700'; // ゴールド（恒星）
                this.generatePlanets();
                break;
            default:
                // 通常星の色を再生成
                if (!this.color || this.type === 'normal') {
                    this.color = this.generateColor();
                }
                break;
        }
    }

    // ★ 追加：ブラックホール化処理
    becomeBlackHole() {
        this.isBlackHole = true;
        this.color = '#000000'; // 黒色に変更
        this.eventHorizonRadius = Math.sqrt(this.mass) * 2;
        console.log(`ブラックホール誕生！質量: ${this.mass.toFixed(1)}`);

        // ブラックホール誕生エフェクト
        this.createBlackHoleBirthEffect();
    }

    // ★ 追加：ブラックホール誕生エフェクト
    createBlackHoleBirthEffect() {
        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            const speed = 5 + Math.random() * 8;
            const distance = 20 + Math.random() * 30;
            const px = this.x + Math.cos(angle) * distance;
            const py = this.y + Math.sin(angle) * distance;

            const particle = new Particle(px, py, '#ffffff');
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 2.0;
            particle.size = 3 + Math.random() * 4;
            particles.push(particle);
        }
    }

    // ★ 追加：惑星系の惑星生成
    generatePlanets() {
        const planetCount = 2 + Math.floor(Math.random() * 4); // 2-5個の惑星
        for (let i = 0; i < planetCount; i++) {
            const distance = 30 + i * 25 + Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.sqrt(this.mass * 0.5 / distance); // ケプラーの法則に基づく軌道速度

            this.planets.push({
                distance: distance,
                angle: angle,
                speed: speed * (0.8 + Math.random() * 0.4), // 速度にバリエーション
                size: 1 + Math.random() * 3,
                color: this.generatePlanetColor()
            });
        }
    }

    // ★ 追加：惑星の色生成（元のgeneratePlanetColorを残す）
    generatePlanetColor() {
        const planetColors = [
            '#8B4513', '#CD853F', '#DEB887', '#F4A460',
            '#4169E1', '#1E90FF', '#87CEEB', '#B0E0E6',
            '#FF6347', '#FF4500', '#DC143C', '#B22222'
        ];
        return planetColors[Math.floor(Math.random() * planetColors.length)];
    }

    // ★ 修正：通常星の色生成
    generateColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
            '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe',
            '#fd79a8', '#fdcb6e', '#00b894', '#e17055',
            '#74b9ff', '#0984e3', '#00cec9', '#e84393'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 天体の位置・速度更新
     */
    update(dt) {
        try {
            // 天体タイプ変化チェック
            const newType = this.determineBodyType();
            if (newType !== this.type && this.shouldEvolve(newType)) {
                const oldType = this.type;
                this.type = newType;
                this.initializeByType();
                console.log(`天体進化: ${this.getTypeNameJapanese(oldType)} → ${this.getTypeNameJapanese()} (質量: ${this.mass.toFixed(1)})`);
            }

            // タイプ別更新処理
            this.updateByType(dt);

            // 軌道記録（パフォーマンス最適化）
            this.trailUpdateCounter++;
            if (this.trailUpdateCounter % 3 === 0 && showTrails) {
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > trailLength) {
                    this.trail.shift();
                }
            }

            // 位置更新
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // ★ 修正：境界条件処理を改善
            this.handleBoundaryConditions();

            // 脈動効果の更新

            this.pulsePhase += 0.05;

            // パーティクル生成
            this.particleTimer++;
            this.generateParticlesByType();

            // 異常値チェック
            if (!this.isValidState()) {
                this.isValid = false;
                throw new Error('Invalid body state detected');
            }

        } catch (error) {
            console.warn('Body update error:', error);
            this.isValid = false;
        }
    }

    // ★ 追加：境界条件処理を独立したメソッドに
    handleBoundaryConditions() {
        const margin = 30;
        const damping = 0.8;

        if (this.x < margin) {
            this.x = margin;
            this.vx = Math.abs(this.vx) * damping;
        } else if (this.x > canvas.width - margin) {
            this.x = canvas.width - margin;
            this.vx = -Math.abs(this.vx) * damping;
        }

        if (this.y < margin) {
            this.y = margin;
            this.vy = Math.abs(this.vy) * damping;
        } else if (this.y > canvas.height - margin) {
            this.y = canvas.height - margin;
            this.vy = -Math.abs(this.vy) * damping;
        }
    }

    // ★ 追加：天体状態の有効性チェック
    isValidState() {
        return isFinite(this.x) && isFinite(this.y) &&
            isFinite(this.vx) && isFinite(this.vy) &&
            this.mass > 0;
    }

    // ★ 修正：進化条件を簡潔に
    shouldEvolve(newType) {
        // ブラックホールは不可逆
        if (this.type === 'blackHole') return false;

        // より重いタイプへの進化のみ許可
        const typeOrder = ['normal', 'whiteDwarf', 'pulsar', 'neutronStar', 'planetSystem', 'blackHole'];
        const currentIndex = typeOrder.indexOf(this.type);
        const newIndex = typeOrder.indexOf(newType);

        return newIndex > currentIndex || newType === 'blackHole';
    }

    // ★ 追加：タイプ別更新処理
    updateByType(dt) {
        switch (this.type) {
            case 'blackHole':
                this.blackHoleRotation += 0.02;
                this.eventHorizonRadius = Math.sqrt(this.mass) * 2;
                break;
            case 'neutronStar':
                this.rotation += 0.05; // ★ 修正：中性子星の回転は遅め
                // 磁場の緩やかな減衰
                this.magneticField = Math.max(0.1, this.magneticField - 0.00001);
                break;
            case 'whiteDwarf':
                this.temperature = Math.max(0.2, this.temperature - 0.0001);
                break;
            case 'pulsar':
                // ★ 修正：パルサーの物理的特性を正確に
                // 極めて高速回転（ミリ秒パルサーの場合）
                this.beamRotation += this.rotationPeriod > 0.01 ? 0.2 : 0.5; // 短周期ほど高速回転
                this.rotation += 0.15;

                // 磁場とスピンの相互作用
                if (this.magneticField > 1.0) {
                    // 強磁場による制動効果（回転減速）
                    this.rotationPeriod += 0.00001;
                }

                // パルサー年齢の更新
                if (!this.pulsarAge) this.pulsarAge = 0;
                this.pulsarAge += dt;
                break;
            case 'planetSystem':
                this.planets.forEach(planet => {
                    planet.angle += planet.speed * dt;
                });
                break;
        }
    }

    // ★ 追加：タイプ別パーティクル生成
    generateParticlesByType() {
        const baseInterval = 15;
        const intervals = {
            'blackHole': 8,
            'neutronStar': 25,  // ★ 修正：頻度を下げる
            'pulsar': 10,       // ★ 修正：頻度を下げる
            'planetSystem': 40, // ★ 修正：頻度を下げる
            'default': baseInterval
        };

        const interval = intervals[this.type] || intervals.default;

        if (this.particleTimer % interval !== 0) return;

        switch (this.type) {
            case 'blackHole':
                this.createAccretionDiskParticle();
                break;
            case 'neutronStar':
                this.createMagneticFieldParticle();
                break;
            case 'pulsar':
                this.createPulsarBeamParticle();
                break;
            case 'planetSystem':
                this.createSolarWindParticle();
                break;
            default:
                if (Math.random() < 0.3) {
                    this.createDefaultParticle();
                }
                break;
        }
    }

    // ★ 追加：デフォルトパーティクル生成を独立化
    createDefaultParticle() {
        const radius = Math.sqrt(this.mass) * 1.5;
        const angle = Math.random() * Math.PI * 2;
        const distance = radius + Math.random() * 10;
        const px = this.x + Math.cos(angle) * distance;
        const py = this.y + Math.sin(angle) * distance;
        particles.push(new Particle(px, py, this.color));
    }

    // ★ 修正：日本語タイプ名取得（引数でタイプ指定可能）
    getTypeNameJapanese(type = this.type) {
        const typeNames = {
            'normal': '通常星',
            'whiteDwarf': '白色矮星',
            'neutronStar': '中性子星',
            'pulsar': 'パルサー',
            'planetSystem': '惑星系',
            'blackHole': 'ブラックホール'
        };
        return typeNames[type] || '不明';
    }

    // ★ 追加：降着円盤パーティクル生成
    createAccretionDiskParticle() {
        const angle = Math.random() * Math.PI * 2;
        const radius = this.eventHorizonRadius * (2 + Math.random() * 3);
        const px = this.x + Math.cos(angle) * radius;
        const py = this.y + Math.sin(angle) * radius;

        // パーティクルを中心に向かって螺旋状に移動
        const particle = new Particle(px, py, '#ff6b00');
        const spiralSpeed = 0.5;
        particle.vx = -Math.cos(angle) * spiralSpeed + Math.sin(angle) * spiralSpeed * 0.3;
        particle.vy = -Math.sin(angle) * spiralSpeed - Math.cos(angle) * spiralSpeed * 0.3;
        particle.life = 3.0;
        particle.size = 1 + Math.random() * 2;
        particles.push(particle);
    }
    // ★ 追加：中性子星の磁場パーティクル
    createMagneticFieldParticle() {
        const angle = this.rotation + Math.random() * Math.PI * 0.5;
        const radius = Math.sqrt(this.mass) * 2;
        const distance = radius + Math.random() * 20;
        const px = this.x + Math.cos(angle) * distance;
        const py = this.y + Math.sin(angle) * distance;

        const particle = new Particle(px, py, '#9370DB');
        particle.vx = Math.cos(angle + Math.PI / 2) * 2;
        particle.vy = Math.sin(angle + Math.PI / 2) * 2;
        particle.life = 2.0;
        particle.size = 1;
        particles.push(particle);
    }

    // ★ 追加：パルサーのビームパーティクル
    createPulsarBeamParticle() {
        // 2つの対向するビーム
        for (let beam = 0; beam < 2; beam++) {
            const beamAngle = this.beamRotation + beam * Math.PI;
            const distance = 20 + Math.random() * 100;

            const px = this.x + Math.cos(beamAngle) * distance;
            const py = this.y + Math.sin(beamAngle) * distance;

            const particle = new Particle(px, py, '#00FFFF');
            particle.vx = Math.cos(beamAngle) * 5;
            particle.vy = Math.sin(beamAngle) * 5;
            particle.life = 1.5;
            particle.size = 2;
            particles.push(particle);
        }
    }

    // ★ 追加：恒星の太陽風パーティクル
    createSolarWindParticle() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(this.mass) * 1.5;
        const distance = radius + Math.random() * 15;
        const px = this.x + Math.cos(angle) * distance;
        const py = this.y + Math.sin(angle) * distance;

        const particle = new Particle(px, py, '#FFA500');
        particle.vx = Math.cos(angle) * (1 + Math.random() * 2);
        particle.vy = Math.sin(angle) * (1 + Math.random() * 2);
        particle.life = 3.0;
        particle.size = 1;
        particles.push(particle);
    }

    /**
     * 天体の描画（神秘的に改良）
     */
    draw() {
        if (!this.isValid) return;

        try {
            // ★ 修正：軌道描画をなめらかなベジェ曲線で改良
            if (showTrails && this.trail.length > 3) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // ★ 追加：なめらかなベジェ曲線による軌跡描画
                for (let i = 2; i < this.trail.length - 1; i++) {
                    const alpha = (i / this.trail.length) * 0.8;
                    const width = (i / this.trail.length) * 4 + 0.5;

                    // 制御点の計算（カトマル・ロム スプライン）
                    const p0 = this.trail[i - 2];
                    const p1 = this.trail[i - 1];
                    const p2 = this.trail[i];
                    const p3 = this.trail[i + 1] || this.trail[i];

                    // ★ 追加：なめらかなグラデーション軌道
                    const gradient = ctx.createLinearGradient(
                        p1.x, p1.y, p2.x, p2.y
                    );

                    const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
                    const prevAlphaHex = Math.floor(((i - 1) / this.trail.length) * 255).toString(16).padStart(2, '0');

                    gradient.addColorStop(0, this.color + prevAlphaHex);
                    gradient.addColorStop(1, this.color + alphaHex);

                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = width;

                    // ★ 追加：ベジェ曲線での描画
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);

                    // 制御点の計算（平滑化）
                    const tension = 0.3; // 張力（0-1、低いほどなめらか）
                    const cp1x = p1.x + (p2.x - p0.x) * tension;
                    const cp1y = p1.y + (p2.y - p0.y) * tension;
                    const cp2x = p2.x - (p3.x - p1.x) * tension;
                    const cp2y = p2.y - (p3.y - p1.y) * tension;

                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
                    ctx.stroke();
                }

                // ★ 追加：軌跡の終端に光る効果
                if (this.trail.length > 0) {
                    const lastPoint = this.trail[this.trail.length - 1];
                    const glowRadius = 3;

                    const glowGradient = ctx.createRadialGradient(
                        lastPoint.x, lastPoint.y, 0,
                        lastPoint.x, lastPoint.y, glowRadius
                    );
                    glowGradient.addColorStop(0, this.color + 'AA');
                    glowGradient.addColorStop(0.5, this.color + '66');
                    glowGradient.addColorStop(1, this.color + '00');

                    ctx.fillStyle = glowGradient;
                    ctx.beginPath();
                    ctx.arc(lastPoint.x, lastPoint.y, glowRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // ★ 変更：タイプ別描画
            switch (this.type) {
                case 'blackHole':
                    this.drawBlackHole();
                    break;
                case 'neutronStar':
                    this.drawNeutronStar();
                    break;
                case 'whiteDwarf':
                    this.drawWhiteDwarf();
                    break;
                case 'pulsar':
                    this.drawPulsar();
                    break;
                case 'planetSystem':
                    this.drawPlanetSystem();
                    break;
                default:
                    this.drawNormalBody();
                    break;
            }

        } catch (error) {
            console.warn('Body draw error:', error);
        }
    }

    // ★ 追加：中性子星の描画
    drawNeutronStar() {
        const radius = Math.sqrt(this.mass) * 0.8; // 通常より小さい

        // 強い磁場の可視化
        for (let field = 0; field < 4; field++) {
            const fieldAngle = this.rotation + (field * Math.PI / 2);
            const fieldRadius = radius * (2 + field * 0.5);

            ctx.strokeStyle = `rgba(147, 112, 219, ${0.3 - field * 0.05})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, fieldRadius, fieldAngle - 0.3, fieldAngle + 0.3);
            ctx.stroke();
        }

        // 本体
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.3, '#E6E6FA');
        coreGradient.addColorStop(0.7, '#9370DB');
        coreGradient.addColorStop(1, '#4B0082');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // ★ 追加：白色矮星の描画
    drawWhiteDwarf() {
        const radius = Math.sqrt(this.mass) * 1.2;

        // 温度による色変化
        const tempFactor = this.temperature;
        const r = Math.floor(255 * tempFactor);
        const g = Math.floor(255 * tempFactor * 0.9);
        const b = Math.floor(255 * (0.8 + tempFactor * 0.2));

        // 冷却グラデーション
        const coolGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 2);
        coolGradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
        coolGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.7)`);
        coolGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.1)`);

        ctx.fillStyle = coolGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // 本体
        const coreGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.6, this.color);
        coreGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // ★ 修正：パルサーの描画（より明確な視覚効果）
    drawPulsar() {
        const radius = Math.sqrt(this.mass) * 0.7; // ★ 修正：中性子星はより小さく

        // ★ 修正：磁場強度に基づくビーム描画
        const beamIntensity = Math.min(this.magneticField / 1.5, 1.0);

        for (let beam = 0; beam < 2; beam++) {
            const beamAngle = this.beamRotation + beam * Math.PI;
            // ★ 修正：ビーム長は磁場強度と回転周期に依存
            const beamLength = radius * (8 + this.magneticField * 4) * (0.1 / this.rotationPeriod);

            const beamWidth = 2 + Math.sin(this.beamRotation * 12) * 1 * beamIntensity;

            const beamGradient = ctx.createLinearGradient(
                this.x, this.y,
                this.x + Math.cos(beamAngle) * beamLength,
                this.y + Math.sin(beamAngle) * beamLength
            );

            // ★ 修正：磁場強度によるビーム色の変化
            const alpha = 0.7 * beamIntensity;
            beamGradient.addColorStop(0, `rgba(0, 255, 255, ${alpha})`);
            beamGradient.addColorStop(0.3, `rgba(0, 255, 255, ${alpha * 0.7})`);
            beamGradient.addColorStop(0.7, `rgba(0, 255, 255, ${alpha * 0.4})`);
            beamGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

            ctx.strokeStyle = beamGradient;
            ctx.lineWidth = beamWidth;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(beamAngle) * beamLength,
                this.y + Math.sin(beamAngle) * beamLength
            );
            ctx.stroke();
        }

        // 本体（中性子星ベース）
        this.drawNeutronStar();

        // ★ 修正：パルサー特有のエフェクト（物理的に正確）
        const pulseFrequency = 1.0 / this.rotationPeriod; // パルス周波数
        const pulseIntensity = 0.5 + 0.5 * Math.sin(this.beamRotation * pulseFrequency) * beamIntensity;
        const pulseRadius = radius * (1.5 + pulseIntensity * 0.8);

        ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + pulseIntensity * 0.5})`;
        ctx.lineWidth = 1 + pulseIntensity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // ★ 追加：磁気圏の可視化
        if (this.magneticField > 0.8) {
            ctx.strokeStyle = `rgba(0, 255, 255, 0.2)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * this.magneticField * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // ★ 追加：惑星系の描画
    drawPlanetSystem() {
        // 恒星本体
        this.drawNormalBody();

        // 惑星の描画
        this.planets.forEach(planet => {
            const px = this.x + Math.cos(planet.angle) * planet.distance;
            const py = this.y + Math.sin(planet.angle) * planet.distance;

            // 軌道線
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, planet.distance, 0, Math.PI * 2);
            ctx.stroke();

            // 惑星
            const planetGradient = ctx.createRadialGradient(px, py, 0, px, py, planet.size);
            planetGradient.addColorStop(0, '#FFFFFF');
            planetGradient.addColorStop(0.7, planet.color);
            planetGradient.addColorStop(1, planet.color + '88');

            ctx.fillStyle = planetGradient;
            ctx.beginPath();
            ctx.arc(px, py, planet.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ★ 追加：ブラックホール描画
    drawBlackHole() {
        const radius = this.eventHorizonRadius;

        // 降着円盤の描画
        for (let ring = 4; ring >= 1; ring--) {
            const ringRadius = radius * (2 + ring * 0.5);
            const ringGradient = ctx.createRadialGradient(this.x, this.y, radius, this.x, this.y, ringRadius);

            const intensity = 0.3 / ring;
            const rotation = this.blackHoleRotation * ring * 0.5;

            ringGradient.addColorStop(0, 'transparent');
            ringGradient.addColorStop(0.3, `rgba(255, 107, 0, ${intensity})`);
            ringGradient.addColorStop(0.7, `rgba(255, 69, 0, ${intensity * 0.7})`);
            ringGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = ringGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 重力レンズ効果（歪み表現）
        const lensRadius = radius * 4;
        const lensGradient = ctx.createRadialGradient(this.x, this.y, radius, this.x, this.y, lensRadius);
        lensGradient.addColorStop(0, 'transparent');
        lensGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.05)');
        lensGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
        lensGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = lensGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, lensRadius, 0, Math.PI * 2);
        ctx.fill();

        // 事象の地平線（完全な黒）
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 事象の地平線の境界
        ctx.strokeStyle = 'rgba(2, 2, 2, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ★ 追加：通常天体描画（既存のdraw内容を移動）
    drawNormalBody() {
        // 天体描画
        const baseRadius = Math.sqrt(this.mass) * 1.5;
        const pulseMultiplier = 1 + Math.sin(this.pulsePhase) * 0.1;
        const radius = baseRadius * pulseMultiplier;

        // 外側のオーラ（複数層）
        for (let layer = 3; layer >= 1; layer--) {
            const auraRadius = radius * (2 + layer * 0.8);
            const auraGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, auraRadius);
            const intensity = 0.1 / layer;
            auraGradient.addColorStop(0, this.color + Math.floor(intensity * 255).toString(16).padStart(2, '0'));
            auraGradient.addColorStop(0.5, this.color + Math.floor(intensity * 128).toString(16).padStart(2, '0'));
            auraGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // メインの光輪
        const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 2);
        glowGradient.addColorStop(0, this.color + 'AA');
        glowGradient.addColorStop(0.6, this.color + '44');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // コア部分（複数層のグラデーション）
        const coreGradient = ctx.createRadialGradient(
            this.x - radius * 0.3, this.y - radius * 0.3, 0,
            this.x, this.y, radius
        );
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.2, '#ffffff');
        coreGradient.addColorStop(0.4, this.color);
        coreGradient.addColorStop(0.7, this.color + 'CC');
        coreGradient.addColorStop(1, this.color + '88');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 内側のエネルギーコア
        const energyGradient = ctx.createRadialGradient(
            this.x - radius * 0.2, this.y - radius * 0.2, 0,
            this.x, this.y, radius * 0.6
        );
        energyGradient.addColorStop(0, '#ffffff');
        energyGradient.addColorStop(0.5, this.color + 'DD');
        energyGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = energyGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // スペキュラハイライト
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x - radius * 0.4, this.y - radius * 0.4, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * 天体衝突の検出と処理
 */
function handleCollisions() {
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            if (!bodies[i].isValid || !bodies[j].isValid) continue;

            const dx = bodies[j].x - bodies[i].x;
            const dy = bodies[j].y - bodies[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // ★ 修正：衝突判定にスライダーの値を反映
            const radius1 = Math.sqrt(bodies[i].mass) * 1.5;
            const radius2 = Math.sqrt(bodies[j].mass) * 1.5;
            const collisionDistance = (radius1 + radius2) * collisionSensitivity; // ★ 変更：感度パラメータを使用

            if (distance < collisionDistance) {
                // 質量の大きい方を残す（質量が同じ場合はi番目を残す）
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

                // ★ 追加：衝突による角運動量の計算
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
                survivor.mass = Math.min(totalMass, 400); // 最大質量制限
                survivor.trail = []; // 軌跡をリセット

                // 衝突エフェクト生成
                createCollisionEffect(newX, newY, survivor.color, victim.color);

                // 被害者を無効化
                victim.isValid = false;

                // ★ 追加：衝突時刻の記録（パルサー生成判定用）
                survivor.lastCollisionTime = time;
                survivor.collisionImpactSpeed = impactSpeed;

                // ★ 追加：高エネルギー衝突でパルサー化の可能性
                if (impactSpeed > 80 && totalMass >= PULSAR_MASS_THRESHOLD && totalMass < NEUTRON_STAR_MASS_THRESHOLD) {
                    // 30%の確率で衝突によりパルサー化
                    if (Math.random() < 0.3) {
                        survivor.type = 'pulsar';
                        survivor.initializeByType();
                        console.log(`高エネルギー衝突によりパルサー生成！質量: ${survivor.mass.toFixed(1)}, 衝突速度: ${impactSpeed.toFixed(1)}`);
                    }
                }

                console.log(`天体衝突: 質量 ${survivor.mass.toFixed(1)}, 衝突速度 ${impactSpeed.toFixed(1)}`);
                return; // 1フレームに1回の衝突のみ処理
            }
        }
    }
}

/**
 * 衝突エフェクトの生成
 */
function createCollisionEffect(x, y, color1, color2) {
    // 多数のパーティクルを生成
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 3 + Math.random() * 4;
        const px = x + Math.cos(angle) * 10;
        const py = y + Math.sin(angle) * 10;

        // 両方の色からランダムに選択
        const effectColor = Math.random() < 0.5 ? color1 : color2;

        const particle = new Particle(px, py, effectColor);
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.life = 1.5; // 通常より長持ち
        particle.size = 2 + Math.random() * 3;
        particles.push(particle);
    }

    // 中心部の明るいフラッシュ
    for (let i = 0; i < 5; i++) {
        const particle = new Particle(x, y, '#ffffff');
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
        particle.life = 1.0;
        particle.size = 4 + Math.random() * 2;
        particles.push(particle);
    }
}

/**
 * ★ 修正：重力計算の最適化
 */
function calculateGravity(dt) {
    try {
        const G = gravity * 50;
        bodies = bodies.filter(b => b.isValid);
        if (bodies.length < 2) return;

        // 各天体に対する力を計算
        for (let i = 0; i < bodies.length; i++) {
            let fx = 0, fy = 0;

            for (let j = 0; j < bodies.length; j++) {
                if (i === j) continue;

                const dx = bodies[j].x - bodies[i].x;
                const dy = bodies[j].y - bodies[i].y;
                const distSq = dx * dx + dy * dy;

                // ソフトニングパラメータ
                const softening = 100;
                const dist = Math.sqrt(distSq + softening);

                // ★ 修正：ブラックホールの重力効果
                let effectiveG = G;
                if (bodies[j].isBlackHole) {
                    effectiveG *= BLACK_HOLE_GRAVITY_MULTIPLIER;
                }

                // 重力の大きさ
                const F = effectiveG * bodies[i].mass * bodies[j].mass / (dist * dist);

                // 力を分解
                fx += F * dx / dist;
                fy += F * dy / dist;
            }

            // 速度更新
            bodies[i].vx += (fx / bodies[i].mass) * dt;
            bodies[i].vy += (fy / bodies[i].mass) * dt;

            // ★ 修正：速度制限を適切に
            const maxSpeed = 300; // ★ 修正：少し下げる
            const speed = Math.sqrt(bodies[i].vx * bodies[i].vx + bodies[i].vy * bodies[i].vy);
            if (speed > maxSpeed) {
                const factor = maxSpeed / speed;
                bodies[i].vx *= factor;
                bodies[i].vy *= factor;
            }
        }

        // 衝突判定
        if (enableCollisions) {
            handleCollisions();
        }

    } catch (err) {
        console.error('Gravity calculation error:', err);
    }
}

// ★ 修正：エネルギー計算の係数を統一
function calculateEnergy() {
    try {
        const G = gravity * 50; // ★ 修正：calculateGravityと同じ係数
        let kinetic = 0, potential = 0;

        // 運動エネルギー
        bodies.forEach(b => {
            if (!b.isValid) return;
            kinetic += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
        });

        // ポテンシャルエネルギー
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                if (!bodies[i].isValid || !bodies[j].isValid) continue;
                const dx = bodies[j].x - bodies[i].x;
                const dy = bodies[j].y - bodies[i].y;
                const d = Math.sqrt(dx * dx + dy * dy) + 10;
                potential -= G * bodies[i].mass * bodies[j].mass / d;
            }
        }

        return (kinetic + potential) / 10000; // ★ 修正：スケール調整
    } catch {
        return 0;
    }
}

/**
 * FPS計算
 */
function updateFPS() {
    frameCount++;
    const now = Date.now();

    if (now - lastFpsUpdate >= 1000) {
        currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;

        document.getElementById('fpsDisplay').textContent = currentFps;
    }
}

/**
 * メインアニメーションループ
 */
function animate() {
    if (!isRunning) return;

    try {
        // 背景描画
        drawBackground();

        // ★ 追加：パフォーマンス監視
        monitorPerformance();

        // ★ 追加：適応的品質調整
        updateAdaptiveQuality();

        // 重力場描画（最適化レベルに応じて制御）
        if (showGravityField && performanceMonitor.optimizationLevel < 3) {
            calculateAndDrawGravityField();
            ctx.globalAlpha = 1.0;
            ctx.drawImage(gravityFieldCanvas, 0, 0);
        }

        // 物理計算
        const dt = timeStep * speed;
        calculateGravity(dt);

        // 天体更新・描画
        bodies.forEach(body => {
            body.update(dt);
            body.draw(); // ★ 修正：body.draw()を使用（軌跡描画含む）
        });

        // ★ 修正：パーティクル管理の最適化
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].isDead()) {
                particles.splice(i, 1);
            }
        }

        // ★ 修正：パーティクル数制限（最適化レベルに応じて）
        const maxParticles = performanceMonitor.optimizationActive ?
            [500, 300, 200, 100, 50][performanceMonitor.optimizationLevel] : 500;

        if (particles.length > maxParticles) {
            particles.splice(0, particles.length - maxParticles);
        }

        // 時間更新
        time += dt;

        // UI更新
        updateDisplay();
        updateFPS();

        // ★ 追加：定期的なメモリチェック（5秒ごと）
        if (Math.floor(time * 60) % 300 === 0) { // 5秒ごと
            checkMemoryUsage();
        }

        animationId = requestAnimationFrame(animate);

    } catch (error) {
        console.error('Animation error:', error);
        showError('アニメーションエラーが発生しました。');
        stopSimulation();
    }
}

/**
 * 表示更新
 */
function updateDisplay() {
    try {
        const validBodies = bodies.filter(b => b.isValid);
        const typeCounts = {};

        validBodies.forEach(body => {
            const typeName = body.getTypeNameJapanese();
            typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        });

        document.getElementById('bodyCount').textContent = validBodies.length;
        document.getElementById('timeDisplay').textContent = Math.floor(time);

        const energy = calculateEnergy();
        document.getElementById('energyDisplay').textContent = energy.toFixed(0);

        // ★ 変更：天体タイプ別情報を表示
        let typeInfo = '';
        Object.entries(typeCounts).forEach(([type, count]) => {
            if (typeInfo) typeInfo += ', ';
            typeInfo += `${type}:${count}`;
        });

        if (typeInfo) {
            document.getElementById('bodyCount').textContent += ` (${typeInfo})`;
        }

    } catch (error) {
        console.warn('Display update error:', error);
    }
}

/**
 * エラー表示
 */
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 3000);
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
    btn.textContent = '開始';
    btn.classList.remove('active');
}

// コントロール
document.getElementById('playPause').addEventListener('click', () => {
    isRunning = !isRunning;
    const btn = document.getElementById('playPause');
    btn.textContent = isRunning ? '停止' : '開始';
    btn.classList.toggle('active', isRunning);
    if (isRunning) {
        animate();
    }
});

document.getElementById('reset').addEventListener('click', () => {
    if (currentPresetType) {
        setPreset(currentPresetType);
    } else {
        bodies.forEach(body => {
            body.vx = 0;
            body.vy = 0;
            body.trail = [];
            body.isValid = true;
        });
        particles = [];
        time = 0;
        errorCount = 0;
        updateDisplay();

        // ★ 追加：停止中でも天体を描画
        if (!isRunning) {
            drawBackground();
            bodies.forEach(body => {
                if (body.isValid) {
                    body.draw();
                }
            });
        }
    }

    console.log('シミュレーションをリセットしました');
});

document.getElementById('clear').addEventListener('click', () => {
    currentPresetType = null;
    bodies = [];
    particles = [];
    time = 0;
    errorCount = 0;
    updateDisplay();
    drawBackground(); // 停止中でも背景は常に描画

    console.log('天体をクリアしました');
});

// スライダー
document.getElementById('speedSlider').addEventListener('input', (e) => {
    speed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = speed.toFixed(1);
});

document.getElementById('gravitySlider').addEventListener('input', (e) => {
    gravity = parseInt(e.target.value);
    document.getElementById('gravityValue').textContent = gravity;
});

document.getElementById('trailSlider').addEventListener('input', (e) => {
    trailLength = parseInt(e.target.value);
    document.getElementById('trailValue').textContent = trailLength;

    // ★ 追加：軌跡長変更時の最適化リセット
    if (performanceMonitor.optimizationActive) {
        performanceMonitor.originalTrailLength = trailLength;
        console.log(`軌跡長変更: ${trailLength} (最適化中)`);
    }

    // ★ 追加：軌跡長に応じた予防的品質調整
    if (trailLength > 500) {
        const qualityReduction = Math.min(0.8, (trailLength - 500) / 1000);
        performanceMonitor.trailRenderQuality = Math.max(0.2, 1.0 - qualityReduction);
        console.log(`高軌跡長 ${trailLength} - 品質を ${performanceMonitor.trailRenderQuality.toFixed(2)} に予防調整`);
    } else if (!performanceMonitor.optimizationActive) {
        performanceMonitor.trailRenderQuality = 1.0;
    }
});

document.getElementById('trailToggle').addEventListener('click', () => {
    showTrails = !showTrails;
    const btn = document.getElementById('trailToggle');
    btn.classList.toggle('active', showTrails);
    btn.textContent = showTrails ? '軌跡表示' : '軌跡非表示';

    if (!showTrails) {
        bodies.forEach(body => body.trail = []);
    }
});

// ★ 追加：衝突判定切り替えイベント
document.getElementById('collisionToggle').addEventListener('click', () => {
    enableCollisions = !enableCollisions;
    const btn = document.getElementById('collisionToggle');
    btn.classList.toggle('active', enableCollisions);
    btn.textContent = enableCollisions ? '衝突有効' : '衝突無効';
});

// ★ 追加：重力場表示切り替えイベント
document.getElementById('gravityFieldToggle').addEventListener('click', () => {
    showGravityField = !showGravityField;
    const btn = document.getElementById('gravityFieldToggle');
    btn.classList.toggle('active', showGravityField);
    btn.textContent = showGravityField ? '重力場表示' : '重力場非表示';

    if (!showGravityField && gravityFieldCtx) {
        // 重力場を非表示にする時はキャンバスをクリア
        gravityFieldCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
});

// ★ 追加：衝突判定感度スライダーのイベントリスナー
document.getElementById('collisionSensitivitySlider').addEventListener('input', (e) => {
    collisionSensitivity = parseFloat(e.target.value);
    document.getElementById('collisionSensitivityValue').textContent = collisionSensitivity.toFixed(1);
});

// プリセット（初期速度を調整）
function setPreset(type) {
    try {
        currentPresetType = type;
        bodies = [];
        particles = []; // ★ 追加：パーティクルもクリア
        time = 0;
        errorCount = 0;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        switch (type) {
            case 'binary':
                bodies.push(new Body(cx - 40, cy, 30, 30, 35)); // ★ 修正：パラメータ調整
                bodies.push(new Body(cx + 40, cy, -30, -30, 35));
                break;

            case 'triangle':
                const r = 120; // ★ 修正：距離を大きく
                for (let i = 0; i < 3; i++) {
                    const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    const vx = -35 * Math.sin(angle); // ★ 修正：速度調整
                    const vy = 35 * Math.cos(angle);
                    bodies.push(new Body(x, y, vx, vy, 30));
                }
                break;

            case 'figure_eight':
                // ★ 修正：8の字軌道のパラメータ調整
                bodies.push(new Body(cx, cy, 25, 38, 28));
                bodies.push(new Body(cx - 180, cy, -12.5, -19, 28));
                bodies.push(new Body(cx + 180, cy, -12.5, -19, 28));
                break;

            case 'random':
                const count = 3 + Math.floor(Math.random() * 3); // ★ 修正：最大数を減らす
                for (let i = 0; i < count; i++) {
                    const x = 120 + Math.random() * (canvas.width - 240); // ★ 修正：マージン拡大
                    const y = 120 + Math.random() * (canvas.height - 240);
                    const vx = (Math.random() - 0.5) * 60; // ★ 修正：速度範囲調整
                    const vy = (Math.random() - 0.5) * 60;
                    const mass = 20 + Math.random() * 25; // ★ 修正：質量範囲調整
                    bodies.push(new Body(x, y, vx, vy, mass));
                }
                break;
        }

        updateDisplay();
        drawBackground();

        // 自動開始
        if (!isRunning) {
            isRunning = true;
            const btn = document.getElementById('playPause');
            btn.textContent = '停止';
            btn.classList.add('active');
            animate();
        }

    } catch (error) {
        console.error('Preset error:', error);
        showError('プリセット設定エラーが発生しました。');
    }
}

/**
 * 背景描画（星のきらめき効果追加）
 */
function drawBackground() {
    if (!backgroundGenerated) {
        generateStars();
    }

    // グラデーション背景
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
    );
    gradient.addColorStop(0, 'rgba(20, 20, 45, 0.95)');
    gradient.addColorStop(0.5, 'rgba(15, 15, 35, 0.97)');
    gradient.addColorStop(1, 'rgba(10, 10, 25, 0.98)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 星空効果（きらめき追加）
    for (let star of stars) {
        star.twinkle += 0.02;
        const twinkleIntensity = (Math.sin(star.twinkle) + 1) * 0.5;
        const opacity = star.opacity * twinkleIntensity;

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // 明るい星にはグロー効果
        if (star.size > 1.5) {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function findBodyAt(x, y) {
    for (let body of bodies) {
        if (!body.isValid) continue;
        const dx = x - body.x;
        const dy = y - body.y;
        const radius = Math.sqrt(body.mass) * 1.5;
        if (dx * dx + dy * dy <= radius * radius) {
            return body;
        }
    }
    return null;
}

// ★ 追加：ツールチップ関連変数
let hoveredBody = null;
let tooltip = null;
let mousePos = { x: 0, y: 0 };

/**
 * ★ 追加：ツールチップの初期化
 */
function initializeTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
}

/**
 * ★ 追加：天体の詳細情報を取得
 */
function getBodyInfo(body) {
    const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
    const kineticEnergy = 0.5 * body.mass * speed * speed;

    // 他の天体との相互作用エネルギーを計算
    let potentialEnergy = 0;
    const G = gravity * 50;

    bodies.forEach(otherBody => {
        if (otherBody !== body && otherBody.isValid) {
            const dx = otherBody.x - body.x;
            const dy = otherBody.y - body.y;
            const distance = Math.sqrt(dx * dx + dy * dy) + 10;
            potentialEnergy -= G * body.mass * otherBody.mass / distance;
        }
    });

    const totalEnergy = (kineticEnergy + potentialEnergy / 2) / 1000; // スケール調整

    return {
        type: body.getTypeNameJapanese(),
        mass: body.mass.toFixed(1),
        speed: speed.toFixed(1),
        kineticEnergy: (kineticEnergy / 1000).toFixed(1),
        potentialEnergy: (potentialEnergy / 2000).toFixed(1), // 重複カウント回避
        totalEnergy: totalEnergy.toFixed(1),
        magneticField: body.magneticField ? body.magneticField.toFixed(2) : null,
        temperature: body.temperature ? body.temperature.toFixed(2) : null,
        rotationPeriod: body.rotationPeriod ? body.rotationPeriod.toFixed(3) : null,
        age: body.pulsarAge ? Math.floor(body.pulsarAge) : null,
        planets: body.planets ? body.planets.length : null
    };
}

/**
 * ★ 追加：ツールチップの更新
 */
function updateTooltip(body, x, y) {
    if (!tooltip || !body) return;

    const info = getBodyInfo(body);

    // ツールチップのクラスを更新（天体タイプに応じた色分け）
    tooltip.className = `tooltip ${body.type}`;

    let content = `<div class="tooltip-title">${info.type}</div>`;

    // 基本情報
    content += `<div class="tooltip-row">
                <span class="tooltip-label">質量:</span>
                <span class="tooltip-value">${info.mass}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">速度:</span>
                <span class="tooltip-value">${info.speed}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">運動エネルギー:</span>
                <span class="tooltip-value">${info.kineticEnergy}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">位置エネルギー:</span>
                <span class="tooltip-value">${info.potentialEnergy}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">総エネルギー:</span>
                <span class="tooltip-value">${info.totalEnergy}</span>
            </div>`;

    // 天体タイプ別の追加情報
    switch (body.type) {
        case 'pulsar':
            if (info.magneticField) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">磁場強度:</span>
                            <span class="tooltip-value">${info.magneticField}</span>
                        </div>`;
            }
            if (info.rotationPeriod) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">回転周期:</span>
                            <span class="tooltip-value">${info.rotationPeriod}s</span>
                        </div>`;
            }
            if (info.age !== null) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">年齢:</span>
                            <span class="tooltip-value">${info.age}</span>
                        </div>`;
            }
            break;

        case 'neutronStar':
            if (info.magneticField) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">磁場強度:</span>
                            <span class="tooltip-value">${info.magneticField}</span>
                        </div>`;
            }
            break;

        case 'whiteDwarf':
            if (info.temperature) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">温度係数:</span>
                            <span class="tooltip-value">${info.temperature}</span>
                        </div>`;
            }
            break;

        case 'blackHole':
            const eventHorizonRadius = body.eventHorizonRadius ? body.eventHorizonRadius.toFixed(1) : 'N/A';
            content += `<div class="tooltip-row">
                        <span class="tooltip-label">事象地平線:</span>
                        <span class="tooltip-value">${eventHorizonRadius}</span>
                    </div>`;
            break;

        case 'planetSystem':
            if (info.planets !== null) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">惑星数:</span>
                            <span class="tooltip-value">${info.planets}個</span>
                        </div>`;
            }
            break;
    }

    tooltip.innerHTML = content;

    // 位置調整（画面端での表示を考慮）
    const rect = canvas.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + x + 15;
    let top = rect.top + y - 10;

    // 右端チェック
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = rect.left + x - tooltipRect.width - 15;
    }

    // 下端チェック
    if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top + y - tooltipRect.height - 15;
    }

    // 上端チェック
    if (top < 10) {
        top = rect.top + y + 15;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
}

/**
 * ★ 追加：ツールチップの非表示
 */
function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    hoveredBody = null;
}

// ★ 修正：マウスイベント処理を拡張
function getEventPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function findBodyAt(x, y) {
    for (let body of bodies) {
        if (!body.isValid) continue;
        const dx = x - body.x;
        const dy = y - body.y;
        const radius = Math.sqrt(body.mass) * 1.5;
        if (dx * dx + dy * dy <= radius * radius) {
            return body;
        }
    }
    return null;
}

// ★ 追加：マウス移動時の処理
function handleMouseMove(e) {
    if (isDragging && selectedBody) {
        const pos = getEventPos(e);
        selectedBody.x = pos.x - dragOffset.x;
        selectedBody.y = pos.y - dragOffset.y;
        selectedBody.vx = 0;
        selectedBody.vy = 0;
        selectedBody.trail = [];
        return;
    }

    // ツールチップ処理
    const pos = getEventPos(e);
    mousePos = pos;

    const bodyAtMouse = findBodyAt(pos.x, pos.y);

    if (bodyAtMouse && bodyAtMouse !== hoveredBody) {
        hoveredBody = bodyAtMouse;
        updateTooltip(bodyAtMouse, pos.x, pos.y);
        canvas.style.cursor = 'pointer';
    } else if (!bodyAtMouse && hoveredBody) {
        hideTooltip();
        canvas.style.cursor = 'crosshair';
    } else if (bodyAtMouse === hoveredBody && tooltip && tooltip.style.display === 'block') {
        // 同じ天体の上でマウスが動いている場合、位置のみ更新
        updateTooltip(bodyAtMouse, pos.x, pos.y);
    }
}

// タッチ・マウスイベントの登録
canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    if (isDragging) {
        handleMove(e);
    }
}, { passive: false });
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMouseMove); // ★ 修正：新しいハンドラーを使用
canvas.addEventListener('touchend', handleEnd);
canvas.addEventListener('mouseup', handleEnd);

// ★ 追加：マウスがキャンバスから離れた時の処理
canvas.addEventListener('mouseleave', hideTooltip);

function handleStart(e) {
    e.preventDefault();
    const pos = getEventPos(e);
    const body = findBodyAt(pos.x, pos.y);

    if (body) {
        selectedBody = body;
        isDragging = true;
        dragOffset.x = pos.x - body.x;
        dragOffset.y = pos.y - body.y;
        canvas.style.cursor = 'grabbing';
        hideTooltip(); // ドラッグ開始時はツールチップを非表示
    } else {
        // ★ 修正：シミュレーション状態に関係なく新しい天体を作成
        if (bodies.length < 20) {
            const newBody = new Body(pos.x, pos.y,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                20 + Math.random() * 15);
            bodies.push(newBody);

            // ★ 追加：プリセット状態をクリアして手動配置モードに移行
            if (currentPresetType) {
                console.log(`手動天体追加により${currentPresetType}プリセット状態を解除`);
                currentPresetType = null;
            }

            updateDisplay();

            // ★ 追加：シミュレーション停止中でも天体を描画
            if (!isRunning) {
                drawBackground();
                // 全ての天体を描画
                bodies.forEach(body => {
                    if (body.isValid) {
                        body.draw();
                    }
                });
                console.log(`停止中に新しい天体を追加: 座標(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}), 質量${newBody.mass.toFixed(1)}`);
            } else {
                console.log(`新しい天体を追加: 座標(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}), 質量${newBody.mass.toFixed(1)}`);
            }
        } else {
            console.warn('天体数が上限（20個）に達しています');
            showError('天体数が上限（20個）に達しています。クリアしてから追加してください。');
        }
        hideTooltip();
    }
}

function handleMove(e) {
    if (isDragging && selectedBody) {
        e.preventDefault();
        const pos = getEventPos(e);
        selectedBody.x = pos.x - dragOffset.x;
        selectedBody.y = pos.y - dragOffset.y;
        selectedBody.vx = 0;
        selectedBody.vy = 0;
        selectedBody.trail = [];

        // ★ 追加：ドラッグ中にシミュレーション停止中でも描画を更新
        if (!isRunning) {
            drawBackground();
            bodies.forEach(body => {
                if (body.isValid) {
                    body.draw();
                }
            });
        }
    }
}

function handleEnd(e) {
    // ★ 追加：ドラッグ終了時に停止中なら最終描画
    if (isDragging && selectedBody && !isRunning) {
        drawBackground();
        bodies.forEach(body => {
            if (body.isValid) {
                body.draw();
            }
        });
    }

    isDragging = false;
    selectedBody = null;
    canvas.style.cursor = 'crosshair';
}

// 初期化
try {
    // ★ 修正：ヘルプボタンイベントを初期化セクションで確実に設定
    const helpButton = document.getElementById('helpButton');
    const helpOverlay = document.getElementById('helpOverlay');
    const helpPopup = document.getElementById('helpPopup');
    const helpCloseButton = document.getElementById('helpCloseButton');

    if (helpButton && helpOverlay && helpPopup && helpCloseButton) {
        // ヘルプボタンクリック
        helpButton.addEventListener('click', () => {
            helpOverlay.style.display = 'block';
            helpPopup.style.display = 'block';
            console.log('ヘルプポップアップを表示しました');
        });

        // 閉じるボタンクリック
        helpCloseButton.addEventListener('click', () => {
            helpOverlay.style.display = 'none';
            helpPopup.style.display = 'none';
            console.log('ヘルプポップアップを閉じました');
        });

        // オーバーレイクリック
        helpOverlay.addEventListener('click', () => {
            helpOverlay.style.display = 'none';
            helpPopup.style.display = 'none';
            console.log('オーバーレイクリックでヘルプを閉じました');
        });

        // ESCキーでヘルプを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && helpPopup.style.display === 'block') {
                helpOverlay.style.display = 'none';
                helpPopup.style.display = 'none';
                console.log('ESCキーでヘルプを閉じました');
            }
        });

        console.log('ヘルプ機能が正常に初期化されました');
    } else {
        console.error('ヘルプ要素が見つかりません:', {
            helpButton: !!helpButton,
            helpOverlay: !!helpOverlay,
            helpPopup: !!helpPopup,
            helpCloseButton: !!helpCloseButton
        });
    }

    // ★ 追加：ツールチップの初期化
    initializeTooltip();

    // スライダーの初期値を設定
    document.getElementById('speedValue').textContent = speed.toFixed(1);
    document.getElementById('gravityValue').textContent = gravity;
    document.getElementById('trailValue').textContent = trailLength;
    // ★ 追加：衝突判定感度の初期値設定

    document.getElementById('collisionSensitivityValue').textContent = collisionSensitivity.toFixed(1);

    // 重力場キャンバスの初期化
    setupGravityFieldCanvas();

    updateDisplay();
    drawBackground();

    // ★ 修正：パフォーマンス監視の改善（初期化考慮）
    setInterval(() => {
        // ★ 追加：初期化期間中は詳細ログを出力しない
        if (performanceMonitor.isInitializing) {
            return;
        }

        if (bodies.length > 0 && performanceMonitor.fpsHistory.length > 0) {
            const avgFps = performanceMonitor.fpsHistory.reduce((a, b) => a + b, 0) / performanceMonitor.fpsHistory.length;
            const totalTrailPoints = bodies.reduce((sum, body) => sum + body.trail.length, 0);

            console.log(`📊 パフォーマンス統計:`, {
                平均FPS: avgFps.toFixed(1),
                現在FPS: performanceMonitor.currentFps,
                総軌跡点数: totalTrailPoints,
                最適化レベル: performanceMonitor.optimizationLevel,
                軌跡品質: (performanceMonitor.trailRenderQuality * 100).toFixed(0) + '%',
                パーティクル数: particles.length,
                連続低FPS回数: performanceMonitor.consecutiveLowFps,
                メモリ使用量: performance.memory ? `${(performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1)}MB` : '不明'
            });

            // 極端に軌跡が長い場合の緊急最適化
            if (totalTrailPoints > 100000) {
                console.warn('🚨 軌跡点数が危険域に到達 - 緊急最適化実行');
                executeEmergencyOptimization();
            }
        }
    }, 10000); // 10秒ごと

    console.log('🚀 三体問題シミュレータが初期化されました（改良版パフォーマンス監視機能付き）');

} catch (error) {
    console.error('Initialization error:', error);
    showError('初期化エラーが発生しました。');
}

/**
 * ★ 追加：最適化された軌跡描画関数
 */
function drawOptimizedTrail(body) {
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