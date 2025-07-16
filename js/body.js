'use strict';

import { BODY_TYPE_THRESHOLDS } from './constants.js';
import { Particle } from './particles.js';

/**
 * 天体クラス
 */
export class Body {
    constructor(x, y, vx = 0, vy = 0, mass = 25, particleSystem = null) {
        // 基本物理パラメータ
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.mass = Math.max(10, Math.min(400, mass));

        // 視覚効果パラメータ
        this.trail = [];
        this.color = this.generateColor();

        // アニメーション制御パラメータ
        this.trailUpdateCounter = 0;
        this.isValid = true;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.particleTimer = 0;

        // 天体タイプ別パラメータ
        this.type = this.determineBodyType();
        this.rotation = 0;
        this.temperature = 1.0;
        this.magneticField = 0;
        this.beamRotation = 0;
        this.planets = [];

        // ブラックホール専用パラメータ
        this.isBlackHole = this.type === 'blackHole';
        this.blackHoleRotation = 0;
        this.eventHorizonRadius = 0;

        // パルサー専用パラメータ
        this.pulsarAge = 0;
        this.rotationPeriod = 0.001;
        this.lastCollisionTime = 0;

        // パーティクルシステムの参照
        this.particleSystem = particleSystem;

        // ★ 追加：太陽黒点管理用プロパティ
        this.sunspots = [];
        
        // ★ 追加：ドラッグ履歴とUI状態
        this.wasDragged = false;
        this.isDragging = false;
        
        // ★ 追加：矢印エフェクト情報
        this.dragArrow = null; // {startX, startY, endX, endY, power}
        this.lastSunspotUpdate = 0;
        this.sunspotUpdateInterval = 3000 + Math.random() * 6000; // 5-15秒間隔
        this.maxSunspots = 2 + Math.floor(Math.random() * 3); // 2-4個

        // 初期化完了
        this.initializeByType();
    }

    // 天体タイプ判定ロジック
    determineBodyType() {
        if (this.mass >= BODY_TYPE_THRESHOLDS.BLACK_HOLE) {
            return 'blackHole';
        } else if (this.mass >= BODY_TYPE_THRESHOLDS.PLANET_SYSTEM) {
            return 'planetSystem';
        } else if (this.mass >= BODY_TYPE_THRESHOLDS.NEUTRON_STAR) {
            if (this.type === 'pulsar') {
                return this.shouldPulsarDecay() ? 'neutronStar' : 'pulsar';
            }
            return Math.random() < 0.1 ? 'pulsar' : 'neutronStar';
        } else if (this.mass >= BODY_TYPE_THRESHOLDS.PULSAR) {
            if (this.hasHighRotationalEnergy()) {
                return 'pulsar';
            }
            return 'neutronStar';
        } else if (this.mass >= BODY_TYPE_THRESHOLDS.WHITE_DWARF) {
            return 'whiteDwarf';
        } else {
            return 'normal';
        }
    }

    // パルサーの磁場減衰判定
    shouldPulsarDecay() {
        if (!this.pulsarAge) this.pulsarAge = 0;
        this.pulsarAge += 1;

        this.magneticField = Math.max(0.1, this.magneticField - 0.0001);

        return this.magneticField < 0.5 || (this.pulsarAge > 500 && Math.random() < 0.001);
    }

    // 高回転エネルギー判定
    hasHighRotationalEnergy() {
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const rotationalThreshold = 100;

        const recentCollision = this.lastCollisionTime && (Date.now() - this.lastCollisionTime) < 100;

        return speed > rotationalThreshold || recentCollision;
    }

