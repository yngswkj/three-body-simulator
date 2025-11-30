'use strict';

/**
 * カー・ブラックホール（回転ブラックホール）システム
 * VISUAL_ANALYSIS_REPORT.md Phase 1の実装
 * 一般相対性理論に基づく回転ブラックホールの視覚化
 */

/**
 * カー・ブラックホールクラス
 */
export class KerrBlackHole {
    constructor(mass, spin = 0.5) {
        this.mass = mass;
        this.spin = Math.max(0, Math.min(1, spin)); // 角運動量パラメータ (0-1)
        // ★ 修正：視覚的なサイズに大幅調整
        this.G = 5.0; // 重力定数（視覚的に十分なサイズに調整）
        this.c = 1; // 光速（シミュレーション単位）

        // シュヴァルツシルト半径（視覚的サイズに調整）
        this.rs = 2 * this.G * this.mass / (this.c * this.c);

        // カー・ブラックホールの特性半径を計算
        this.calculateCharacteristicRadii();

        // 降着円盤パラメータ
        this.accretionDisk = {
            innerRadius: this.isco,
            outerRadius: this.rs * 20,
            thickness: this.rs * 0.5,
            temperature: 1e7, // ケルビン
            density: 1.0
        };

        // 視覚効果パラメータ
        this.visualEffects = {
            jetDirection: Math.random() * Math.PI * 2,
            jetLength: this.rs * 50,
            jetWidth: this.rs * 2,
            diskRotation: 0,
            diskPrecession: 0
        };

        console.log(`🌀 カー・ブラックホール生成: 質量=${mass}, スピン=${spin.toFixed(3)}`);
        console.log(`   事象の地平線: ${this.eventHorizonRadius.toFixed(2)}`);
        console.log(`   エルゴスフィア: ${this.ergosphereRadius(Math.PI / 2).toFixed(2)}`);
        console.log(`   ISCO: ${this.isco.toFixed(2)}`);
    }

    /**
     * カー・ブラックホールの特性半径を計算
     */
    calculateCharacteristicRadii() {
        const a = this.spin; // 無次元スピンパラメータ

        // 事象の地平線半径 (外側地平線)
        this.eventHorizonRadius = this.rs * (1 + Math.sqrt(1 - a * a)) / 2;

        // 内側地平線半径
        this.innerHorizonRadius = this.rs * (1 - Math.sqrt(1 - a * a)) / 2;

        // 最内安定円軌道 (ISCO) 半径
        this.isco = this.calculateISCO();

        // 限界半径（光子軌道）
        this.photonSphere = this.rs * (2 + 2 * Math.cos(2 * Math.acos(-a) / 3));
    }

    /**
     * 最内安定円軌道 (ISCO) 半径の計算
     */
    calculateISCO() {
        const a = this.spin;
        const Z1 = 1 + Math.pow(1 - a * a, 1 / 3) * (Math.pow(1 + a, 1 / 3) + Math.pow(1 - a, 1 / 3));
        const Z2 = Math.sqrt(3 * a * a + Z1 * Z1);

        // 順行軌道の場合
        const rISCO = this.rs * (3 + Z2 - Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));

