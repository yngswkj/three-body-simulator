'use strict';

import { GRAPHICS_CONFIG } from './constants.js';
import { calculateGravityFieldStrength } from './physics.js';

// 星の背景用変数
let stars = [];
let backgroundGenerated = false;

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
 * 背景描画（星のきらめき効果追加）
 */
export function drawBackground(ctx, canvas) {
    if (!backgroundGenerated) {
        generateStars(canvas);
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
export function drawEinsteinRings(ctx, bodies) {
    const blackHoles = bodies.filter(body => body.type === 'blackHole' && body.isValid);

    if (blackHoles.length === 0) return;

    blackHoles.forEach(blackHole => {
        drawGravityLensEffect(ctx, blackHole, bodies);
    });
}

/**
 * ★ 軽量化：重力レンズ効果描画（アインシュタインリングと降着円盤のみ）
 */
function drawGravityLensEffect(ctx, blackHole, bodies) {
    const bhX = blackHole.x;
    const bhY = blackHole.y;
    const mass = blackHole.mass;

    // シュヴァルツシルト半径の計算（簡略化）
    const schwarzschildRadius = Math.max(8, Math.sqrt(mass) * 0.9);

    // 各種半径の計算
    const einsteinRadius = schwarzschildRadius * 3.5;

    ctx.save();

    // ★ 1. 強化された降着円盤（維持）
    drawEnhancedAccretionDisk(ctx, bhX, bhY, schwarzschildRadius, mass);

    // ★ 2. シンプルなアインシュタインリング
    drawSimpleEinsteinRings(ctx, bhX, bhY, einsteinRadius, mass);

    // ★ 3. 事象の地平線（シンプルな球体）
    ctx.fillStyle = blackHole.color || '#000000';
    ctx.beginPath();
    ctx.arc(bhX, bhY, schwarzschildRadius, 0, Math.PI * 2);
    ctx.fill();

    // ★ 4. シンプルな境界グロー
    drawSimpleEventHorizonBorder(ctx, bhX, bhY, schwarzschildRadius);

    ctx.restore();
}

/**
 * ★ 軽量化：シンプルなアインシュタインリング
 */
function drawSimpleEinsteinRings(ctx, x, y, baseRadius, mass) {
    const time = Date.now() * 0.001;

    // 主要なリング（3つに削減）
    for (let i = 1; i <= 3; i++) {
        const ringRadius = baseRadius * (0.8 + i * 0.4);
        const intensity = 0.6 / Math.sqrt(i);
        const tidalStretch = 1 + (0.2 / i); // 軽量化：引き伸ばし効果を削減

        // 軽量化：振動効果を削減
        const oscillation = Math.sin(time * 1.0 + i) * 1.0;

        ctx.save();
        ctx.translate(x, y);

        // シンプルなリング描画
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.7})`;
        ctx.lineWidth = 4 / i;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius * tidalStretch + oscillation, ringRadius + oscillation * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 内側の明るいリング
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.5})`;
        ctx.lineWidth = 2 / i;
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius * tidalStretch + oscillation, ringRadius + oscillation * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // 二次的なリング（2つに削減）
    for (let i = 1; i <= 2; i++) {
        const ringRadius = baseRadius * (2 + i * 0.8);
        const intensity = 0.15 / i;
        const extremeStretch = 1 + (0.5 / i);

        ctx.save();
        ctx.translate(x, y);

        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, ringRadius * extremeStretch, ringRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }
}

/**
 * ★ 軽量化：シンプルな事象の地平線境界効果
 */
function drawSimpleEventHorizonBorder(ctx, x, y, radius) {
    // シンプルな境界グロー
    const gradient = ctx.createRadialGradient(x, y, radius - 1, x, y, radius + 2);
    gradient.addColorStop(0, 'rgba(255, 100, 100, 0)');
    gradient.addColorStop(0.8, 'rgba(255, 100, 100, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
}

/**
 * ★ 軽量化：降着円盤（レイヤー数を削減）
 */
function drawEnhancedAccretionDisk(ctx, x, y, radius, mass) {
    const diskInnerRadius = radius * 1.5;
    const diskOuterRadius = radius * 4; // 外径を削減
    const time = Date.now() * 0.001;

    // レイヤー数を削減（3→2）
    for (let layer = 0; layer < 2; layer++) {
        const layerOffset = layer * 0.5;
        const rotationSpeed = 0.5 + layer * 0.2;

        // 描画間隔を広げて軽量化
        for (let r = diskInnerRadius; r < diskOuterRadius; r += 2.5) {
            const alpha = Math.max(0.05, 0.5 * (diskOuterRadius - r) / (diskOuterRadius - diskInnerRadius));
            const temp = 1.0 - (r - diskInnerRadius) / (diskOuterRadius - diskInnerRadius);

            // 温度カラーマップ（維持）
            let red, green, blue;
            if (temp > 0.8) {
                red = 255;
                green = 255;
                blue = Math.floor(255 * (temp - 0.8) / 0.2);
            } else if (temp > 0.6) {
                red = 255;
                green = Math.floor(255 * (temp - 0.6) / 0.2);
                blue = 50;
            } else if (temp > 0.4) {
                red = 255;
                green = Math.floor(100 * (temp - 0.4) / 0.2);
                blue = 0;
            } else if (temp > 0.2) {
                red = Math.floor(255 * (temp - 0.2) / 0.2);
                green = 50;
                blue = 0;
            } else {
                red = Math.floor(150 * temp / 0.2);
                green = 0;
                blue = 0;
            }

            ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
            ctx.lineWidth = 1;

            // スパイラル描画（角度間隔を広げて軽量化）
            ctx.beginPath();
            for (let angle = 0; angle < Math.PI * 4; angle += 0.15) { // 0.08→0.15に変更
                const rotatedAngle = angle + time * rotationSpeed + layerOffset;
                const spiralR = r + Math.sin(rotatedAngle * 4) * 2;
                const px = x + spiralR * Math.cos(rotatedAngle);
                const py = y + spiralR * Math.sin(rotatedAngle);

                if (angle === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();
        }
    }

    // ジェット効果（簡略化）
    drawSimpleAccretionJets(ctx, x, y, radius, mass);
}

/**
 * ★ 軽量化：シンプルなジェット効果
 */
function drawSimpleAccretionJets(ctx, x, y, radius, mass) {
    const jetLength = radius * 6; // 長さを削減
    const time = Date.now() * 0.001;

    for (let direction of [-1, 1]) {
        const jetEndY = y + direction * jetLength;

        // メインジェットのみ
        const coreGradient = ctx.createLinearGradient(x, y, x, jetEndY);
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        coreGradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.4)');
        coreGradient.addColorStop(1, 'rgba(100, 150, 255, 0.1)');

        ctx.strokeStyle = coreGradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, jetEndY);
        ctx.stroke();

        // 外側構造を簡略化（5→2に削減）
        for (let i = 1; i <= 2; i++) {
            const width = radius * 0.2 * i;
            const alpha = 0.2 / i;

            ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - width, y);
            ctx.lineTo(x - width * 0.5, jetEndY);
            ctx.moveTo(x + width, y);
            ctx.lineTo(x + width * 0.5, jetEndY);
            ctx.stroke();
        }
    }
}

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
    setupGravityLensCanvas(canvas); // ★ 追加
}