    // タイプ別初期化
    initializeByType() {
        switch (this.type) {
            case 'blackHole':
                this.becomeBlackHole();
                break;
            case 'neutronStar':
                this.color = '#E6E6FA';
                this.magneticField = 0.3 + Math.random() * 0.4;
                this.rotation = 0;
                break;
            case 'whiteDwarf':
                this.color = '#F0F8FF';
                this.temperature = 2.0;
                break;
            case 'pulsar':
                this.color = '#00FFFF';
                this.magneticField = 1.2 + Math.random() * 0.6;
                this.beamRotation = 0;
                this.pulsarAge = 0;
                this.rotationPeriod = 0.001 + Math.random() * 0.1;
                console.log(`パルサー誕生: 質量 ${this.mass.toFixed(1)}, 磁場強度 ${this.magneticField.toFixed(2)}, 回転周期 ${this.rotationPeriod.toFixed(3)}s`);
                break;
            case 'planetSystem':
                this.color = '#FFD700';
                this.generatePlanets();
                break;
            default:
                if (!this.color || this.type === 'normal') {
                    this.color = this.generateColor();
                }
                break;
        }
    }

    // ブラックホール化処理
    becomeBlackHole() {
        this.isBlackHole = true;
        this.color = '#000000';
        this.eventHorizonRadius = Math.sqrt(this.mass) * 2;
        console.log(`ブラックホール誕生！質量: ${this.mass.toFixed(1)}`);

        this.createBlackHoleBirthEffect();
    }

