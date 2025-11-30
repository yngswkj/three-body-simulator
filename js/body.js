'use strict';

import { BODY_TYPE_THRESHOLDS } from './constants.js';
import { Particle } from './particles.js';
import { stellarClassifier, STELLAR_CLASSES, EVOLUTION_STAGES } from './stellar-classification.js';
import { KerrBlackHole } from './kerr-blackhole.js';

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
        this.color = null; // ★ 修正：後で恒星分類により設定

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

        // ★ 追加：カー・ブラックホール
        this.kerrBlackHole = null;

        // パルサー専用パラメータ
        this.pulsarAge = 0;
        this.rotationPeriod = 0.001;
        this.lastCollisionTime = 0;

        // パーティクルシステムの参照
        this.particleSystem = particleSystem;

        // ★ 追加：恒星分類システム
        this.stellarAge = Math.random() * 1e9; // ランダム年齢（年）
        this.stellarClass = null;
        this.evolutionStage = null;
        this.surfaceActivity = 0.5;

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

        // ★ 改善：恒星分類を先に初期化
        this.initializeStellarClassification();

        // 初期化完了
        this.initializeByType();

        // ★ 追加：色が設定されていない場合のフォールバック
        if (!this.color) {
            this.color = this.generateColor();
        }
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
                // ★ 修正：恒星分類により色が設定されていない場合のみフォールバック
                if (!this.color) {
                    this.color = '#FFD700';
                }
                this.generatePlanets();
                break;
            default:
                // ★ 修正：恒星分類により色が設定されている場合は変更しない
                if (!this.color) {
                    this.color = this.generateColor();
                }
                break;
        }
    }

    // ブラックホール化処理
    becomeBlackHole() {
        this.isBlackHole = true;
        this.color = '#000000';

        // ★ 改善：カー・ブラックホールの初期化
        const spin = 0.2 + Math.random() * 0.7; // 0.2-0.9のランダムスピン
        this.kerrBlackHole = new KerrBlackHole(this.mass, spin);

        // ★ 強制：ブラックホールのサイズを適切に調整（質量に比例）
        const visualRadius = Math.max(10, Math.sqrt(this.mass) * 1.6); // 質量100→半径16, 質量400→半径32
        this.eventHorizonRadius = visualRadius;

        // ★ カー・ブラックホールの計算値も更新
        this.kerrBlackHole.eventHorizonRadius = visualRadius;

        // ★ フラグでサイズ固定を管理
        this._blackHoleSizeFixed = true;
        this._fixedEventHorizonRadius = visualRadius;

        console.log(`🌀 カー・ブラックホール誕生！質量: ${this.mass.toFixed(1)}, スピン: ${spin.toFixed(3)}`);

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

    /**
     * ★ 追加：恒星分類の初期化
     */
    initializeStellarClassification() {
        console.log(`🔍 恒星分類チェック: タイプ=${this.type}, 質量=${this.mass}`);

        // 通常星のみ恒星分類を適用（質量10-80未満の範囲）
        if (this.type === 'normal') {
            this.stellarClass = stellarClassifier.classifyByMass(this.mass);

            if (this.stellarClass) {
                // 恒星分類が成功した場合
                this.evolutionStage = stellarClassifier.determineEvolutionStage(
                    this.stellarClass,
                    this.stellarAge,
                    this.stellarClass.solarMass
                );
                this.surfaceActivity = stellarClassifier.calculateSurfaceActivity(
                    this.stellarClass,
                    this.evolutionStage,
                    this.stellarAge
                );

                // 恒星分類に基づく色の更新
                this.updateColorByStellarClass();

                // 温度の設定
                this.temperature = this.stellarClass.data.temp / 5800; // 太陽温度で正規化

                console.log(`🌟 恒星分類適用: ${this.stellarClass.data.name} (${this.stellarClass.type}型) → 色: ${this.color}`);
            } else {
                // 恒星分類範囲外（質量80以上の通常星）
                console.log(`⚪ 恒星分類範囲外の通常星: 質量${this.mass} → デフォルト色使用`);
            }
        } else {
            console.log(`⚪ 恒星分類対象外: ${this.type}`);
        }
    }

    /**
     * ★ 追加：恒星分類に基づく色更新
     */
    updateColorByStellarClass() {
        if (this.stellarClass && this.evolutionStage) {
            // 進化段階による温度補正
            const tempMult = this.evolutionStage.tempMult || 1.0;
            const adjustedTemp = this.stellarClass.data.temp * tempMult;

            console.log(`🎨 色計算: ${this.stellarClass.type}型, 温度=${adjustedTemp}K`);

            // 温度から色を計算
            const rgb = stellarClassifier.getColorFromTemperature(adjustedTemp);
            this.color = stellarClassifier.rgbToHex(rgb);

            console.log(`🎨 色設定完了: RGB=${rgb} → HEX=${this.color}`);
        } else {
            console.log(`❌ 色更新失敗: stellarClass=${!!this.stellarClass}, evolutionStage=${!!this.evolutionStage}`);
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

                // ★ ガード：サイズが固定されている場合は更新しない
                if (!this._blackHoleSizeFixed) {
                    this.eventHorizonRadius = Math.sqrt(this.mass) * 1.5;

                    // ★ 追加：カー・ブラックホールの更新
                    if (this.kerrBlackHole) {
                        this.kerrBlackHole.update(dt);
                        this.eventHorizonRadius = this.kerrBlackHole.eventHorizonRadius;
                    }
                } else {
                    // ★ 固定サイズを保持
                    this.eventHorizonRadius = this._fixedEventHorizonRadius;

                    // ★ カー・ブラックホールのアニメーションのみ更新
                    if (this.kerrBlackHole) {
                        this.kerrBlackHole.update(dt);
                        // サイズは上書きしない
                    }
                }
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

                // 太陽黒点の更新
                const radius = Math.sqrt(this.mass) * 1;
                this.updateSunspots(radius);
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
        // ★ 改善：恒星分類を反映
        if ((type === 'normal' || type === 'planetSystem') && this.stellarClass) {
            const baseName = type === 'planetSystem' ? '惑星系' : '';
            const evolutionName = this.evolutionStage ? ` (${this.evolutionStage.name})` : '';
            return `${this.stellarClass.data.name}${baseName}${evolutionName}`;
        }

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
     * 天体の描画ロジックは BodyRenderer クラスに移動しました。
     */









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


}