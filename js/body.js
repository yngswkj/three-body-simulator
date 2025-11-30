'use strict';

import { BODY_TYPE_THRESHOLDS } from './constants.js';
import { Particle } from './particles.js';
import { evolutionSystem } from './evolution-system.js';

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
        this.type = evolutionSystem.determineType(this);
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
        evolutionSystem.initializeStellarClassification(this);

        // 初期化完了
        evolutionSystem.initializeByType(this);

        // ★ 追加：色が設定されていない場合のフォールバック
        if (!this.color) {
            this.color = evolutionSystem.generateColor();
        }
    }

    // 天体タイプ判定ロジックは EvolutionSystem に移動しました


    // ブラックホール化処理は EvolutionSystem に移動しました


    // 惑星生成処理は EvolutionSystem に移動しました


    // 天体の位置・速度更新
    update(dt, showTrails, trailLength, canvas) {
        try {
            // ★ 追加：ドラッグ中は物理計算をスキップ
            if (this.isDragging) {
                // ドラッグ中は位置更新のみ行い、速度や軌跡の更新はスキップ
                return;
            }

            // 天体タイプ変化チェック
            const newType = evolutionSystem.determineType(this);
            if (newType !== this.type && evolutionSystem.shouldEvolve(this, newType)) {
                const oldType = this.type;
                this.type = newType;
                evolutionSystem.initializeByType(this);
                console.log(`天体進化: ${this.getTypeNameJapanese(oldType)} → ${this.getTypeNameJapanese()} (質量: ${this.mass.toFixed(1)})`);
            }

            // タイプ別更新処理
            evolutionSystem.updateByType(this, dt);

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

    // 進化条件チェックは EvolutionSystem に移動しました

    // タイプ別更新処理は EvolutionSystem に移動しました


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
        return evolutionSystem.getTypeNameJapanese(this, type);
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

    // 衝突による進化処理は EvolutionSystem に移動しました

    // 太陽黒点の更新管理は EvolutionSystem に移動しました



}