    // ブラックホール誕生エフェクト
    createBlackHoleBirthEffect() {
        if (!this.particleSystem) return;

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
            this.particleSystem.addParticle(particle);
        }
    }

    // 惑星系の惑星生成
    generatePlanets() {
        const planetCount = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < planetCount; i++) {
            const distance = 30 + i * 25 + Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.sqrt(this.mass * 0.5 / distance);

            this.planets.push({
                distance: distance,
                angle: angle,
                speed: speed * (0.8 + Math.random() * 0.4),
                size: 1 + Math.random() * 3,
                color: this.generatePlanetColor()
            });
        }
    }

    // 惑星の色生成
    generatePlanetColor() {
        const planetColors = [
            '#8B4513', '#CD853F', '#DEB887', '#F4A460',
            '#4169E1', '#1E90FF', '#87CEEB', '#B0E0E6',
            '#FF6347', '#FF4500', '#DC143C', '#B22222'
        ];
        return planetColors[Math.floor(Math.random() * planetColors.length)];
    }

    // 通常星の色生成
    generateColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
            '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe',
            '#fd79a8', '#fdcb6e', '#00b894', '#e17055',
            '#74b9ff', '#0984e3', '#00cec9', '#e84393'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 天体の位置・速度更新
    update(dt, showTrails, trailLength, canvas) {
        try {
            // ★ 追加：ドラッグ中は物理計算をスキップ
            if (this.isDragging) {
                // ドラッグ中は位置更新のみ行い、速度や軌跡の更新はスキップ
                return;
            }

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

            // 境界条件処理
            this.handleBoundaryConditions(canvas);

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

    // 境界条件処理
    handleBoundaryConditions(canvas) {
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

    // 天体状態の有効性チェック
    isValidState() {
        return isFinite(this.x) && isFinite(this.y) &&
            isFinite(this.vx) && isFinite(this.vy) &&
            this.mass > 0;
    }

    // 進化条件チェック
    shouldEvolve(newType) {
        if (this.type === 'blackHole') return false;

        const typeOrder = ['normal', 'whiteDwarf', 'pulsar', 'neutronStar', 'planetSystem', 'blackHole'];
        const currentIndex = typeOrder.indexOf(this.type);
        const newIndex = typeOrder.indexOf(newType);

        return newIndex > currentIndex || newType === 'blackHole';
    }

    // タイプ別更新処理
    updateByType(dt) {
        switch (this.type) {
            case 'blackHole':
                this.blackHoleRotation += 0.02;
                this.eventHorizonRadius = Math.sqrt(this.mass) * 1.5;
                break;
            case 'neutronStar':
                this.rotation += 0.05;
                this.magneticField = Math.max(0.1, this.magneticField - 0.00001);
                break;
            case 'whiteDwarf':
                this.temperature = Math.max(0.2, this.temperature - 0.0001);
                break;
            case 'pulsar':
                this.beamRotation += this.rotationPeriod > 0.01 ? 0.2 : 0.5;
                this.rotation += 0.15;

                if (this.magneticField > 1.0) {
                    this.rotationPeriod += 0.00001;
                }

                if (!this.pulsarAge) this.pulsarAge = 0;
                this.pulsarAge += dt;
                break;
            case 'planetSystem':
                this.rotation += 0.01;

                this.planets.forEach(planet => {
                    planet.angle += planet.speed * dt;
                });
                break;
        }
    }

    // タイプ別パーティクル生成
    generateParticlesByType() {
        if (!this.particleSystem) return;

        const baseInterval = 15;
        const intervals = {
            'blackHole': 8,
            'neutronStar': 25,
            'pulsar': 10,
            'planetSystem': 40,
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

    // デフォルトパーティクル生成
    createDefaultParticle() {
        const radius = Math.sqrt(this.mass) * 1.5;
        const angle = Math.random() * Math.PI * 2;
        const distance = radius + Math.random() * 10;
        const px = this.x + Math.cos(angle) * distance;
        const py = this.y + Math.sin(angle) * distance;
        this.particleSystem.addParticle(new Particle(px, py, this.color));
    }

    // 日本語タイプ名取得
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

    // 降着円盤パーティクル生成
    createAccretionDiskParticle() {
        const angle = Math.random() * Math.PI * 2;
        const radius = this.eventHorizonRadius * (2 + Math.random() * 3);
        const px = this.x + Math.cos(angle) * radius;
        const py = this.y + Math.sin(angle) * radius;

        const particle = new Particle(px, py, '#ff6b00');
        const spiralSpeed = 0.5;
        particle.vx = -Math.cos(angle) * spiralSpeed + Math.sin(angle) * spiralSpeed * 0.3;
        particle.vy = -Math.sin(angle) * spiralSpeed - Math.cos(angle) * spiralSpeed * 0.3;
        particle.life = 3.0;
        particle.size = 1 + Math.random() * 2;
        this.particleSystem.addParticle(particle);
    }

    // 中性子星の磁場パーティクル
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
        this.particleSystem.addParticle(particle);
    }

    // パルサーのビームパーティクル
    createPulsarBeamParticle() {
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
            this.particleSystem.addParticle(particle);
        }
    }

    // 恒星の太陽風パーティクル
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
        this.particleSystem.addParticle(particle);
    }

    // 衝突による進化処理
    handleCollisionEvolution(impactSpeed, totalMass) {
        try {
            const energyThreshold = 200;
            const massThreshold = 100;

            if (impactSpeed > energyThreshold || totalMass > massThreshold) {
                if (this.mass >= BODY_TYPE_THRESHOLDS.PULSAR && Math.random() < 0.3) {
                    const oldType = this.type;
                    this.type = 'pulsar';
                    this.initializeByType();
                    console.log(`🌟 高エネルギー衝突によりパルサー化: ${this.getTypeNameJapanese(oldType)} → ${this.getTypeNameJapanese()}`);
                }

                if (this.mass >= BODY_TYPE_THRESHOLDS.BLACK_HOLE && Math.random() < 0.5) {
                    const oldType = this.type;
                    this.becomeBlackHole();
                    console.log(`⚫ 大質量衝突によりブラックホール化: ${this.getTypeNameJapanese(oldType)} → ${this.getTypeNameJapanese()}`);
                }
            }

            this.rotationalEnergy = (this.rotationalEnergy || 0) + impactSpeed * 0.1;

        } catch (error) {
            console.warn('Collision evolution error:', error);
        }
    }

    /**
     * 天体の描画（神秘的に改良）
     */
    draw(ctx, showTrails = true) {
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
                    this.drawBlackHole(ctx);
                    break;
                case 'neutronStar':
                    this.drawNeutronStar(ctx);
                    break;
                case 'whiteDwarf':
                    this.drawWhiteDwarf(ctx);
                    break;
                case 'pulsar':
                    this.drawPulsar(ctx);
                    break;
                case 'planetSystem':
                    this.drawPlanetSystem(ctx);
                    break;
                default:
                    this.drawNormalBody(ctx);
                    break;
            }

        } catch (error) {
            console.warn('Body draw error:', error);
        }
    }

    // ★ 追加：中性子星の描画
    drawNeutronStar(ctx) {
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
    drawWhiteDwarf(ctx) {
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
    drawPulsar(ctx) {
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
        this.drawNeutronStar(ctx);

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
    drawPlanetSystem(ctx) {
        // ★ 修正：恒星本体を太陽らしく描画
        this.drawSolarStar(ctx);

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

    // ★ 追加：太陽らしい恒星の描画
    drawSolarStar(ctx) {
        const baseRadius = Math.sqrt(this.mass) * 1;
        const pulseMultiplier = 1 + Math.sin(this.pulsePhase) * 0.15; // 少し大きく脈動
        const radius = baseRadius * pulseMultiplier;

        // ★ 追加：太陽のコロナ効果（最外層）
        for (let layer = 4; layer >= 1; layer--) {
            const coronaRadius = radius * (3 + layer * 0.8);
            const coronaGradient = ctx.createRadialGradient(this.x, this.y, radius, this.x, this.y, coronaRadius);

            const intensity = 0.08 / layer;
            const coronaAlpha = Math.floor(intensity * 255).toString(16).padStart(2, '0');

            coronaGradient.addColorStop(0, '#FFD700' + coronaAlpha);
            coronaGradient.addColorStop(0.3, '#FFA500' + Math.floor(intensity * 128).toString(16).padStart(2, '0'));
            coronaGradient.addColorStop(0.7, '#FF6B47' + Math.floor(intensity * 64).toString(16).padStart(2, '0'));
            coronaGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = coronaGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, coronaRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // ★ 追加：太陽フレア効果（不規則な突起）
        const flareCount = 8;
        for (let i = 0; i < flareCount; i++) {
            const flareAngle = (Math.PI * 2 * i) / flareCount + this.rotation * 0.1;
            const flareLength = radius * (1.5 + Math.sin(this.pulsePhase + i) * 0.8);
            const flareWidth = 3 + Math.sin(this.pulsePhase * 1.5 + i) * 2;

            const flareGradient = ctx.createLinearGradient(
                this.x, this.y,
                this.x + Math.cos(flareAngle) * flareLength,
                this.y + Math.sin(flareAngle) * flareLength
            );

            flareGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            flareGradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.4)');
            flareGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

            ctx.strokeStyle = flareGradient;
            ctx.lineWidth = flareWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(flareAngle) * radius * 0.8,
                this.y + Math.sin(flareAngle) * radius * 0.8);
            ctx.lineTo(this.x + Math.cos(flareAngle) * flareLength,
                this.y + Math.sin(flareAngle) * flareLength);
            ctx.stroke();
        }

        // ★ 修正：太陽の本体部分（多層グラデーション）
        // 外側の彩層
        const chromosphereGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 1.3);
        chromosphereGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        chromosphereGradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.6)');
        chromosphereGradient.addColorStop(0.9, 'rgba(255, 69, 0, 0.8)');
        chromosphereGradient.addColorStop(1, 'rgba(255, 0, 0, 0.9)');

        ctx.fillStyle = chromosphereGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // メインの太陽表面（光球）
        const photosphereGradient = ctx.createRadialGradient(
            this.x - radius * 0.3, this.y - radius * 0.3, 0,
            this.x, this.y, radius
        );
        photosphereGradient.addColorStop(0, '#FFFFFF');
        photosphereGradient.addColorStop(0.1, '#FFFACD'); // レモンシフォン
        photosphereGradient.addColorStop(0.3, '#FFD700'); // ゴールド
        photosphereGradient.addColorStop(0.6, '#FFA500'); // オレンジ
        photosphereGradient.addColorStop(0.8, '#FF8C00'); // ダークオレンジ
        photosphereGradient.addColorStop(1, '#FF6347');   // トマト

        ctx.fillStyle = photosphereGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // ★ 修正：太陽黒点の描画（低頻度更新）
        this.updateSunspots(radius);
        this.drawSunspots(ctx, radius);

        // ★ 修正：太陽の表面テクスチャ（うずまく模様）
        this.drawSolarSwirls(ctx, radius);

        // ★ 追加：太陽の輪郭強調
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ★ 追加：太陽のうずまく表面テクスチャ（最適化・ゆっくり対流）
    drawSolarSwirls(ctx, radius) {
        const timeOffset = this.pulsePhase * 0.02; // ★ 修正：時間変化をさらにゆっくりに

        // ★ 修正：うずの数を固定化して変数削除
        for (let i = 0; i < 5; i++) { // 5個固定
            const centerAngle = (Math.PI * 2 * i) / 5 + timeOffset;
            const centerDistance = radius * (0.3 + (i % 3) * 0.2); // ★ 修正：距離を固定パターンに
            const centerX = this.x + Math.cos(centerAngle) * centerDistance;
            const centerY = this.y + Math.sin(centerAngle) * centerDistance;

            const swirlRadius = radius * 0.2; // ★ 修正：サイズを固定
            const swirlIntensity = 0.4; // ★ 修正：強度を固定

            // ★ 修正：回転方向を固定パターンに
            const clockwise = (i % 2 === 0) ? 1 : -1;

            // うずを構成する螺旋線を描画
            for (let arm = 0; arm < 3; arm++) {
                const armAngle = (Math.PI * 2 * arm) / 3;

                ctx.strokeStyle = `rgba(255, 255, 100, ${0.2 + swirlIntensity * 0.2})`;
                ctx.lineWidth = 1 + swirlIntensity * 0.5;
                ctx.lineCap = 'round';
                ctx.beginPath();

                // ★ 修正：螺旋の点数を削減
                for (let p = 0; p < 12; p++) {
                    const t = p / 12; // 0から1までの進行度
                    const spiralDistance = swirlRadius * t;
                    // ★ 修正：回転をよりゆっくりに
                    const spiralAngle = armAngle + clockwise * t * Math.PI * 2 + timeOffset;

                    const px = centerX + Math.cos(spiralAngle) * spiralDistance;
                    const py = centerY + Math.sin(spiralAngle) * spiralDistance;

                    if (p === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }

                ctx.stroke();

                // ★ 修正：うずの中心部（最初の腕のみ）
                if (arm === 0) {
                    const centerGradient = ctx.createRadialGradient(
                        centerX, centerY, 0,
                        centerX, centerY, swirlRadius * 0.25
                    );
                    centerGradient.addColorStop(0, `rgba(255, 255, 255, ${swirlIntensity * 0.6})`);
                    centerGradient.addColorStop(0.5, `rgba(255, 220, 100, ${swirlIntensity * 0.3})`);
                    centerGradient.addColorStop(1, 'transparent');

                    ctx.fillStyle = centerGradient;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, swirlRadius * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // ★ 修正：流れる効果（簡略化）
            for (let flow = 0; flow < 6; flow++) {
                const flowAngle = (Math.PI * 2 * flow) / 6 + timeOffset * 0.5; // ★ 修正：ゆっくりに
                const flowDistance = swirlRadius * 0.8;
                const flowLength = swirlRadius * 0.3;

                const startX = centerX + Math.cos(flowAngle) * flowDistance;
                const startY = centerY + Math.sin(flowAngle) * flowDistance;

                const flowDirection = flowAngle + clockwise * Math.PI * 0.4;
                const endX = startX + Math.cos(flowDirection) * flowLength;
                const endY = startY + Math.sin(flowDirection) * flowLength;

                ctx.strokeStyle = `rgba(255, 180, 0, ${swirlIntensity * 0.4})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        // ★ 修正：大きな対流セル（よりゆっくり・簡略化）
        for (let cell = 0; cell < 2; cell++) { // ★ 修正：2個に削減
            const cellAngle = (Math.PI * cell) + timeOffset * 0.1; // ★ 修正：さらにゆっくり
            const cellDistance = radius * 0.5;
            const cellX = this.x + Math.cos(cellAngle) * cellDistance;
            const cellY = this.y + Math.sin(cellAngle) * cellDistance;
            const cellSize = radius * 0.25; // ★ 修正：サイズを小さく

            // 対流セルの境界線
            ctx.strokeStyle = `rgba(255, 200, 0, 0.08)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]); // ★ 修正：破線パターンを短く
            ctx.beginPath();
            ctx.arc(cellX, cellY, cellSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // ★ 修正：対流の流れ線（削減）
            for (let f = 0; f < 4; f++) { // ★ 修正：4本に削減
                const fAngle = (Math.PI * 2 * f) / 4 + timeOffset * 0.3; // ★ 修正：ゆっくり
                const fRadius = cellSize * 0.6;
                const fStartX = cellX + Math.cos(fAngle) * fRadius;
                const fStartY = cellY + Math.sin(fAngle) * fRadius;

                const flowLength = cellSize * 0.3;
                const fEndX = fStartX + Math.cos(fAngle + Math.PI * 0.2) * flowLength;
                const fEndY = fStartY + Math.sin(fAngle + Math.PI * 0.2) * flowLength;

                ctx.strokeStyle = `rgba(255, 160, 0, 0.15)`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(fStartX, fStartY);
                ctx.lineTo(fEndX, fEndY);
                ctx.stroke();
            }
        }
    }

    // ★ 追加：太陽黒点の更新管理
    updateSunspots(radius) {
        const currentTime = Date.now();

        // ★ 修正：低頻度での黒点更新チェック
        if (currentTime - this.lastSunspotUpdate > this.sunspotUpdateInterval) {

            // 古い黒点を削除（寿命チェック）
            this.sunspots = this.sunspots.filter(sunspot =>
                currentTime - sunspot.birthTime < sunspot.lifespan
            );

            // ★ 修正：低確率で新しい黒点を生成
            if (this.sunspots.length < this.maxSunspots && Math.random() < 0.3) { // 30%の確率
                const newSunspot = {
                    angle: Math.random() * Math.PI * 2,
                    distance: radius * (0.3 + Math.random() * 0.4),
                    size: radius * (0.08 + Math.random() * 0.06),
                    birthTime: currentTime,
                    lifespan: 15000 + Math.random() * 30000, // 15-45秒の寿命
                    rotationSpeed: (Math.random() - 0.5) * 0.001 // ゆっくり回転
                };
                this.sunspots.push(newSunspot);
                console.log(`太陽黒点生成: 現在${this.sunspots.length}個`);
            }

            // ★ 修正：次回更新時間をランダムに設定（より長い間隔）
            this.sunspotUpdateInterval = 3000 + Math.random() * 6000; // 3-6秒間隔
            this.lastSunspotUpdate = currentTime;
        }

        // ★ 追加：黒点の位置をゆっくり更新（太陽の自転効果）
        this.sunspots.forEach(sunspot => {
            sunspot.angle += sunspot.rotationSpeed;
        });
    }

    // ★ 追加：太陽黒点の描画
    drawSunspots(ctx, radius) {
        this.sunspots.forEach(sunspot => {
            const currentTime = Date.now();
            const age = currentTime - sunspot.birthTime;
            const normalizedAge = age / sunspot.lifespan;

            // ★ 追加：黒点の年齢による透明度変化
            let alpha = 1.0;
            if (normalizedAge < 0.1) {
                // フェードイン（最初の10%）
                alpha = normalizedAge * 10;
            } else if (normalizedAge > 0.8) {
                // フェードアウト（最後の20%）
                alpha = (1.0 - normalizedAge) * 5;
            }

            const spotX = this.x + Math.cos(sunspot.angle) * sunspot.distance;
            const spotY = this.y + Math.sin(sunspot.angle) * sunspot.distance;

            // 黒点の影
            const sunspotGradient = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, sunspot.size);
            sunspotGradient.addColorStop(0, `rgba(50, 25, 0, ${0.9 * alpha})`);
            sunspotGradient.addColorStop(0.6, `rgba(100, 50, 0, ${0.7 * alpha})`);
            sunspotGradient.addColorStop(1, `rgba(255, 140, 0, ${0.3 * alpha})`);

            ctx.fillStyle = sunspotGradient;
            ctx.beginPath();
            ctx.arc(spotX, spotY, sunspot.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ★ 追加：ブラックホール描画
    drawBlackHole(ctx) {
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
    drawNormalBody(ctx) {
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