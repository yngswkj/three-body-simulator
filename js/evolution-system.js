import { BODY_TYPE_THRESHOLDS } from './constants.js';
import { stellarClassifier } from './stellar-classification.js';
import { KerrBlackHole } from './kerr-blackhole.js';
import { Particle } from './particles.js';

/**
 * 天体の進化・タイプ判定・状態更新を管理するシステム
 */
export class EvolutionSystem {
    constructor() {
    }

    /**
     * 天体のタイプを決定する
     * @param {Body} body 
     */
    determineType(body) {
        if (body.mass >= BODY_TYPE_THRESHOLDS.BLACK_HOLE) {
            return 'blackHole';
        } else if (body.mass >= BODY_TYPE_THRESHOLDS.PLANET_SYSTEM) {
            return 'planetSystem';
        } else if (body.mass >= BODY_TYPE_THRESHOLDS.NEUTRON_STAR) {
            if (body.type === 'pulsar') {
                return this.shouldPulsarDecay(body) ? 'neutronStar' : 'pulsar';
            }
            return Math.random() < 0.1 ? 'pulsar' : 'neutronStar';
        } else if (body.mass >= BODY_TYPE_THRESHOLDS.PULSAR) {
            if (this.hasHighRotationalEnergy(body)) {
                return 'pulsar';
            }
            return 'neutronStar';
        } else if (body.mass >= BODY_TYPE_THRESHOLDS.WHITE_DWARF) {
            return 'whiteDwarf';
        } else {
            return 'normal';
        }
    }

    /**
     * パルサーの磁場減衰判定
     */
    shouldPulsarDecay(body) {
        if (!body.pulsarAge) body.pulsarAge = 0;
        body.pulsarAge += 1;

        body.magneticField = Math.max(0.1, body.magneticField - 0.0001);

        return body.magneticField < 0.5 || (body.pulsarAge > 500 && Math.random() < 0.001);
    }

    /**
     * 高回転エネルギー判定
     */
    hasHighRotationalEnergy(body) {
        const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
        const rotationalThreshold = 100;

        const recentCollision = body.lastCollisionTime && (Date.now() - body.lastCollisionTime) < 100;

        return speed > rotationalThreshold || recentCollision;
    }

    /**
     * 進化条件チェック
     */
    shouldEvolve(body, newType) {
        if (body.type === 'blackHole') return false;

        const typeOrder = ['normal', 'whiteDwarf', 'pulsar', 'neutronStar', 'planetSystem', 'blackHole'];
        const currentIndex = typeOrder.indexOf(body.type);
        const newIndex = typeOrder.indexOf(newType);

        return newIndex > currentIndex || newType === 'blackHole';
    }

    /**
     * タイプ別初期化
     */
    initializeByType(body) {
        switch (body.type) {
            case 'blackHole':
                this.becomeBlackHole(body);
                break;
            case 'neutronStar':
                body.color = '#E6E6FA';
                body.magneticField = 0.3 + Math.random() * 0.4;
                body.rotation = 0;
                break;
            case 'whiteDwarf':
                body.color = '#F0F8FF';
                body.temperature = 2.0;
                break;
            case 'pulsar':
                body.color = '#00FFFF';
                body.magneticField = 1.2 + Math.random() * 0.6;
                body.beamRotation = 0;
                body.pulsarAge = 0;
                body.rotationPeriod = 0.001 + Math.random() * 0.1;
                console.log(`パルサー誕生: 質量 ${body.mass.toFixed(1)}, 磁場強度 ${body.magneticField.toFixed(2)}, 回転周期 ${body.rotationPeriod.toFixed(3)}s`);
                break;
            case 'planetSystem':
                // 恒星分類により色が設定されていない場合のみフォールバック
                if (!body.color) {
                    body.color = '#FFD700';
                }
                this.generatePlanets(body);
                break;
            default:
                // 恒星分類により色が設定されている場合は変更しない
                if (!body.color) {
                    body.color = this.generateColor();
                }
                break;
        }
    }