        return rISCO;
    }

    /**
     * エルゴスフィア半径の計算（極角θ依存）
     */
    ergosphereRadius(theta) {
        const a = this.spin;
        const rs = this.rs;

        return rs * (1 + Math.sqrt(1 - a * a * Math.cos(theta) * Math.cos(theta))) / 2;
    }

    /**
     * フレームドラッグ角速度の計算
     */
    calculateFrameDragOmega(r, theta) {
        const a = this.spin;
        const rs = this.rs;
        const cosTheta = Math.cos(theta);
        const sin2Theta = Math.sin(theta) * Math.sin(theta);

        const rho2 = r * r + a * a * cosTheta * cosTheta;
        const delta = r * r - rs * r + a * a;

        return (rs * r * a) / (rho2 * (rho2 + rs * r * a * a * sin2Theta / rho2));
    }

    /**
     * 降着円盤の温度分布計算
     */
    calculateDiskTemperature(r) {
        const rISCO = this.isco;
        if (r < rISCO) return 0; // ISCO内側では物質が存在しない

        // 標準降着円盤モデル（Shakura-Sunyaev）
        const basTemp = this.accretionDisk.temperature;
        const tempProfile = Math.pow(rISCO / r, 3 / 4);

        return basTemp * tempProfile;
    }

    /**
     * ドップラー・ブーストファクターの計算
     */
    calculateDopplerFactor(r, phi, viewAngle = 0) {
        const orbitalVelocity = Math.sqrt(this.G * this.mass / r);
        const beta = orbitalVelocity / this.c; // v/c
        const cosAngle = Math.cos(phi - viewAngle);

        // 相対論的ドップラー効果
        return 1 / (1 - beta * cosAngle);
    }

    /**
     * 相対論的ジェットの計算
     */
    calculateRelativisticJet() {
        // ブランドフォード・ズナイェクメカニズム
        const jetPower = this.spin * this.spin * this.mass * this.mass; // 簡略化
        const jetVelocity = 0.99 * this.c; // 光速の99%

        return {
            power: jetPower,
            velocity: jetVelocity,
            direction: this.visualEffects.jetDirection,
            length: this.visualEffects.jetLength,
            opening_angle: Math.PI / 12 // 15度
        };
    }

    /**
     * 時空歪みの可視化データ計算
     */
    calculateSpacetimeDistortion(x, y, centerX, centerY) {
        const r = Math.sqrt((x - centerX) * (x - centerX) + (y - centerY) * (y - centerY));
        const rs = this.rs;

        if (r < this.eventHorizonRadius) return { distortion: 1, redshift: Infinity };

        // 重力赤方偏移
        const redshift = 1 / Math.sqrt(1 - rs / r);

        // 空間の歪み（デフォルメーション）
        const distortion = rs / (4 * r) * (1 + rs / (4 * r));

        return { distortion, redshift };
    }

    /**
     * レンズ効果による光線の偏向計算
     */
    calculateLightDeflection(impactParameter) {
        const rs = this.rs;
        const b = impactParameter;

        if (b < this.photonSphere) {
            // 光子軌道内では光は捕獲される
            return Math.PI;
        }

        // 弱場近似での光線偏向
        const deflection = 4 * this.G * this.mass / (this.c * this.c * b);

        return deflection;
    }

    /**
     * 降着円盤の螺旋構造計算
     */
    calculateSpiralStructure(r, t) {
        const spiralArms = 2; // 螺旋腕の数
        const pitchAngle = Math.PI / 6; // 螺旋の巻き具合
        const angularVelocity = Math.sqrt(this.G * this.mass / (r * r * r));

        const phi = angularVelocity * t + Math.log(r / this.isco) / Math.tan(pitchAngle);

        return {
            phi: phi,
            arms: spiralArms,
            density_modulation: 1 + 0.3 * Math.cos(spiralArms * phi)
        };
    }

    /**
     * 更新処理
     */
    update(deltaTime) {
        // 円盤の回転
        this.visualEffects.diskRotation += deltaTime * 0.1;

        // フレームドラッグによる歳差運動
        const frameDragRate = this.spin * 0.01;
        this.visualEffects.diskPrecession += deltaTime * frameDragRate;

        // ジェットの変動
        if (Math.random() < 0.001) {
            this.visualEffects.jetDirection += (Math.random() - 0.5) * 0.1;
        }
    }

    /**
     * デバッグ情報の取得
     */
    getDebugInfo() {
        return {
            mass: this.mass,
            spin: this.spin,
            schwarzschildRadius: this.rs,
            eventHorizon: this.eventHorizonRadius,
            ergosphere: this.ergosphereRadius(Math.PI / 2),
            isco: this.isco,
            photonSphere: this.photonSphere,
            accretionDisk: this.accretionDisk
        };
    }
}

/**
 * カー・ブラックホール・レンダラー
 */
export class KerrBlackHoleRenderer {
    constructor() {
        this.animationTime = 0;
    }

    /**
     * カー・ブラックホールの描画
     */
    render(ctx, kerrBH, x, y, qualityLevel = 1.0) {
        this.animationTime += 0.016;

        // 事象の地平線（完全な黒）
        this.renderEventHorizon(ctx, x, y, kerrBH.eventHorizonRadius);

        // エルゴスフィア
        this.renderErgosphere(ctx, x, y, kerrBH, qualityLevel);

        // 降着円盤
        this.renderAccretionDisk(ctx, x, y, kerrBH, qualityLevel);

        // 相対論的ジェット
        if (kerrBH.spin > 0.3) {
            this.renderRelativisticJets(ctx, x, y, kerrBH, qualityLevel);
        }

        // フォトンスフィア
        this.renderPhotonSphere(ctx, x, y, kerrBH.photonSphere, qualityLevel);

        // フレームドラッグ効果の可視化
        if (qualityLevel > 0.7) {
            this.renderFrameDragging(ctx, x, y, kerrBH);
        }
    }

