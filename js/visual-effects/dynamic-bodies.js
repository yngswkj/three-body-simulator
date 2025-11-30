'use strict';

/**
 * 動的天体表現システム
 * GAME_ENHANCEMENT_PLAN.md Phase G1.3の実装
 * 天体の状態（温度、密度、活動性など）を美しく視覚化
 */

/**
 * 動的天体レンダラークラス
 */
export class DynamicBodyRenderer {
    constructor() {
        // 描画品質制御
        this.qualityLevel = 1.0;
        this.detailLevel = 1.0;

        // アニメーション制御
        this.animationTime = 0;
        this.lastUpdate = Date.now();

        // エフェクトキャッシュ
        this.effectCache = new Map();
        this.gradientCache = new Map();

        // 物理定数
        this.STEFAN_BOLTZMANN = 5.67e-8; // シュテファン=ボルツマン定数（簡略化）
        this.TEMP_COLOR_MAP = this.initializeTemperatureColorMap();

        console.log('🎨 動的天体レンダラー初期化完了');
    }

    /**
     * 温度-色マッピングの初期化
     */
    initializeTemperatureColorMap() {
        return {
            // 温度（K）: RGB値
            50000: [155, 176, 255],    // 極高温（青白）
            30000: [170, 191, 255],    // 高温（青白）
            10000: [202, 215, 255],    // 青白星
            7500: [248, 247, 255],    // 白色星
            6000: [255, 244, 234],    // 太陽型（黄白）
            5200: [255, 210, 161],    // 黄色星
            3700: [255, 204, 111],    // オレンジ星
            2400: [255, 159, 104],    // 赤色星
            1000: [255, 71, 71],      // 極低温（赤）
        };
    }

    /**
     * 時間更新
     */
    update(deltaTime) {
        this.animationTime += deltaTime;

        // キャッシュクリーンアップ（メモリ管理）
        if (this.animationTime % 10000 < deltaTime) { // 10秒ごと
            this.cleanupCache();
        }
    }

    /**
     * キャッシュクリーンアップ
     */
    cleanupCache() {
        if (this.effectCache.size > 100) {
            this.effectCache.clear();
        }
        if (this.gradientCache.size > 50) {
            this.gradientCache.clear();
        }
    }

    /**
     * 恒星の描画
     */
    renderStar(ctx, body) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // 加算合成で恒星を輝かせる

        const coreActivity = this.calculateStellarActivity(body);

        // コロナ効果
        this.renderCorona(ctx, body, coreActivity);

        // 表面活動（太陽黒点、フレア）
        this.renderStellarSurface(ctx, body);

        // 恒星風の可視化
        this.renderStellarWind(ctx, body, coreActivity);

        // 核融合の脈動
        this.renderNuclearPulsation(ctx, body, coreActivity);