    /**
     * ブラックホール化処理
     */
    becomeBlackHole(body) {
        body.isBlackHole = true;
        body.color = '#000000';

        // カー・ブラックホールの初期化
        const spin = 0.2 + Math.random() * 0.7; // 0.2-0.9のランダムスピン
        body.kerrBlackHole = new KerrBlackHole(body.mass, spin);

        // ブラックホールのサイズを適切に調整（質量に比例）
        const visualRadius = Math.max(10, Math.sqrt(body.mass) * 1.6);
        body.eventHorizonRadius = visualRadius;

        // カー・ブラックホールの計算値も更新
        body.kerrBlackHole.eventHorizonRadius = visualRadius;

        // フラグでサイズ固定を管理
        body._blackHoleSizeFixed = true;
        body._fixedEventHorizonRadius = visualRadius;

        console.log(`🌀 カー・ブラックホール誕生！質量: ${body.mass.toFixed(1)}, スピン: ${spin.toFixed(3)}`);

        this.createBlackHoleBirthEffect(body);
    }

    /**
     * ブラックホール誕生エフェクト
     */
    createBlackHoleBirthEffect(body) {
        if (!body.particleSystem) return;

        for (let i = 0; i < 50; i++) {
            const angle = (Math.PI * 2 * i) / 50;
            const speed = 5 + Math.random() * 8;
            const distance = 20 + Math.random() * 30;
            const px = body.x + Math.cos(angle) * distance;
            const py = body.y + Math.sin(angle) * distance;

            const particle = new Particle(px, py, '#ffffff');
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 2.0;
            particle.size = 3 + Math.random() * 4;
            body.particleSystem.addParticle(particle);
        }
    }