    /**
     * 事象の地平線の描画
     */
    renderEventHorizon(ctx, x, y, radius) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * エルゴスフィアの描画
     */
    renderErgosphere(ctx, x, y, kerrBH, qualityLevel) {
        const steps = Math.floor(32 * qualityLevel);

        ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * Math.PI * 2;
            const r = kerrBH.ergosphereRadius(theta);
            const px = x + r * Math.cos(theta);
            const py = y + r * Math.sin(theta);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * 降着円盤の描画（カー・ブラックホール版）
     */
    renderAccretionDisk(ctx, x, y, kerrBH, qualityLevel) {
        const innerR = kerrBH.isco;
        const outerR = kerrBH.accretionDisk.outerRadius;
        const layers = Math.floor(20 * qualityLevel);

        for (let i = 0; i < layers; i++) {
            const r = innerR + (outerR - innerR) * (i / layers);
            const nextR = innerR + (outerR - innerR) * ((i + 1) / layers);

            // 温度による色
            const temp = kerrBH.calculateDiskTemperature(r);
            const color = this.temperatureToColor(temp);

            // ドップラー効果による明度変調
            const phi = this.animationTime * Math.sqrt(kerrBH.mass / (r * r * r));
            const dopplerFactor = kerrBH.calculateDopplerFactor(r, phi);
            const brightness = Math.min(1, dopplerFactor * 0.3);

            // 螺旋構造
            const spiral = kerrBH.calculateSpiralStructure(r, this.animationTime);
            const density = spiral.density_modulation;

            const alpha = brightness * density * 0.6;

            ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            ctx.lineWidth = (nextR - r) * 0.8;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    /**
     * 相対論的ジェットの描画
     */
    renderRelativisticJets(ctx, x, y, kerrBH, qualityLevel) {
        const jet = kerrBH.calculateRelativisticJet();
        const jetDirection = kerrBH.visualEffects.jetDirection;

        // 上方向ジェット
        this.renderJet(ctx, x, y, jetDirection, jet, qualityLevel);

        // 下方向ジェット
        this.renderJet(ctx, x, y, jetDirection + Math.PI, jet, qualityLevel);
    }

    /**
     * 単一ジェットの描画
     */
    renderJet(ctx, x, y, direction, jet, qualityLevel) {
        const length = jet.length;
        const width = kerrBH.visualEffects.jetWidth;
        const openingAngle = jet.opening_angle;

        const segments = Math.floor(10 * qualityLevel);

        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const dist = length * t;
            const jetWidth = width * (1 + t * Math.tan(openingAngle));

            const jx = x + Math.cos(direction) * dist;
            const jy = y + Math.sin(direction) * dist;

            // シンクロトロン放射の色
            const alpha = (1 - t) * 0.4;
            ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.lineWidth = jetWidth;

            if (i > 0) {
                const prevDist = length * (i - 1) / segments;
                const prevJx = x + Math.cos(direction) * prevDist;
                const prevJy = y + Math.sin(direction) * prevDist;

                ctx.beginPath();
                ctx.moveTo(prevJx, prevJy);
                ctx.lineTo(jx, jy);
                ctx.stroke();
            }
        }
    }

    /**
     * フォトンスフィアの描画
     */
    renderPhotonSphere(ctx, x, y, radius, qualityLevel) {
        if (qualityLevel < 0.5) return;

        ctx.strokeStyle = 'rgba(255, 255, 100, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * フレームドラッグ効果の可視化
     */
    renderFrameDragging(ctx, x, y, kerrBH) {
        const r = kerrBH.eventHorizonRadius * 3;
        const steps = 16;

        for (let i = 0; i < steps; i++) {
            const theta = (i / steps) * Math.PI * 2;
            // ★ 修正：関数プロパティではなくメソッドを直接呼び出す
            const omega = kerrBH.calculateFrameDragOmega(r, Math.PI / 2);
            const dragAngle = theta + omega * this.animationTime;

            const px = x + r * Math.cos(dragAngle);
            const py = y + r * Math.sin(dragAngle);

            ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * 温度から色への変換
     */
    temperatureToColor(temp) {
        // プランクの法則に基づく黒体輻射色
        const t = Math.max(1000, Math.min(50000, temp));

        if (t < 3000) {
            return { r: 255, g: Math.floor(t / 12), b: 0 };
        } else if (t < 5000) {
            return { r: 255, g: Math.floor(150 + (t - 3000) / 10), b: Math.floor((t - 3000) / 20) };
        } else {
            const blue = Math.min(255, Math.floor(100 + (t - 5000) / 200));
            return { r: 255, g: 255, b: blue };
        }
    }
}

// グローバルインスタンス
export const kerrRenderer = new KerrBlackHoleRenderer();