        ctx.restore();
    }

    /**
     * 恒星活動度の計算
     */
    calculateStellarActivity(body) {
        // 質量、年齢、磁場強度に基づく
        const massActivity = Math.log10(body.mass / 30) * 0.3;
        const magneticActivity = (body.magneticField || 0) * 0.4;
        const randomVariation = Math.sin(this.animationTime * 0.001 + body.id * 17) * 0.3;

        return Math.max(0.1, Math.min(2.0, 1.0 + massActivity + magneticActivity + randomVariation));
    }

    /**
     * コロナ効果の描画
     */
    renderCorona(ctx, body, activity) {
        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 30;
        const radius = body.radius || Math.sqrt(safeMass) * 1.5;
        const safeRadius = isFinite(radius) && radius > 0 ? radius : 10;
        const safeActivity = isFinite(activity) ? Math.max(0, Math.min(2, activity)) : 0.5;
        const coronaRadius = safeRadius * (2 + safeActivity);

        // 温度によるコロナ色
        const temperature = 1000000 + safeActivity * 500000; // コロナ温度（K）
        const coronaColor = this.temperatureToColor(temperature);

        // 座標の安全性確認
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        // 多層コロナ
        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = coronaRadius * (1 + layer * 0.3);
            const intensity = (0.15 - layer * 0.04) * safeActivity;

            // 全ての値が有限であることを確認
            if (!isFinite(safeX) || !isFinite(safeY) || !isFinite(safeRadius) || !isFinite(layerRadius)) {
                continue;
            }

            const gradient = ctx.createRadialGradient(
                safeX, safeY, safeRadius,
                safeX, safeY, layerRadius
            );

            gradient.addColorStop(0, `rgba(${coronaColor.join(',')}, ${intensity})`);
            gradient.addColorStop(0.5, `rgba(${coronaColor.join(',')}, ${intensity * 0.6})`);
            gradient.addColorStop(1, `rgba(${coronaColor.join(',')}, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(safeX, safeY, layerRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // コロナのフィラメント構造
        this.renderCoronalFilaments(ctx, body, coronaRadius, safeActivity);
    }

    /**
     * コロナフィラメントの描画
     */
    renderCoronalFilaments(ctx, body, coronaRadius, activity) {
        // 安全な値の確保
        const safeActivity = isFinite(activity) ? Math.max(0, Math.min(2, activity)) : 0.5;
        const safeCoronaRadius = isFinite(coronaRadius) && coronaRadius > 0 ? coronaRadius : 20;
        const filamentCount = Math.floor(8 * safeActivity * this.qualityLevel);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 座標の安全性確認
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;
        const safeBodyRadius = isFinite(body.radius) && body.radius > 0 ? body.radius : 10;

        for (let i = 0; i < filamentCount; i++) {
            const angle = (i / filamentCount) * Math.PI * 2 + this.animationTime * 0.0001;
            const length = safeCoronaRadius * (0.5 + Math.random() * 0.8);
            const width = 2 + Math.random() * 3;

            const startX = safeX + Math.cos(angle) * safeBodyRadius;
            const startY = safeY + Math.sin(angle) * safeBodyRadius;
            const endX = safeX + Math.cos(angle) * length;
            const endY = safeY + Math.sin(angle) * length;

            // 座標値の安全性確認
            if (!isFinite(startX) || !isFinite(startY) || !isFinite(endX) || !isFinite(endY)) {
                continue;
            }

            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `rgba(255, 255, 150, ${safeActivity * 0.3})`);
            gradient.addColorStop(0.7, `rgba(255, 200, 100, ${safeActivity * 0.2})`);
            gradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = gradient;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 恒星表面の描画
     */
    renderStellarSurface(ctx, body) {
        // 対流セルパターン
        this.renderConvectionCells(ctx, body);

        // 太陽黒点（既存のbody.jsの実装を活用）
        if (body.sunspots && body.sunspots.length > 0) {
            this.enhanceSunspots(ctx, body);
        }

        // 恒星フレア
        this.renderStellarFlares(ctx, body);
    }

    /**
     * 対流セルの描画
     */
    renderConvectionCells(ctx, body) {
        const radius = body.radius || Math.sqrt(body.mass) * 1.5;
        const cellCount = Math.floor(6 * this.qualityLevel);

        ctx.save();
        ctx.globalAlpha = 0.3;

        for (let i = 0; i < cellCount; i++) {
            const angle = (i / cellCount) * Math.PI * 2 + this.animationTime * 0.00005;
            const cellRadius = radius * (0.2 + Math.random() * 0.3);
            const distance = radius * (0.3 + Math.random() * 0.4);

            const cellX = body.x + Math.cos(angle) * distance;
            const cellY = body.y + Math.sin(angle) * distance;

            // 対流の上昇流（明るい）
            const upflowGradient = ctx.createRadialGradient(
                cellX, cellY, 0, cellX, cellY, cellRadius
            );
            upflowGradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
            upflowGradient.addColorStop(0.7, 'rgba(255, 220, 150, 0.2)');
            upflowGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = upflowGradient;
            ctx.beginPath();
            ctx.arc(cellX, cellY, cellRadius, 0, Math.PI * 2);
            ctx.fill();

            // 対流の境界（暗い）
            ctx.strokeStyle = 'rgba(200, 100, 50, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cellX, cellY, cellRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 太陽黒点の強化表示
     */
    enhanceSunspots(ctx, body) {
        body.sunspots.forEach(sunspot => {
            const spotX = body.x + Math.cos(sunspot.angle) * sunspot.distance;
            const spotY = body.y + Math.sin(sunspot.angle) * sunspot.distance;

            // 磁場線の可視化
            this.renderSunspotMagneticField(ctx, spotX, spotY, sunspot.size);

            // 太陽黒点の温度グラデーション
            const umbra = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, sunspot.size * 0.6);
            umbra.addColorStop(0, 'rgba(30, 15, 0, 0.9)');
            umbra.addColorStop(1, 'rgba(100, 50, 0, 0.5)');

            const penumbra = ctx.createRadialGradient(spotX, spotY, sunspot.size * 0.6, spotX, spotY, sunspot.size);
            penumbra.addColorStop(0, 'rgba(150, 75, 25, 0.4)');
            penumbra.addColorStop(1, 'rgba(255, 140, 0, 0.1)');

            // 半暗部
            ctx.fillStyle = penumbra;
            ctx.beginPath();
            ctx.arc(spotX, spotY, sunspot.size, 0, Math.PI * 2);
            ctx.fill();

            // 暗部
            ctx.fillStyle = umbra;
            ctx.beginPath();
            ctx.arc(spotX, spotY, sunspot.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * 太陽黒点の磁場線描画
     */
    renderSunspotMagneticField(ctx, x, y, size) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 100, 0.3)';
        ctx.lineWidth = 1;

        // 磁場線（簡略化）
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const length = size * 2;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + Math.cos(angle) * size,
                y + Math.sin(angle) * size * 0.5,
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 恒星フレアの描画
     */
    renderStellarFlares(ctx, body) {
        // 低確率でフレア発生
        if (Math.random() > 0.99) {
            this.createStellarFlare(body);
        }

        // 既存フレアの描画
        if (body.activeFlares) {
            body.activeFlares.forEach((flare, index) => {
                this.renderFlare(ctx, flare);
                flare.life -= 0.02;

                if (flare.life <= 0) {
                    body.activeFlares.splice(index, 1);
                }
            });
        }
    }

    /**
     * 恒星フレアの生成
     */
    createStellarFlare(body) {
        if (!body.activeFlares) body.activeFlares = [];

        const radius = body.radius || Math.sqrt(body.mass) * 1.5;
        const angle = Math.random() * Math.PI * 2;

        const flare = {
            x: body.x + Math.cos(angle) * radius,
            y: body.y + Math.sin(angle) * radius,
            angle: angle,
            intensity: 0.5 + Math.random() * 1.5,
            life: 1.0,
            length: radius * (2 + Math.random() * 3),
            width: 3 + Math.random() * 5
        };

        body.activeFlares.push(flare);
        console.log('🔥 恒星フレア発生！');
    }

    /**
     * フレアの描画
     */
    renderFlare(ctx, flare) {
        const endX = flare.x + Math.cos(flare.angle) * flare.length * flare.life;
        const endY = flare.y + Math.sin(flare.angle) * flare.length * flare.life;

        const gradient = ctx.createLinearGradient(flare.x, flare.y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${flare.intensity * flare.life})`);
        gradient.addColorStop(0.3, `rgba(255, 200, 100, ${flare.intensity * flare.life * 0.8})`);
        gradient.addColorStop(0.7, `rgba(255, 100, 0, ${flare.intensity * flare.life * 0.4})`);
        gradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = flare.width * flare.life;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(flare.x, flare.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    /**
     * 恒星風の可視化
     */
    renderStellarWind(ctx, body, activity) {
        if (this.qualityLevel < 0.5) return; // 低品質時はスキップ

        const windParticles = Math.floor(20 * activity * this.qualityLevel);
        const radius = body.radius || Math.sqrt(body.mass) * 1.5;

        ctx.save();
        ctx.globalAlpha = 0.3;

        for (let i = 0; i < windParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = radius + Math.random() * radius * 2;
            const size = 1 + Math.random() * 2;

            const x = body.x + Math.cos(angle) * distance;
            const y = body.y + Math.sin(angle) * distance;

            // 風の速度による色変化
            const speed = activity * (1 + Math.random());
            const windColor = this.windSpeedToColor(speed);

            ctx.fillStyle = `rgba(${windColor.join(',')}, 0.5)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 風速による色変化
     */
    windSpeedToColor(speed) {
        if (speed > 2) return [255, 255, 255]; // 高速（白）
        if (speed > 1.5) return [255, 255, 200]; // 中高速（黄白）
        if (speed > 1) return [255, 200, 100]; // 中速（オレンジ）
        return [255, 150, 100]; // 低速（赤オレンジ）
    }

    /**
     * 核融合の脈動効果
     */
    renderNuclearPulsation(ctx, body, activity) {
        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 30;
        const radius = body.radius || Math.sqrt(safeMass) * 1.5;
        const safeRadius = isFinite(radius) && radius > 0 ? radius : 10;
        const safeActivity = isFinite(activity) ? Math.max(0, Math.min(2, activity)) : 0.5;
        const pulsation = 1 + Math.sin(this.animationTime * 0.003 * safeActivity) * 0.1 * safeActivity;
        const safePulsation = isFinite(pulsation) && pulsation > 0 ? pulsation : 1;

        // 座標の安全性確認
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;
        const finalRadius = safeRadius * safePulsation;

        // 全ての値が有限であることを確認
        if (!isFinite(safeX) || !isFinite(safeY) || !isFinite(finalRadius) || finalRadius <= 0) {
            return;
        }

        // 内部エネルギーの可視化
        const coreGradient = ctx.createRadialGradient(
            safeX, safeY, 0,
            safeX, safeY, finalRadius
        );

        const coreIntensity = safeActivity * 0.3;
        coreGradient.addColorStop(0, `rgba(255, 255, 255, ${coreIntensity})`);
        coreGradient.addColorStop(0.3, `rgba(255, 255, 200, ${coreIntensity * 0.7})`);
        coreGradient.addColorStop(0.6, `rgba(255, 200, 100, ${coreIntensity * 0.4})`);
        coreGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(safeX, safeY, finalRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * ブラックホールの描画
     */
    renderBlackHole(ctx, body) {
        ctx.save();

        // ★ シンプルで美しいブラックホールビジュアル
        try {
            // 1. 時空の歪み（控えめ）
            this.renderSimpleSpacetimeDistortion(ctx, body);

            // 2. ガス降着円盤（シンプル）
            this.renderSimpleAccretionDisk(ctx, body);

            // 3. 極ジェット
            this.renderPolarJets(ctx, body);

            // 4. 事象の地平線（絶対の黒）
            this.renderSimpleEventHorizon(ctx, body);

        } catch (error) {
            console.error('❌ ブラックホール描画エラー:', error);
            // フォールバック描画
            this.renderSimpleBlackHoleDebug(ctx, body);
        }

        ctx.restore();
    }

    /**
     * 事象の地平線の描画
     */
    renderEventHorizon(ctx, body) {
        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 50;
        const schwarzschildRadius = body.eventHorizonRadius;
        // ★ 設定：ブラックホールのサイズを大幅拡大
        const safeRadius = isFinite(schwarzschildRadius) && schwarzschildRadius > 0 ? schwarzschildRadius : 80;
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        ctx.save();

        // 事象の地平線の境界効果（光の屈曲）
        // ★ 修正：負の半径値を防ぐ
        const horizonInnerRadius = Math.max(0, safeRadius - 2);
        const horizonOuterRadius = Math.max(horizonInnerRadius + 1, safeRadius + 1);
        const horizonGradient = ctx.createRadialGradient(safeX, safeY, horizonInnerRadius, safeX, safeY, horizonOuterRadius);
        horizonGradient.addColorStop(0, '#000000');
        horizonGradient.addColorStop(0.8, 'rgba(255, 100, 0, 0.3)'); // 温かい光の歪み
        horizonGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = horizonGradient;
        ctx.beginPath();
        ctx.arc(safeX, safeY, safeRadius + 1, 0, Math.PI * 2);
        ctx.fill();

        // 完全な黒い中心部
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(safeX, safeY, safeRadius, 0, Math.PI * 2);
        ctx.fill();

        // 時空歪みによる微細な光の輪（ガルガンチュア特有）
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(safeX, safeY, safeRadius + 0.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * 降着円盤の描画（強化版）
     */
    renderAccretionDisk(ctx, body) {
        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 50;
        const eventHorizonRadius = body.eventHorizonRadius;
        // ★ 設定：ブラックホールのサイズを大幅拡大
        const safeEventHorizonRadius = isFinite(eventHorizonRadius) && eventHorizonRadius > 0 ? eventHorizonRadius : 80;
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        const innerRadius = safeEventHorizonRadius * 1.2; // 縮小：120ピクセル
        const outerRadius = innerRadius * 1.8; // 縮小：216ピクセル
        const diskThickness = outerRadius * 0.05; // 薄く：10.8ピクセル

        // 温度プロファイル（より細かい描画）
        for (let r = innerRadius; r < outerRadius; r += 3) {
            const temperature = this.calculateAccretionTemperature(r, innerRadius);
            const color = this.temperatureToColor(temperature);
            const opacity = 0.4 * (outerRadius - r) / (outerRadius - innerRadius); // 背景が見えるように透明度を下げる

            // 上下の円盤
            for (let side of [-1, 1]) {
                const centerY = safeY + side * diskThickness;

                // 座標値の最終確認
                if (!isFinite(safeX) || !isFinite(centerY) || !isFinite(r)) {
                    continue;
                }

                const gradient = ctx.createRadialGradient(
                    safeX, centerY, r - 3,
                    safeX, centerY, r + 3
                );

                gradient.addColorStop(0, `rgba(${color.join(',')}, ${opacity})`);
                gradient.addColorStop(1, `rgba(${color.join(',')}, 0)`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(safeX, centerY, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 螺旋構造
        this.renderDiskSpiral(ctx, body, innerRadius, outerRadius);
    }

    /**
     * 降着円盤の螺旋構造
     */
    renderDiskSpiral(ctx, body, innerRadius, outerRadius) {
        const spiralArms = 3;
        const rotationSpeed = this.animationTime * 0.001;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.lineWidth = 2;

        for (let arm = 0; arm < spiralArms; arm++) {
            const baseAngle = (arm / spiralArms) * Math.PI * 2 + rotationSpeed;

            ctx.beginPath();
            for (let r = innerRadius; r < outerRadius; r += 5) {
                const angle = baseAngle + (r - innerRadius) * 0.02;
                const x = body.x + Math.cos(angle) * r;
                const y = body.y + Math.sin(angle) * r;

                if (r === innerRadius) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 降着円盤の温度計算
     */
    calculateAccretionTemperature(radius, innerRadius) {
        // 簡略化された温度プロファイル
        const efficiency = 0.1; // 降着効率
        const luminosity = efficiency * Math.pow(10, 38); // erg/s
        const sigma = 5.67e-5; // Stefan-Boltzmann constant (cgs)

        // T ∝ r^(-3/4) の関係を使用
        const temperature = 10000 * Math.pow(innerRadius / radius, 0.75);
        return Math.max(1000, Math.min(100000, temperature));
    }

    /**
     * 極ジェットの描画
     */
    renderPolarJets(ctx, body) {
        const jetLength = body.eventHorizonRadius * 10;
        const jetWidth = body.eventHorizonRadius * 0.5;

        for (let direction of [-1, 1]) {
            // ジェットの軸
            const jetGradient = ctx.createLinearGradient(
                body.x, body.y,
                body.x, body.y + direction * jetLength
            );

            jetGradient.addColorStop(0, 'rgba(100, 150, 255, 0.8)');
            jetGradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.4)');
            jetGradient.addColorStop(1, 'rgba(100, 150, 255, 0.1)');

            ctx.strokeStyle = jetGradient;
            ctx.lineWidth = jetWidth;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(body.x, body.y);
            ctx.lineTo(body.x, body.y + direction * jetLength);
            ctx.stroke();

            // ジェットの境界
            this.renderJetBoundary(ctx, body, direction, jetLength, jetWidth);
        }
    }

    /**
     * ジェット境界の描画
     */
    renderJetBoundary(ctx, body, direction, length, width) {
        ctx.save();
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // 境界線
        for (let side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(body.x + side * width * 0.5, body.y);
            ctx.lineTo(body.x + side * width * 0.3, body.y + direction * length);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 重力レンズ効果の描画
     */
    renderGravitationalLensing(ctx, body) {
        const lensRadius = body.eventHorizonRadius * 5;

        // フォトンスフィア
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.eventHorizonRadius * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 光の歪み効果
        const distortionGradient = ctx.createRadialGradient(
            body.x, body.y, body.eventHorizonRadius,
            body.x, body.y, lensRadius
        );

        distortionGradient.addColorStop(0, 'transparent');
        distortionGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
        distortionGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.1)');
        distortionGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = distortionGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, lensRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 時空の歪みオーラ (神秘的なエネルギー放射)
     */
    renderSpacetimeDistortionAura(ctx, body) {
        const center = { x: body.x, y: body.y };
        const maxRadius = body.eventHorizonRadius * 8;
        const layers = 12;

        for (let i = 0; i < layers; i++) {
            const radius = maxRadius * (i + 1) / layers;
            const intensity = (1 - i / layers) * 0.15;
            const hue = (240 + this.animationTime * 0.05 + i * 15) % 360; // 紫から青のグラデーション

            const pulsation = 1 + Math.sin(this.animationTime * 0.003 + i * 0.5) * 0.3;
            const finalRadius = radius * pulsation;

            const gradient = ctx.createRadialGradient(
                center.x, center.y, radius * 0.8,
                center.x, center.y, finalRadius
            );

            gradient.addColorStop(0, `hsla(${hue}, 80%, 60%, ${intensity})`);
            gradient.addColorStop(0.5, `hsla(${hue + 30}, 90%, 70%, ${intensity * 0.7})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(center.x, center.y, finalRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * 重力レンズリング (アインシュタインリング)
     */
    renderEinsteinRings(ctx, body) {
        const center = { x: body.x, y: body.y };
        const rings = [2.6, 3.8, 5.2]; // フォトンスフィアの倍数

        rings.forEach((multiplier, index) => {
            const radius = body.eventHorizonRadius * multiplier;
            const shimmer = Math.sin(this.animationTime * 0.002 + index * Math.PI / 2) * 0.5 + 0.5;
            const opacity = 0.6 * shimmer;

            // 光のリング
            ctx.strokeStyle = `rgba(255, 255, 200, ${opacity})`;
            ctx.lineWidth = 2 + shimmer;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // 光の点滴
            const sparkles = 8;
            for (let i = 0; i < sparkles; i++) {
                const angle = (i / sparkles) * Math.PI * 2 + this.animationTime * 0.001;
                const sparkleX = center.x + Math.cos(angle) * radius;
                const sparkleY = center.y + Math.sin(angle) * radius;

                ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, 1 + shimmer, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    /**
     * 神秘的な降着円盤 (多層構造とエネルギー放射)
     */
    renderMysticalAccretionDisk(ctx, body) {
        const center = { x: body.x, y: body.y };
        const innerRadius = body.eventHorizonRadius * 1.2;
        const outerRadius = innerRadius * 1.8;
        const layers = 15;
        const rotationSpeed = this.animationTime * 0.0005;

        for (let layer = 0; layer < layers; layer++) {
            const r = innerRadius + (outerRadius - innerRadius) * (layer / layers);
            const temperature = 50000 / (1 + r / innerRadius); // 温度勾配
            const color = this.plasmaTemperatureToColor(temperature);

            // スパイラル構造
            const spiralArms = 3;
            for (let arm = 0; arm < spiralArms; arm++) {
                const baseAngle = (arm / spiralArms) * Math.PI * 2 + rotationSpeed * (1 + r / 100);
                const spiralTightness = 0.01;

                ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
                ctx.lineWidth = 3;

                ctx.beginPath();
                const segments = 20;
                for (let seg = 0; seg < segments; seg++) {
                    const segR = innerRadius + (r - innerRadius) * (seg / segments);
                    const angle = baseAngle + segR * spiralTightness;
                    const turbulence = Math.sin(this.animationTime * 0.002 + seg * 0.5) * 5;

                    const x = center.x + Math.cos(angle) * (segR + turbulence);
                    const y = center.y + Math.sin(angle) * (segR + turbulence);

                    if (seg === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // プラズマの粒子
            if (layer % 3 === 0) {
                const particles = 8;
                for (let p = 0; p < particles; p++) {
                    const angle = Math.random() * Math.PI * 2;
                    const particleR = r + (Math.random() - 0.5) * 10;
                    const x = center.x + Math.cos(angle + rotationSpeed) * particleR;
                    const y = center.y + Math.sin(angle + rotationSpeed) * particleR;

                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
                    ctx.beginPath();
                    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * 相対論的ジェット (エネルギー放出)
     */
    renderRelativisticJets(ctx, body) {
        const center = { x: body.x, y: body.y };
        const jetLength = body.eventHorizonRadius * 6;
        const jetWidth = body.eventHorizonRadius * 0.3;
        const directions = [Math.PI / 2, -Math.PI / 2]; // 上下

        directions.forEach(direction => {
            // ジェットのコア
            const segments = 20;
            for (let i = 0; i < segments; i++) {
                const t = i / segments;
                const distance = jetLength * t;
                const width = jetWidth * (1 + t * 0.5);
                const intensity = (1 - t) * 0.8;

                const jetX = center.x + Math.cos(direction) * distance;
                const jetY = center.y + Math.sin(direction) * distance;

                // コアのグラデーション
                const gradient = ctx.createRadialGradient(
                    jetX, jetY, 0,
                    jetX, jetY, width
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
                gradient.addColorStop(0.3, `rgba(100, 200, 255, ${intensity * 0.8})`);
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(jetX, jetY, width, 0, Math.PI * 2);
                ctx.fill();
            }

            // ジェットのシンクロトロン放射
            const beamParticles = 15;
            for (let p = 0; p < beamParticles; p++) {
                const t = Math.random();
                const distance = jetLength * t;
                const spread = jetWidth * t * 2;

                const particleX = center.x + Math.cos(direction) * distance + (Math.random() - 0.5) * spread;
                const particleY = center.y + Math.sin(direction) * distance + (Math.random() - 0.5) * spread;

                ctx.fillStyle = `rgba(150, 200, 255, ${0.7 * (1 - t)})`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    /**
     * エルゴスフィア (時空引きずり領域)
     */
    renderErgosphere(ctx, body) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // 加算合成でエネルギーを表現

        const center = { x: body.x, y: body.y };
        const ergosphereRadius = body.eventHorizonRadius * 1.2;
        const rotation = this.animationTime * 0.002;

        // ★ 改善：エルゴスフィアをエネルギー渦巻で表現
        const energySwirl = Math.sin(this.animationTime * 0.003) * 0.3 + 0.7;

        // エネルギー渦巻のグラデーション
        const swirlGradient = ctx.createRadialGradient(
            center.x, center.y, ergosphereRadius - 5,
            center.x, center.y, ergosphereRadius + 5
        );
        swirlGradient.addColorStop(0, 'transparent');
        swirlGradient.addColorStop(0.4, `rgba(255, 100, 100, ${0.2 * energySwirl})`);
        swirlGradient.addColorStop(0.8, `rgba(255, 150, 100, ${0.4 * energySwirl})`);
        swirlGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = swirlGradient;
        ctx.beginPath();
        ctx.arc(center.x, center.y, ergosphereRadius + 5, 0, Math.PI * 2);
        ctx.fill();

        // 時空引きずりエフェクト
        const dragParticles = 12;
        for (let i = 0; i < dragParticles; i++) {
            const angle = (i / dragParticles) * Math.PI * 2 + rotation;
            const radius = ergosphereRadius + Math.sin(this.animationTime * 0.003 + i) * 5;

            const x = center.x + Math.cos(angle) * radius;
            const y = center.y + Math.sin(angle) * radius;

            // ★ 改善：エネルギー渦巻粒子
            const particleIntensity = Math.sin(this.animationTime * 0.004 + i * 0.7) * 0.5 + 0.5;

            // グローエフェクト付き粒子
            const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 4);
            glowGradient.addColorStop(0, `rgba(255, 200, 100, ${0.8 * particleIntensity})`);
            glowGradient.addColorStop(0.5, `rgba(255, 150, 100, ${0.4 * particleIntensity})`);
            glowGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // コア粒子
            ctx.fillStyle = `rgba(255, 255, 200, ${0.9 * particleIntensity})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // エネルギーストリーム
            const streamLength = 0.6;
            for (let j = 1; j <= 3; j++) {
                const streamAngle = angle - streamLength * j / 3;
                const streamRadius = radius - j * 2;
                const streamX = center.x + Math.cos(streamAngle) * streamRadius;
                const streamY = center.y + Math.sin(streamAngle) * streamRadius;

                ctx.strokeStyle = `rgba(255, 150, 100, ${0.3 * particleIntensity / j})`;
                ctx.lineWidth = 2 / j;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(streamX, streamY);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * 神秘的な事象の地平線 (絶対の闇とエネルギーの境界)
     */
    renderMysticalEventHorizon(ctx, body) {
        const center = { x: body.x, y: body.y };
        const radius = body.eventHorizonRadius;

        // エネルギーの境界オーラ
        const auraLayers = 5;
        for (let i = 0; i < auraLayers; i++) {
            const auraRadius = radius * (1 + i * 0.1);
            const intensity = (auraLayers - i) / auraLayers * 0.3;
            const hue = 30 + i * 20; // オレンジから赤

            const gradient = ctx.createRadialGradient(
                center.x, center.y, radius * 0.9,
                center.x, center.y, auraRadius
            );
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.7, `hsla(${hue}, 100%, 50%, ${intensity})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(center.x, center.y, auraRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // 絶対の闇 (事象の地平線)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 時空の歪みリング
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * 重力波 (時空の震え)
     */
    renderGravitationalWaves(ctx, body) {
        const center = { x: body.x, y: body.y };
        const waveCount = 4;
        const maxRadius = body.eventHorizonRadius * 12;

        for (let i = 0; i < waveCount; i++) {
            const wavePhase = (this.animationTime * 0.001 + i * 0.5) % 1;
            const radius = maxRadius * wavePhase;
            const opacity = (1 - wavePhase) * 0.2;

            if (opacity > 0.01) {
                ctx.strokeStyle = `rgba(200, 200, 255, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 6]);
                ctx.beginPath();
                ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    /**
     * プラズマ温度から色への変換 (高温プラズマ用)
     */
    plasmaTemperatureToColor(temp) {
        // 高温プラズマの色変化
        if (temp > 30000) {
            return { r: 200, g: 200, b: 255 }; // 青白
        } else if (temp > 20000) {
            return { r: 255, g: 255, b: 255 }; // 白
        } else if (temp > 10000) {
            return { r: 255, g: 255, b: 100 }; // 黄白
        } else if (temp > 5000) {
            return { r: 255, g: 200, b: 100 }; // オレンジ
        } else {
            return { r: 255, g: 100, b: 100 }; // 赤
        }
    }

    /**
     * シンプルな時空歪み（控えめで美しい）
     */
    renderSimpleSpacetimeDistortion(ctx, body) {
        const center = { x: body.x, y: body.y };
        const baseRadius = body.eventHorizonRadius;

        // 時空のリップル効果（控えめ）
        const ripples = 3;
        const time = this.animationTime * 0.001;

        for (let i = 0; i < ripples; i++) {
            const rippleRadius = baseRadius * (3 + i * 1.5);
            const phase = time + i * Math.PI * 0.7;
            const intensity = (Math.sin(phase) * 0.5 + 0.5) * 0.15;

            ctx.strokeStyle = `rgba(100, 150, 255, ${intensity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(center.x, center.y, rippleRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * シンプルなガス降着円盤（現実的で美しい）
     */
    renderSimpleAccretionDisk(ctx, body) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // 加算合成

        const center = { x: body.x, y: body.y };
        const innerRadius = body.eventHorizonRadius * 1.5;
        const outerRadius = innerRadius * 2.2;
        const rotation = this.animationTime * 0.0008;

        // ガスの温度グラデーション
        const layers = 8;
        for (let i = 0; i < layers; i++) {
            const r = innerRadius + (outerRadius - innerRadius) * (i / layers);
            const nextR = innerRadius + (outerRadius - innerRadius) * ((i + 1) / layers);

            // 温度による色変化（内側が高温）
            const temp = 1 - (i / layers);
            const red = Math.floor(255 * Math.min(1, temp * 1.5));
            const green = Math.floor(255 * temp * 0.8);
            const blue = Math.floor(100 * temp * 0.5);

            // 回転と乱流効果
            const angularSpeed = 1 / Math.sqrt(r) * rotation;
            const turbulence = Math.sin(this.animationTime * 0.002 + i * 0.8) * 0.1;
            const opacity = (0.6 - i * 0.06) * (1 + turbulence);

            // 円盤の描画
            ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
            ctx.lineWidth = nextR - r;
            ctx.beginPath();
            ctx.arc(center.x, center.y, r + (nextR - r) / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ★ らせんアームを削除（シンプルな円盤のみ）
        ctx.restore();
    }

    /**
     * 極ジェット（細く青いかすかなエネルギー噴出）
     */
    renderPolarJets(ctx, body) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const center = { x: body.x, y: body.y };
        const jetLength = body.eventHorizonRadius * 8;
        const baseWidth = body.eventHorizonRadius * 0.05; // 非常に細く
        const directions = [-Math.PI / 2, Math.PI / 2]; // 上下
        const time = this.animationTime * 0.001;

        directions.forEach((direction, dirIndex) => {
            const jetEndX = center.x + Math.cos(direction) * jetLength;
            const jetEndY = center.y + Math.sin(direction) * jetLength;

            // ★ メインジェット（細く青いコア）
            const coreGradient = ctx.createLinearGradient(
                center.x, center.y,
                jetEndX, jetEndY
            );
            coreGradient.addColorStop(0, 'rgba(150, 200, 255, 0.4)'); // 青白コア
            coreGradient.addColorStop(0.3, 'rgba(100, 180, 255, 0.3)'); // 明るい青
            coreGradient.addColorStop(0.6, 'rgba(80, 150, 255, 0.2)'); // 中青
            coreGradient.addColorStop(0.85, 'rgba(60, 120, 255, 0.1)'); // 深青
            coreGradient.addColorStop(1, 'transparent'); // 完全に消失

            // コアの描画（非常に細い）
            ctx.strokeStyle = coreGradient;
            ctx.lineWidth = baseWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(jetEndX, jetEndY);
            ctx.stroke();

            // ★ かすかなグロー効果
            const glowGradient = ctx.createLinearGradient(
                center.x, center.y,
                jetEndX, jetEndY
            );
            glowGradient.addColorStop(0, 'rgba(120, 180, 255, 0.15)');
            glowGradient.addColorStop(0.4, 'rgba(100, 160, 255, 0.1)');
            glowGradient.addColorStop(0.7, 'rgba(80, 140, 255, 0.05)');
            glowGradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = glowGradient;
            ctx.lineWidth = baseWidth * 4; // グローも細く
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(jetEndX, jetEndY);
            ctx.stroke();

            // ★ 先端の微かな発散
            const expansionRadius = baseWidth * 6;
            const expansionGradient = ctx.createRadialGradient(
                jetEndX, jetEndY, 0,
                jetEndX, jetEndY, expansionRadius
            );
            expansionGradient.addColorStop(0, 'rgba(100, 150, 255, 0.2)');
            expansionGradient.addColorStop(0.5, 'rgba(80, 130, 255, 0.1)');
            expansionGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = expansionGradient;
            ctx.beginPath();
            ctx.arc(jetEndX, jetEndY, expansionRadius, 0, Math.PI * 2);
            ctx.fill();

            // ★ 微細なエネルギー粒子（よりかすか）
            const particleCount = 3;
            for (let p = 0; p < particleCount; p++) {
                const particleProgress = (time * 0.8 + p * 0.6) % 1;
                const particleX = center.x + Math.cos(direction) * jetLength * particleProgress;
                const particleY = center.y + Math.sin(direction) * jetLength * particleProgress;

                // 粒子のサイズと明度（非常に小さく）
                const particleSize = 0.8 * (1 - particleProgress * 0.5);
                const particleIntensity = (1 - particleProgress) * 0.3;

                // 粒子のグロー
                const particleGradient = ctx.createRadialGradient(
                    particleX, particleY, 0,
                    particleX, particleY, particleSize * 3
                );
                particleGradient.addColorStop(0, `rgba(150, 200, 255, ${particleIntensity})`);
                particleGradient.addColorStop(0.7, `rgba(100, 150, 255, ${particleIntensity * 0.4})`);
                particleGradient.addColorStop(1, 'transparent');

                ctx.fillStyle = particleGradient;
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize * 3, 0, Math.PI * 2);
                ctx.fill();

                // 粒子のコア（非常に小さい）
                ctx.fillStyle = `rgba(200, 220, 255, ${particleIntensity * 0.8})`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }

    /**
     * シンプルな事象の地平線（絶対の黒）
     */
    renderSimpleEventHorizon(ctx, body) {
        const center = { x: body.x, y: body.y };
        const radius = body.eventHorizonRadius;

        // 最外層：微かなオーラ
        const auraGradient = ctx.createRadialGradient(
            center.x, center.y, radius * 0.9,
            center.x, center.y, radius * 1.1
        );
        auraGradient.addColorStop(0, 'transparent');
        auraGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.1)');
        auraGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = auraGradient;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * 1.1, 0, Math.PI * 2);
        ctx.fill();

        // 事象の地平線：絶対の黒
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 微かな境界線
        ctx.strokeStyle = 'rgba(255, 150, 50, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius + 1, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * シンプルなブラックホール描画（デバッグ用）
     */
    renderSimpleBlackHoleDebug(ctx, body) {
        const x = body.x || 0;
        const y = body.y || 0;
        const radius = body.eventHorizonRadius || 50;

        // シンプルな黒い円
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 白い境界線
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * フォトンスフィアの描画
     */
    renderPhotonSphere(ctx, body) {
        if (this.qualityLevel < 0.5) return;

        const center = { x: body.x, y: body.y };
        const photonRadius = body.eventHorizonRadius * 1.5;

        ctx.save();

        // ★ 改善：光の軌道を美しいグラデーションで表現
        const shimmer = Math.sin(this.animationTime * 0.004) * 0.5 + 0.5;

        // 光の波動リング
        const waveGradient = ctx.createRadialGradient(
            center.x, center.y, photonRadius - 3,
            center.x, center.y, photonRadius + 3
        );
        waveGradient.addColorStop(0, 'transparent');
        waveGradient.addColorStop(0.3, `rgba(255, 255, 200, ${0.4 * shimmer})`);
        waveGradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.6 * shimmer})`);
        waveGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = waveGradient;
        ctx.beginPath();
        ctx.arc(center.x, center.y, photonRadius + 3, 0, Math.PI * 2);
        ctx.fill();

        // 光子の軌道粒子
        const photonCount = 12;
        for (let i = 0; i < photonCount; i++) {
            const angle = (i / photonCount) * Math.PI * 2 + this.animationTime * 0.002;
            const x = center.x + Math.cos(angle) * photonRadius;
            const y = center.y + Math.sin(angle) * photonRadius;

            const particleShimmer = Math.sin(this.animationTime * 0.005 + i * 0.5) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 150, ${0.8 * particleShimmer})`;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // 光の軌跡
            const trailLength = 0.8;
            const trailAngle = angle - trailLength;
            const trailX = center.x + Math.cos(trailAngle) * photonRadius;
            const trailY = center.y + Math.sin(trailAngle) * photonRadius;

            ctx.strokeStyle = `rgba(255, 255, 200, ${0.3 * particleShimmer})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(trailX, trailY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * ホーキング放射の描画
     */
    renderHawkingRadiation(ctx, body) {
        if (this.qualityLevel < 0.7) return; // 高品質時のみ

        // 極微細なパーティクル（概念的表現）
        const radiationParticles = Math.floor(10 * this.qualityLevel);
        const radius = body.eventHorizonRadius;

        ctx.save();
        ctx.globalAlpha = 0.1;

        for (let i = 0; i < radiationParticles; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = radius + Math.random() * radius * 2;
            const size = 0.5 + Math.random() * 1;

            const x = body.x + Math.cos(angle) * distance;
            const y = body.y + Math.sin(angle) * distance;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 惑星の描画
     */
    renderPlanet(ctx, body) {
        // 大気層
        this.renderAtmosphere(ctx, body);

        // 表面詳細（地形、雲）
        this.renderPlanetSurface(ctx, body);

        // オーロラ効果
        if (body.magneticField && body.magneticField > 0.3) {
            this.renderAurora(ctx, body);
        }

        // 環システム（一部の惑星）
        if (body.hasRings || Math.random() < 0.1) {
            this.renderPlanetaryRings(ctx, body);
        }
    }

    /**
     * 大気層の描画
     */
    renderAtmosphere(ctx, body) {
        const radius = body.radius || Math.sqrt(body.mass) * 1.5;
        const atmosphereHeight = radius * 0.3;

        // 大気散乱
        const scatteringGradient = ctx.createRadialGradient(
            body.x, body.y, radius,
            body.x, body.y, radius + atmosphereHeight
        );

        // 大気の色（組成による）
        const atmosphereColor = this.getAtmosphereColor(body);
        scatteringGradient.addColorStop(0, `rgba(${atmosphereColor.join(',')}, 0.4)`);
        scatteringGradient.addColorStop(0.7, `rgba(${atmosphereColor.join(',')}, 0.2)`);
        scatteringGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = scatteringGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius + atmosphereHeight, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * 大気の色を決定
     */
    getAtmosphereColor(body) {
        // 惑星の質量と組成に基づく大気色
        if (body.mass > 100) return [255, 200, 150]; // 厚い大気（金星型）
        if (body.mass > 50) return [135, 206, 235];  // 地球型
        if (body.mass > 20) return [255, 100, 100];  // 薄い大気（火星型）
        return [200, 200, 255]; // 極薄大気
    }

    /**
     * 惑星表面の描画
     */
    renderPlanetSurface(ctx, body) {
        const radius = body.radius || Math.sqrt(body.mass) * 1.5;

        // 地形の多様性
        this.renderTerrain(ctx, body, radius);

        // 雲パターン
        this.renderClouds(ctx, body, radius);

        // 極冠（寒冷な惑星）
        if (body.temperature < 0.5) {
            this.renderPolarIceCaps(ctx, body, radius);
        }
    }

    /**
     * 地形の描画
     */
    renderTerrain(ctx, body, radius) {
        const terrainFeatures = Math.floor(8 * this.qualityLevel);

        for (let i = 0; i < terrainFeatures; i++) {
            const angle = (i / terrainFeatures) * Math.PI * 2;
            const featureSize = radius * (0.1 + Math.random() * 0.2);
            const distance = radius * (0.3 + Math.random() * 0.5);

            const x = body.x + Math.cos(angle) * distance;
            const y = body.y + Math.sin(angle) * distance;

            // 地形タイプ
            const terrainType = Math.random();
            let terrainColor;

            if (terrainType < 0.3) {
                terrainColor = [139, 69, 19]; // 山地（茶色）
            } else if (terrainType < 0.6) {
                terrainColor = [34, 139, 34]; // 平原（緑）
            } else {
                terrainColor = [0, 100, 200]; // 海洋（青）
            }

            ctx.fillStyle = `rgba(${terrainColor.join(',')}, 0.3)`;
            ctx.beginPath();
            ctx.arc(x, y, featureSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * 雲パターンの描画
     */
    renderClouds(ctx, body, radius) {
        if (!body.hasAtmosphere && body.mass < 30) return;

        const cloudBands = Math.floor(4 * this.qualityLevel);

        ctx.save();
        ctx.globalAlpha = 0.4;

        for (let band = 0; band < cloudBands; band++) {
            const latitudeAngle = (band / cloudBands) * Math.PI;
            const cloudY = body.y + Math.cos(latitudeAngle) * radius * 0.8;
            const cloudWidth = Math.sin(latitudeAngle) * radius * 2;
            const cloudHeight = radius * 0.2;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(body.x, cloudY, cloudWidth, cloudHeight, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 極冠の描画
     */
    renderPolarIceCaps(ctx, body, radius) {
        // 北極
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(body.x, body.y - radius * 0.7, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // 南極
        ctx.beginPath();
        ctx.arc(body.x, body.y + radius * 0.7, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * オーロラ効果の描画
     */
    renderAurora(ctx, body) {
        const radius = body.radius || Math.sqrt(body.mass) * 1.5;
        const auroraHeight = radius * 1.8;
        const intensity = body.magneticField * 0.5;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // 北極オーロラ
        this.renderAuroraRing(ctx, body.x, body.y - radius * 0.8, auroraHeight, intensity, 'green');

        // 南極オーロラ
        this.renderAuroraRing(ctx, body.x, body.y + radius * 0.8, auroraHeight, intensity, 'blue');

        ctx.restore();
    }

    /**
     * オーロラリングの描画
     */
    renderAuroraRing(ctx, centerX, centerY, radius, intensity, colorType) {
        const segments = Math.floor(32 * this.qualityLevel);

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const fluctuation = Math.sin(this.animationTime * 0.005 + i * 0.5) * intensity;
            const currentRadius = radius * (1 + fluctuation * 0.3);

            const x = centerX + Math.cos(angle) * currentRadius;
            const y = centerY + Math.sin(angle) * currentRadius;

            // オーロラの色
            let auroraColor;
            if (colorType === 'green') {
                auroraColor = [0, 255, 100];
            } else {
                auroraColor = [100, 150, 255];
            }

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10);
            gradient.addColorStop(0, `rgba(${auroraColor.join(',')}, ${intensity})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * 惑星環の描画
     */
    renderPlanetaryRings(ctx, body) {
        const radius = body.radius || Math.sqrt(body.mass) * 1.5;
        const innerRingRadius = radius * 2;
        const outerRingRadius = radius * 3.5;
        const ringCount = 3;

        ctx.save();
        ctx.globalAlpha = 0.6;

        for (let ring = 0; ring < ringCount; ring++) {
            const ringRadius = innerRingRadius + (ring / ringCount) * (outerRingRadius - innerRingRadius);
            const ringWidth = 3 + ring;

            // 環の密度による明度変化
            const density = 0.3 + Math.random() * 0.4;
            ctx.strokeStyle = `rgba(200, 180, 140, ${density})`;
            ctx.lineWidth = ringWidth;

            ctx.beginPath();
            ctx.arc(body.x, body.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ギャップ（カッシーニ間隙など）
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(body.x, body.y, (innerRingRadius + outerRingRadius) / 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * 温度から色への変換
     */
    temperatureToColor(temperature) {
        const tempKeys = Object.keys(this.TEMP_COLOR_MAP).map(k => parseInt(k)).sort((a, b) => b - a);

        for (let i = 0; i < tempKeys.length - 1; i++) {
            const upperTemp = tempKeys[i];
            const lowerTemp = tempKeys[i + 1];

            if (temperature >= lowerTemp && temperature <= upperTemp) {
                // 線形補間
                const ratio = (temperature - lowerTemp) / (upperTemp - lowerTemp);
                const upperColor = this.TEMP_COLOR_MAP[upperTemp];
                const lowerColor = this.TEMP_COLOR_MAP[lowerTemp];

                return [
                    Math.floor(lowerColor[0] + (upperColor[0] - lowerColor[0]) * ratio),
                    Math.floor(lowerColor[1] + (upperColor[1] - lowerColor[1]) * ratio),
                    Math.floor(lowerColor[2] + (upperColor[2] - lowerColor[2]) * ratio)
                ];
            }
        }

        // 範囲外の場合
        if (temperature > tempKeys[0]) return this.TEMP_COLOR_MAP[tempKeys[0]];
        return this.TEMP_COLOR_MAP[tempKeys[tempKeys.length - 1]];
    }

    /**
     * 中性子星の描画
     */
    renderNeutronStar(ctx, body) {
        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 30;
        const radius = body.radius || Math.sqrt(safeMass) * 0.8; // 中性子星は小さい
        const safeRadius = isFinite(radius) && radius > 0 ? radius : 8;
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        // 高密度コア
        const coreGradient = ctx.createRadialGradient(
            safeX, safeY, 0,
            safeX, safeY, safeRadius
        );
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        coreGradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.9)');
        coreGradient.addColorStop(0.7, 'rgba(150, 180, 255, 0.6)');
        coreGradient.addColorStop(1, 'rgba(100, 150, 255, 0.3)');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(safeX, safeY, safeRadius, 0, Math.PI * 2);
        ctx.fill();

        // 強力な磁場
        this.renderMagneticField(ctx, body, safeRadius);
    }

    /**
     * パルサーの描画
     */
    renderPulsar(ctx, body) {
        // 中性子星の基本構造
        this.renderNeutronStar(ctx, body);

        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 30;
        const radius = body.radius || Math.sqrt(safeMass) * 0.8;
        const safeRadius = isFinite(radius) && radius > 0 ? radius : 8;
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        // パルス光線（回転ビーム）
        const pulseAngle = (this.animationTime * 0.01) % (Math.PI * 2);
        const beamLength = safeRadius * 8;

        // 2つの対極ビーム
        for (let beam = 0; beam < 2; beam++) {
            const angle = pulseAngle + beam * Math.PI;
            const endX = safeX + Math.cos(angle) * beamLength;
            const endY = safeY + Math.sin(angle) * beamLength;

            const beamGradient = ctx.createLinearGradient(safeX, safeY, endX, endY);
            beamGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            beamGradient.addColorStop(0.3, 'rgba(200, 255, 255, 0.6)');
            beamGradient.addColorStop(0.7, 'rgba(100, 200, 255, 0.3)');
            beamGradient.addColorStop(1, 'transparent');

            ctx.strokeStyle = beamGradient;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(safeX, safeY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    /**
     * 中性子星・パルサー用磁場描画
     */
    renderMagneticField(ctx, body, radius) {
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;
        const fieldStrength = 0.5;

        // 磁場線
        for (let line = 0; line < 6; line++) {
            const angle = (line / 6) * Math.PI * 2;
            const fieldRadius = radius * (2 + line * 0.3);

            ctx.strokeStyle = `rgba(255, 100, 255, ${fieldStrength * (1 - line * 0.1)})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);

            ctx.beginPath();
            ctx.arc(safeX, safeY, fieldRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    /**
     * ガルガンチュア風降着円盤（重力レンズ効果適用）
     */
    renderGargantua_AccretionDisk(ctx, body) {
        // 安全な値の確保
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 50;
        const eventHorizonRadius = body.eventHorizonRadius || Math.sqrt(safeMass) * 2;
        // ★ 修正：ガルガンチュア降着円盤の最小サイズも保証
        const safeEventHorizonRadius = Math.max(10, isFinite(eventHorizonRadius) && eventHorizonRadius > 0 ? eventHorizonRadius : 15);
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        const innerRadius = safeEventHorizonRadius * 2.5;
        const outerRadius = innerRadius * 2;
        const time = this.animationTime * 0.001;

        ctx.save();

        // ドップラー効果による色シフト
        for (let layer = 0; layer < 3; layer++) {
            const radius = innerRadius + (outerRadius - innerRadius) * (layer / 3);
            const rotationSpeed = Math.sqrt(safeMass / Math.pow(radius, 3)) * 0.1;

            // 重力レンズ効果による楕円変形
            const lensDistortion = 1 + (safeEventHorizonRadius * 3) / radius;

            // 上面（青方偏移 - 近づいてくる）
            this.renderAccretionLayer(ctx, safeX, safeY, radius, {
                color: [255, 200 + layer * 15, 100], // オレンジ→黄色
                opacity: 0.6 - layer * 0.15,
                rotation: time * rotationSpeed,
                distortion: lensDistortion,
                side: 1,
                thickness: safeEventHorizonRadius * 0.3
            });

            // 下面（赤方偏移 - 遠ざかっている）
            this.renderAccretionLayer(ctx, safeX, safeY, radius, {
                color: [200 - layer * 20, 100, 50], // 暗いオレンジ→赤
                opacity: 0.4 - layer * 0.1,
                rotation: time * rotationSpeed,
                distortion: lensDistortion,
                side: -1,
                thickness: safeEventHorizonRadius * 0.3
            });
        }

        // インナーエッジの強い発光
        this.renderInnerEdgeGlow(ctx, safeX, safeY, innerRadius);

        ctx.restore();
    }

    /**
     * 降着円盤レイヤー描画
     */
    renderAccretionLayer(ctx, x, y, radius, options) {
        const segments = Math.floor(32 * this.qualityLevel);
        const angleStep = (Math.PI * 2) / segments;

        for (let i = 0; i < segments; i++) {
            const angle = i * angleStep + options.rotation;
            const nextAngle = (i + 1) * angleStep + options.rotation;

            // 重力レンズによる位置歪み
            const distortedRadius = radius * (1 + 0.3 * Math.sin(angle * 2));
            const thickness = options.thickness;

            const x1 = x + Math.cos(angle) * distortedRadius;
            const y1 = y + Math.sin(angle) * distortedRadius + options.side * thickness;
            const x2 = x + Math.cos(nextAngle) * distortedRadius;
            const y2 = y + Math.sin(nextAngle) * distortedRadius + options.side * thickness;

            // 温度による色変化
            const temperature = 1 - (distortedRadius - radius * 0.8) / (radius * 0.4);
            const intensity = Math.max(0, temperature) * options.opacity;

            if (intensity > 0.01) {
                // ★ 修正：負の半径値を防ぐ
                const innerRadius = Math.max(0, radius - 5);
                const outerRadius = Math.max(innerRadius + 1, radius + 5);
                const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
                gradient.addColorStop(0, `rgba(${options.color.join(',')}, ${intensity})`);
                gradient.addColorStop(1, `rgba(${options.color.join(',')}, ${intensity * 0.3})`);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.lineTo(x + Math.cos(nextAngle) * (distortedRadius - 5), y + Math.sin(nextAngle) * (distortedRadius - 5) + options.side * thickness);
                ctx.lineTo(x + Math.cos(angle) * (distortedRadius - 5), y + Math.sin(angle) * (distortedRadius - 5) + options.side * thickness);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    /**
     * インナーエッジの強烈な発光
     */
    renderInnerEdgeGlow(ctx, x, y, radius) {
        // ★ 修正：負の半径値を防ぐ
        const glowInnerRadius = Math.max(0, radius - 3);
        const glowOuterRadius = Math.max(glowInnerRadius + 1, radius + 8);
        const glowGradient = ctx.createRadialGradient(x, y, glowInnerRadius, x, y, glowOuterRadius);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        glowGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.7)');
        glowGradient.addColorStop(0.7, 'rgba(255, 150, 50, 0.4)');
        glowGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * フォトンスフィア（光子軌道）
     */
    renderPhotonSphere(ctx, body) {
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 50;
        const eventHorizonRadius = body.eventHorizonRadius || Math.sqrt(safeMass) * 2;
        const safeEventHorizonRadius = isFinite(eventHorizonRadius) && eventHorizonRadius > 0 ? eventHorizonRadius : 15;
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        const photonSphereRadius = safeEventHorizonRadius * 1.5; // 事象の地平線の1.5倍

        // 光子軌道のリング
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(safeX, safeY, photonSphereRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * 時空の歪み効果
     */
    renderSpacetimeDistortion(ctx, body) {
        const safeMass = isFinite(body.mass) && body.mass > 0 ? body.mass : 50;
        const eventHorizonRadius = body.eventHorizonRadius || Math.sqrt(safeMass) * 2;
        const safeEventHorizonRadius = isFinite(eventHorizonRadius) && eventHorizonRadius > 0 ? eventHorizonRadius : 15;
        const safeX = isFinite(body.x) ? body.x : 0;
        const safeY = isFinite(body.y) ? body.y : 0;

        ctx.save();

        // 時空歪みによる同心円効果
        for (let ring = 1; ring <= 5; ring++) {
            const distortionRadius = safeEventHorizonRadius * (2 + ring * 0.8);
            const intensity = 0.15 / ring;

            ctx.strokeStyle = `rgba(200, 200, 255, ${intensity})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([ring, ring * 2]);
            ctx.beginPath();
            ctx.arc(safeX, safeY, distortionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * 品質レベル設定
     */
    setQualityLevel(level) {
        this.qualityLevel = Math.max(0.1, Math.min(1.0, level));
        this.detailLevel = this.qualityLevel;
        console.log(`🎨 動的天体描画品質: ${this.qualityLevel}`);
    }
}