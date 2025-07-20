'use strict';

import { GRAPHICS_CONFIG } from './constants.js';
import { calculateGravityFieldStrength } from './physics.js';
import { CosmicBackground } from './visual-effects/cosmic-background.js';
import { DynamicBodyRenderer } from './visual-effects/dynamic-bodies.js';

// 星の背景用変数（レガシー）
let stars = [];
let backgroundGenerated = false;

// 新しいビジュアルエフェクトシステム
let cosmicBackground = null;
let dynamicBodyRenderer = null;

// 重力場可視化関連
let gravityFieldCanvas = null;
let gravityFieldCtx = null;
let gravityFieldUpdateCounter = 0;

// ★ 追加：重力レンズ効果用
let lensCanvas = null;
let lensCtx = null;

/**
 * 星の背景生成（最適化）
 */
export function generateStars(canvas) {
    stars = [];
    const starCount = Math.min(GRAPHICS_CONFIG.MAX_STARS,
        Math.floor((canvas.width * canvas.height) / GRAPHICS_CONFIG.STAR_COUNT_FACTOR));

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
 * 背景描画（新しい動的背景システム使用）
 */
export function drawBackground(ctx, canvas) {
    // 新しい動的背景システムの初期化
    if (!cosmicBackground) {
        cosmicBackground = new CosmicBackground(canvas, ctx);
        console.log('🌌 動的背景システム初期化完了');
    }
    
    // 動的背景の更新と描画
    const deltaTime = 16; // 約60FPS
    cosmicBackground.update(deltaTime);
    cosmicBackground.render();
}

/**
 * ★ 追加：重力レンズキャンバス設定
 */
export function setupGravityLensCanvas(canvas) {
    if (!lensCanvas) {
        lensCanvas = document.createElement('canvas');
        lensCtx = lensCanvas.getContext('2d');
    }
    lensCanvas.width = canvas.width;
    lensCanvas.height = canvas.height;
}

/**
 * ★ 追加：アインシュタインリング描画
 */
// ★ 削除：重複描画関数（dynamic-bodies.jsで代替）
// export function drawEinsteinRings(ctx, bodies) {
//     // この関数は dynamic-bodies.js の renderBlackHole() で代替されました
// }

/**
 * ★ 削除：重複描画関数（dynamic-bodies.jsで代替）
 */
// function drawGravityLensEffect(ctx, blackHole, bodies) {
//     // この関数は dynamic-bodies.js の renderBlackHole() で代替されました
// }

/**
 * ★ 削除：重複描画関数（dynamic-bodies.jsで代替）
 */
// function drawSimpleEinsteinRings(ctx, x, y, baseRadius, mass) {
//     const time = Date.now() * 0.001;

//     // 重複関数のため削除（dynamic-bodies.jsで代替）
// }

/**
 * ★ 削除：重複描画関数（dynamic-bodies.jsで代替）
 */
// function drawSimpleEventHorizonBorder(ctx, x, y, radius) {
//     // 重複関数のため削除
// }

/**
 * ★ 削除：重複描画関数（dynamic-bodies.jsで代替）
 */
// ★ 削除：重複する降着円盤・ジェット描画関数群
// これらの関数は dynamic-bodies.js で高品質版が実装済み

/**
 * 重力場キャンバス設定
 */
export function setupGravityFieldCanvas(canvas) {
    if (!gravityFieldCanvas) {
        gravityFieldCanvas = document.createElement('canvas');
        gravityFieldCtx = gravityFieldCanvas.getContext('2d');
    }
    gravityFieldCanvas.width = canvas.width;
    gravityFieldCanvas.height = canvas.height;

    // ★ 追加：重力レンズキャンバスも設定
    setupGravityLensCanvas(canvas);
}

/**
 * 重力場計算・描画
 */
export function calculateAndDrawGravityField(canvas, bodies, gravity, showGravityField) {
    if (!showGravityField || bodies.length === 0) return null;

    gravityFieldUpdateCounter++;
    if (gravityFieldUpdateCounter % 3 !== 0) return gravityFieldCanvas;

    const width = canvas.width;
    const height = canvas.height;
    const stepX = width / GRAPHICS_CONFIG.GRAVITY_FIELD_RESOLUTION;
    const stepY = height / GRAPHICS_CONFIG.GRAVITY_FIELD_RESOLUTION;

    gravityFieldCtx.clearRect(0, 0, width, height);

    // 重力場強度を計算
    let minFieldStrength = Infinity;
    let maxFieldStrength = -Infinity;
    const fieldStrengths = [];

    for (let i = 0; i <= GRAPHICS_CONFIG.GRAVITY_FIELD_RESOLUTION; i++) {
        fieldStrengths[i] = [];
        for (let j = 0; j <= GRAPHICS_CONFIG.GRAVITY_FIELD_RESOLUTION; j++) {
            const x = i * stepX;
            const y = j * stepY;
            const fieldStrength = calculateGravityFieldStrength(x, y, bodies, gravity);
            fieldStrengths[i][j] = fieldStrength;

            if (fieldStrength < minFieldStrength) minFieldStrength = fieldStrength;
            if (fieldStrength > maxFieldStrength) maxFieldStrength = fieldStrength;
        }
    }

    // 対数スケールで正規化
    const logMin = Math.log10(Math.max(minFieldStrength, 0.001));
    const logMax = Math.log10(Math.max(maxFieldStrength, 0.001));

    // 重力場を描画
    for (let i = 0; i < GRAPHICS_CONFIG.GRAVITY_FIELD_RESOLUTION; i++) {
        for (let j = 0; j < GRAPHICS_CONFIG.GRAVITY_FIELD_RESOLUTION; j++) {
            const x = i * stepX;
            const y = j * stepY;
            const fieldStrength = fieldStrengths[i][j];

            let normalizedStrength = 0;
            if (fieldStrength > 0.001 && logMax !== logMin) {
                const logValue = Math.log10(fieldStrength);
                normalizedStrength = (logValue - logMin) / (logMax - logMin);
                normalizedStrength = Math.max(0, Math.min(1, normalizedStrength));
            }

            const color = getEnhancedHeatmapColor(normalizedStrength);
            gravityFieldCtx.fillStyle = color;
            gravityFieldCtx.fillRect(x, y, stepX + 1, stepY + 1);
        }
    }

    return gravityFieldCanvas;
}

/**
 * ヒートマップ色生成
 */
function getEnhancedHeatmapColor(value) {
    value = Math.max(0, Math.min(1, value));
    let r, g, b, alpha;

    if (value < 0.1) {
        const t = value / 0.1;
        r = Math.floor(t * 50);
        g = 0;
        b = Math.floor(t * 100);
        alpha = t * 0.1;
    } else if (value < 0.3) {
        const t = (value - 0.1) / 0.2;
        r = Math.floor(50 + t * 50);
        g = Math.floor(t * 100);
        b = Math.floor(100 + t * 155);
        alpha = 0.1 + t * 0.15;
    } else if (value < 0.5) {
        const t = (value - 0.3) / 0.2;
        r = Math.floor(100 - t * 100);
        g = Math.floor(100 + t * 155);
        b = 255;
        alpha = 0.25 + t * 0.15;
    } else if (value < 0.7) {
        const t = (value - 0.5) / 0.2;
        r = 0;
        g = 255;
        b = Math.floor(255 - t * 255);
        alpha = 0.4 + t * 0.15;
    } else if (value < 0.85) {
        const t = (value - 0.7) / 0.15;
        r = Math.floor(t * 255);
        g = 255;
        b = 0;
        alpha = 0.55 + t * 0.15;
    } else if (value < 0.95) {
        const t = (value - 0.85) / 0.1;
        r = 255;
        g = Math.floor(255 - t * 100);
        b = 0;
        alpha = 0.7 + t * 0.15;
    } else {
        const t = (value - 0.95) / 0.05;
        r = 255;
        g = Math.floor(155 * (1 - t) + 255 * t);
        b = Math.floor(255 * t);
        alpha = 0.85 + t * 0.15;
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * キャンバスサイズ変更時の処理
 */
export function handleCanvasResize(canvas) {
    generateStars(canvas);
    setupGravityFieldCanvas(canvas);
    setupGravityLensCanvas(canvas);
    
    // 新しい背景システムのリサイズ対応
    if (cosmicBackground) {
        cosmicBackground.handleResize(canvas.width, canvas.height);
    }
}

/**
 * 動的天体レンダラーの取得（必要に応じて初期化）
 */
export function getDynamicBodyRenderer(ctx) {
    if (!dynamicBodyRenderer) {
        dynamicBodyRenderer = new DynamicBodyRenderer();
        console.log('✨ 動的天体レンダラー初期化完了');
    }
    return dynamicBodyRenderer;
}

/**
 * ビジュアルエフェクト品質設定
 */
export function setVisualQuality(qualityLevel) {
    if (cosmicBackground) {
        cosmicBackground.adjustQuality(60 * qualityLevel);
    }
    if (dynamicBodyRenderer) {
        dynamicBodyRenderer.setQualityLevel(qualityLevel);
    }
    console.log(`🎨 ビジュアル品質設定: ${qualityLevel}`);
}