    /**
     * 惑星系の惑星生成
     */
    generatePlanets(body) {
        const planetCount = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < planetCount; i++) {
            const distance = 30 + i * 25 + Math.random() * 20;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.sqrt(body.mass * 0.5 / distance);

            body.planets.push({
                distance: distance,
                angle: angle,
                speed: speed * (0.8 + Math.random() * 0.4),
                size: 1 + Math.random() * 3,
                color: this.generatePlanetColor()
            });
        }
    }

    generatePlanetColor() {
        const planetColors = [
            '#8B4513', '#CD853F', '#DEB887', '#F4A460',
            '#4169E1', '#1E90FF', '#87CEEB', '#B0E0E6',
            '#FF6347', '#FF4500', '#DC143C', '#B22222'
        ];
        return planetColors[Math.floor(Math.random() * planetColors.length)];
    }

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
     * 恒星分類の初期化
     */
    initializeStellarClassification(body) {
        // 通常星のみ恒星分類を適用（質量10-80未満の範囲）
        if (body.type === 'normal') {
            body.stellarClass = stellarClassifier.classifyByMass(body.mass);

            if (body.stellarClass) {
                // 恒星分類が成功した場合
                body.evolutionStage = stellarClassifier.determineEvolutionStage(
                    body.stellarClass,
                    body.stellarAge,
                    body.stellarClass.solarMass
                );
                body.surfaceActivity = stellarClassifier.calculateSurfaceActivity(
                    body.stellarClass,
                    body.evolutionStage,
                    body.stellarAge
                );

                // 恒星分類に基づく色の更新
                this.updateColorByStellarClass(body);

                // 温度の設定
                body.temperature = body.stellarClass.data.temp / 5800; // 太陽温度で正規化
            }
        }
    }

    /**
     * 恒星分類に基づく色更新
     */
    updateColorByStellarClass(body) {
        if (body.stellarClass && body.evolutionStage) {
            // 進化段階による温度補正
            const tempMult = body.evolutionStage.tempMult || 1.0;
            const adjustedTemp = body.stellarClass.data.temp * tempMult;

            // 温度から色を計算
            const rgb = stellarClassifier.getColorFromTemperature(adjustedTemp);
            body.color = stellarClassifier.rgbToHex(rgb);
        }
    }

    /**
     * タイプ別更新処理
     */
    updateByType(body, dt) {
        switch (body.type) {
            case 'blackHole':
                body.blackHoleRotation += 0.02;

                if (!body._blackHoleSizeFixed) {
                    body.eventHorizonRadius = Math.sqrt(body.mass) * 1.5;

                    if (body.kerrBlackHole) {
                        body.kerrBlackHole.update(dt);
                        body.eventHorizonRadius = body.kerrBlackHole.eventHorizonRadius;
                    }
                } else {
                    body.eventHorizonRadius = body._fixedEventHorizonRadius;

                    if (body.kerrBlackHole) {
                        body.kerrBlackHole.update(dt);
                    }
                }
                break;
            case 'neutronStar':
                body.rotation += 0.05;
                body.magneticField = Math.max(0.1, body.magneticField - 0.00001);
                break;
            case 'whiteDwarf':
                body.temperature = Math.max(0.2, body.temperature - 0.0001);
                break;
            case 'pulsar':
                body.beamRotation += body.rotationPeriod > 0.01 ? 0.2 : 0.5;
                body.rotation += 0.15;

                if (body.magneticField > 1.0) {
                    body.rotationPeriod += 0.00001;
                }

                if (!body.pulsarAge) body.pulsarAge = 0;
                body.pulsarAge += dt;
                break;
            case 'planetSystem':
                body.rotation += 0.01;

                body.planets.forEach(planet => {
                    planet.angle += planet.speed * dt;
                });

                // 太陽黒点の更新
                const radius = Math.sqrt(body.mass) * 1;
                this.updateSunspots(body, radius);
                break;
        }
    }

    /**
     * 太陽黒点の更新管理
     */
    updateSunspots(body, radius) {
        const currentTime = Date.now();

        if (currentTime - body.lastSunspotUpdate > body.sunspotUpdateInterval) {
            // 古い黒点を削除
            body.sunspots = body.sunspots.filter(sunspot =>
                currentTime - sunspot.birthTime < sunspot.lifespan
            );

            // 新しい黒点を生成
            if (body.sunspots.length < body.maxSunspots && Math.random() < 0.3) {
                const newSunspot = {
                    angle: Math.random() * Math.PI * 2,
                    distance: radius * (0.3 + Math.random() * 0.4),
                    size: radius * (0.08 + Math.random() * 0.06),
                    birthTime: currentTime,
                    lifespan: 15000 + Math.random() * 30000,
                    rotationSpeed: (Math.random() - 0.5) * 0.001
                };
                body.sunspots.push(newSunspot);
            }

            body.sunspotUpdateInterval = 3000 + Math.random() * 6000;
            body.lastSunspotUpdate = currentTime;
        }

        body.sunspots.forEach(sunspot => {
            sunspot.angle += sunspot.rotationSpeed;
        });
    }

    /**
     * 衝突による進化処理
     */
    handleCollisionEvolution(body, impactSpeed, totalMass) {
        try {
            const energyThreshold = 200;
            const massThreshold = 100;

            if (impactSpeed > energyThreshold || totalMass > massThreshold) {
                if (body.mass >= BODY_TYPE_THRESHOLDS.PULSAR && Math.random() < 0.3) {
                    body.type = 'pulsar';
                    this.initializeByType(body);
                }

                if (body.mass >= BODY_TYPE_THRESHOLDS.BLACK_HOLE && Math.random() < 0.5) {
                    this.becomeBlackHole(body);
                }
            }

            body.rotationalEnergy = (body.rotationalEnergy || 0) + impactSpeed * 0.1;

        } catch (error) {
            console.warn('Collision evolution error:', error);
        }
    }

    /**
     * 日本語タイプ名取得
     */
    getTypeNameJapanese(body, type = body.type) {
        // 恒星分類を反映
        if ((type === 'normal' || type === 'planetSystem') && body.stellarClass) {
            const baseName = type === 'planetSystem' ? '惑星系' : '';
            const evolutionName = body.evolutionStage ? ` (${body.evolutionStage.name})` : '';
            return `${body.stellarClass.data.name}${baseName}${evolutionName}`;
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
}

// グローバルインスタンス
export const evolutionSystem = new EvolutionSystem();
