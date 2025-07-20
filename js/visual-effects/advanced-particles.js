'use strict';

/**
 * 高度なパーティクルエフェクトシステム
 * GAME_ENHANCEMENT_PLAN.md Phase G1.2の実装
 * 恒星風、重力波、磁場、プラズマトレイル、エネルギーバースト、ワームホールなどの効果
 */

/**
 * 高度なパーティクルクラス（基底クラスを拡張）
 */
export class AdvancedParticle {
    constructor(x, y, config = {}) {
        // 基本プロパティ
        this.x = x;
        this.y = y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.ax = config.ax || 0; // 加速度
        this.ay = config.ay || 0;
        
        // ライフサイクル
        this.life = config.life || 1.0;
        this.maxLife = this.life;
        this.decay = config.decay || 0.02;
        
        // 視覚プロパティ
        this.size = config.size || 2;
        this.color = config.color || '#ffffff';
        this.opacity = config.opacity || 1.0;
        
        // 物理プロパティ
        this.mass = config.mass || 1;
        this.charge = config.charge || 0; // 電荷
        this.magneticMoment = config.magneticMoment || 0;
        
        // エフェクトタイプ
        this.type = config.type || 'default';
        this.behaviorData = config.behaviorData || {};
        
        // アニメーション
        this.rotation = config.rotation || 0;
        this.rotationSpeed = config.rotationSpeed || 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = config.pulseSpeed || 0.1;
        
        // 軌跡
        this.trail = [];
        this.maxTrailLength = config.maxTrailLength || 0;
        
        // 物理的相互作用
        this.gravityAffected = config.gravityAffected || false;
        this.magneticAffected = config.magneticAffected || false;
    }
    
    update(deltaTime, forces = {}) {
        // 外部力の適用
        if (forces.gravity && this.gravityAffected) {
            this.ax += forces.gravity.x;
            this.ay += forces.gravity.y;
        }
        
        if (forces.magnetic && this.magneticAffected) {
            this.applyMagneticForce(forces.magnetic);
        }
        
        // 速度更新
        this.vx += this.ax * deltaTime;
        this.vy += this.ay * deltaTime;
        
        // 位置更新
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        // 軌跡更新
        if (this.maxTrailLength > 0) {
            this.trail.push({ x: this.x, y: this.y, life: this.life });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }
        
        // 回転更新
        this.rotation += this.rotationSpeed * deltaTime;
        this.pulsePhase += this.pulseSpeed * deltaTime;
        
        // ライフ更新
        this.life -= this.decay * deltaTime;
        
        // 加速度リセット
        this.ax = 0;
        this.ay = 0;
        
        // タイプ別更新
        this.updateByType(deltaTime);
    }
    
    updateByType(deltaTime) {
        switch (this.type) {
            case 'stellar_wind':
                this.updateStellarWind(deltaTime);
                break;
            case 'gravitational_wave':
                this.updateGravitationalWave(deltaTime);
                break;
            case 'magnetic_field':
                this.updateMagneticField(deltaTime);
                break;
            case 'plasma_trail':
                this.updatePlasmaTrail(deltaTime);
                break;
            case 'energy_burst':
                this.updateEnergyBurst(deltaTime);
                break;
            case 'wormhole':
                this.updateWormhole(deltaTime);
                break;
            case 'lensing_photon':
                this.updateLensingPhoton(deltaTime);
                break;
            case 'spacetime_bubble':
                this.updateSpacetimeBubble(deltaTime);
                break;
        }
    }
    
    updateStellarWind(deltaTime) {
        // 恒星風は放射状に拡散し、徐々に加速
        const distance = Math.sqrt(this.x * this.x + this.y * this.y);
        const acceleration = this.behaviorData.windStrength / (distance + 1);
        
        this.vx += (this.vx / Math.max(1, Math.sqrt(this.vx * this.vx + this.vy * this.vy))) * acceleration * deltaTime;
        this.vy += (this.vy / Math.max(1, Math.sqrt(this.vx * this.vx + this.vy * this.vy))) * acceleration * deltaTime;
        
        // 大きさの変化
        this.size *= 1 + this.behaviorData.expansionRate * deltaTime;
    }
    
    updateGravitationalWave(deltaTime) {
        // 重力波は円形に拡散
        this.behaviorData.radius += this.behaviorData.expansionSpeed * deltaTime;
        
        // 円周上での位置更新
        const angle = this.behaviorData.angle;
        this.x = this.behaviorData.centerX + Math.cos(angle) * this.behaviorData.radius;
        this.y = this.behaviorData.centerY + Math.sin(angle) * this.behaviorData.radius;
        
        // 透明度は距離に反比例
        this.opacity = Math.max(0, this.behaviorData.initialOpacity * (1 - this.behaviorData.radius / this.behaviorData.maxRadius));
    }
    
    updateMagneticField(deltaTime) {
        // 磁場線に沿った運動
        const fieldData = this.behaviorData;
        fieldData.t += fieldData.speed * deltaTime;
        
        // 磁場線のパラメトリック表現
        const angle = fieldData.baseAngle + fieldData.twist * fieldData.t;
        const radius = fieldData.baseRadius + fieldData.radiusVariation * Math.sin(fieldData.t);
        
        this.x = fieldData.centerX + Math.cos(angle) * radius;
        this.y = fieldData.centerY + Math.sin(angle) * radius;
        
        // 色の変化（磁場強度）
        const intensity = 0.5 + 0.5 * Math.sin(fieldData.t * 2);
        this.opacity = intensity * (this.life / this.maxLife);
    }
    
    updatePlasmaTrail(deltaTime) {
        // プラズマは電磁場の影響を受ける
        const data = this.behaviorData;
        
        // 螺旋運動
        data.spiralPhase += data.spiralSpeed * deltaTime;
        const spiralRadius = data.spiralRadius * (this.life / this.maxLife);
        
        this.vx += Math.cos(data.spiralPhase) * spiralRadius * 0.1;
        this.vy += Math.sin(data.spiralPhase) * spiralRadius * 0.1;
        
        // 温度による色変化
        const temperature = this.life / this.maxLife;
        this.updatePlasmaColor(temperature);
    }
    
    updateEnergyBurst(deltaTime) {
        // エネルギーバーストは爆発的に拡散
        const data = this.behaviorData;
        const age = 1 - (this.life / this.maxLife);
        
        // 爆発の衝撃波
        if (age < 0.3) {
            const shockAcceleration = data.burstStrength * (0.3 - age) / 0.3;
            const direction = Math.atan2(this.vy, this.vx);
            this.ax += Math.cos(direction) * shockAcceleration;
            this.ay += Math.sin(direction) * shockAcceleration;
        }
        
        // サイズの変化
        this.size = data.initialSize * (1 + age * 2);
    }
    
    updateWormhole(deltaTime) {
        // ワームホール効果 - 螺旋状に吸い込まれる
        const data = this.behaviorData;
        
        // 目標への方向
        const dx = data.targetX - this.x;
        const dy = data.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 1) {
            // 螺旋運動
            data.spiralAngle += data.spiralSpeed * deltaTime;
            const spiralForce = data.suctionStrength / (distance + 1);
            
            // 中心への力
            this.ax += (dx / distance) * spiralForce;
            this.ay += (dy / distance) * spiralForce;
            
            // 接線方向の力（螺旋効果）
            this.ax += (-dy / distance) * spiralForce * 0.3 * Math.sin(data.spiralAngle);
            this.ay += (dx / distance) * spiralForce * 0.3 * Math.sin(data.spiralAngle);
        }
        
        // 色の変化（深度による）
        const depth = 1 - distance / data.maxDistance;
        this.updateWormholeColor(depth);
    }
    
    updateLensingPhoton(deltaTime) {
        // 重力レンズ効果による光子の軌道
        const data = this.behaviorData;
        
        // ブラックホールとの距離
        const dx = data.blackHoleX - this.x;
        const dy = data.blackHoleY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 重力による軌道の曲がり（アインシュタインの一般相対性理論）
        const gravitationalStrength = data.mass / (distance * distance + 1);
        const deflectionAngle = gravitationalStrength * deltaTime * 0.1;
        
        // 速度ベクトルの回転（光線の曲がり）
        const currentAngle = Math.atan2(this.vy, this.vx);
        const targetAngle = Math.atan2(dy, dx);
        const angleToBlackHole = targetAngle - currentAngle;
        
        // 軌道の曲がり効果
        const bendEffect = Math.sin(angleToBlackHole) * deflectionAngle;
        const newAngle = currentAngle + bendEffect;
        
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
        
        // 赤方偏移効果（重力による周波数変化）
        const redshiftFactor = 1 + gravitationalStrength * 0.1;
        this.updatePhotonColor(redshiftFactor);
        
        // 距離による減衰
        this.opacity *= 0.998;
    }
    
    updatePlasmaColor(temperature) {
        // 温度に基づくプラズマの色変化
        if (temperature > 0.8) {
            this.color = '#ffffff'; // 白熱
        } else if (temperature > 0.6) {
            this.color = '#ffff99'; // 黄白
        } else if (temperature > 0.4) {
            this.color = '#ff9999'; // オレンジ
        } else if (temperature > 0.2) {
            this.color = '#ff6666'; // 赤
        } else {
            this.color = '#660000'; // 暗赤
        }
    }
    
    updateWormholeColor(depth) {
        // 深度に基づく色変化
        const hue = 280 + depth * 80; // 紫から青へ
        const saturation = 70;
        const lightness = 60 * (1 - depth * 0.5);
        this.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
    
    updatePhotonColor(redshiftFactor) {
        // 赤方偏移による光子の色変化
        if (redshiftFactor > 1.2) {
            this.color = '#ff0000'; // 赤方偏移
        } else if (redshiftFactor > 1.1) {
            this.color = '#ffaa00'; // オレンジ
        } else if (redshiftFactor < 0.9) {
            this.color = '#0088ff'; // 青方偏移
        } else if (redshiftFactor < 0.95) {
            this.color = '#00aaff'; // 青
        } else {
            this.color = '#ffffff'; // 白色光
        }
    }
    
    applyMagneticForce(magneticField) {
        // ローレンツ力 F = q(v × B)
        if (this.charge === 0) return;
        
        const force = this.charge * (this.vx * magneticField.y - this.vy * magneticField.x);
        this.ax += force * magneticField.y;
        this.ay -= force * magneticField.x;
    }
    
    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        
        // 軌跡の描画
        this.drawTrail(ctx);
        
        // タイプ別描画
        switch (this.type) {
            case 'gravitational_wave':
                this.drawGravitationalWave(ctx);
                break;
            case 'magnetic_field':
                this.drawMagneticField(ctx);
                break;
            case 'energy_burst':
                this.drawEnergyBurst(ctx);
                break;
            case 'spacetime_bubble':
                this.drawSpacetimeBubble(ctx);
                break;
            case 'bubble_fragment':
                this.drawBubbleFragment(ctx);
                break;
            default:
                this.drawDefault(ctx);
                break;
        }
        
        ctx.restore();
    }
    
    drawTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            const prevPoint = this.trail[i - 1];
            const alpha = (point.life / this.maxLife) * this.opacity * (i / this.trail.length);
            
            ctx.strokeStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('hsl', 'hsla');
            ctx.lineWidth = this.size * (i / this.trail.length);
            
            ctx.beginPath();
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }
    }
    
    drawDefault(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;
        const currentSize = this.size * pulse;
        
        ctx.globalAlpha = this.opacity * (this.life / this.maxLife);
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawGravitationalWave(ctx) {
        // 重力波の波紋
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(this.behaviorData.centerX, this.behaviorData.centerY, this.behaviorData.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawMagneticField(ctx) {
        // 磁場線
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        
        const data = this.behaviorData;
        const nextAngle = data.baseAngle + data.twist * (data.t + 0.1);
        const nextRadius = data.baseRadius + data.radiusVariation * Math.sin(data.t + 0.1);
        const nextX = data.centerX + Math.cos(nextAngle) * nextRadius;
        const nextY = data.centerY + Math.sin(nextAngle) * nextRadius;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();
    }
    
    drawEnergyBurst(ctx) {
        const data = this.behaviorData;
        const age = 1 - (this.life / this.maxLife);
        
        // 爆発の光球
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, this.color.replace(')', `, ${this.opacity})`).replace('rgb', 'rgba'));
        gradient.addColorStop(0.7, this.color.replace(')', `, ${this.opacity * 0.5})`).replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawSpacetimeBubble(ctx) {
        if (this.life <= 0) return;
        
        const data = this.behaviorData;
        const age = 1 - (this.life / this.maxLife);
        const time = Date.now() * 0.001;
        
        // 泡のメインボディ
        const bubbleGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.size
        );
        
        // 虹色効果の計算
        const shimmer = Math.sin(time * 4 + age * Math.PI) * 0.3 + 0.7;
        const baseAlpha = this.opacity * (this.life / this.maxLife);
        
        // 泡の外縁（薄い白色のリム）
        bubbleGradient.addColorStop(0, 'transparent');
        bubbleGradient.addColorStop(0.7, 'transparent');
        bubbleGradient.addColorStop(0.85, this.color.replace(')', `, ${baseAlpha * 0.4 * shimmer})`).replace('hsl', 'hsla'));
        bubbleGradient.addColorStop(0.95, `rgba(255, 255, 255, ${baseAlpha * 0.8 * shimmer})`);
        bubbleGradient.addColorStop(1, `rgba(255, 255, 255, ${baseAlpha * 0.3})`);
        
        ctx.fillStyle = bubbleGradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // ハイライト（泡の上部に光沢）
        const highlightSize = this.size * 0.3;
        const highlightX = this.x - this.size * 0.2;
        const highlightY = this.y - this.size * 0.2;
        
        const highlightGradient = ctx.createRadialGradient(
            highlightX, highlightY, 0,
            highlightX, highlightY, highlightSize
        );
        highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha * 0.9 * shimmer})`);
        highlightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${baseAlpha * 0.4 * shimmer})`);
        highlightGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.arc(highlightX, highlightY, highlightSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 泡の影（下部に暗い部分）
        if (this.size > 3) {
            const shadowSize = this.size * 0.4;
            const shadowX = this.x + this.size * 0.15;
            const shadowY = this.y + this.size * 0.25;
            
            const shadowGradient = ctx.createRadialGradient(
                shadowX, shadowY, 0,
                shadowX, shadowY, shadowSize
            );
            shadowGradient.addColorStop(0, `rgba(100, 100, 150, ${baseAlpha * 0.3})`);
            shadowGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = shadowGradient;
            ctx.beginPath();
            ctx.arc(shadowX, shadowY, shadowSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawBubbleFragment(ctx) {
        // 簡単な小さな点として描画
        ctx.globalAlpha = this.opacity * (this.life / this.maxLife);
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    isDead() {
        return this.life <= 0;
    }
}

/**
 * 高度なパーティクルシステム管理クラス
 */
export class AdvancedParticleSystem {
    constructor() {
        this.particles = [];
        this.effectTypes = {
            'stellar_wind': this.createStellarWind.bind(this),
            'gravitational_waves': this.createGravitationalWaves.bind(this),
            'magnetic_field': this.createMagneticField.bind(this),
            'plasma_trail': this.createPlasmaTrail.bind(this),
            'energy_burst': this.createEnergyBurst.bind(this),
            'wormhole': this.createWormholeEffect.bind(this),
            'gravitational_lensing_photons': this.createGravitationalLensingPhotons.bind(this),
            'spacetime_bubbles': this.createSpacetimeBubbles.bind(this)
        };
        
        // 物理環境
        this.globalForces = {
            gravity: { x: 0, y: 0 },
            magnetic: { x: 0, y: 0 }
        };
        
        // ★ パフォーマンス制御を強化
        this.maxParticles = 500; // 更に制限を強化
        this.qualityLevel = 0.7; // 品質を下げてパフォーマンス改善
        this.performanceMode = false;
        this.lastCleanup = Date.now();
    }
    
    /**
     * 恒星風エフェクト生成
     */
    createStellarWind(star, intensity = 1.0) {
        const particleCount = Math.floor(50 * intensity * this.qualityLevel);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = 20 + Math.random() * 30;
            const distance = star.radius * (1.5 + Math.random() * 0.5);
            
            const particle = new AdvancedParticle(
                star.x + Math.cos(angle) * distance,
                star.y + Math.sin(angle) * distance,
                {
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    life: 2 + Math.random() * 3,
                    size: 1 + Math.random() * 2,
                    color: `hsl(${30 + Math.random() * 60}, 80%, 70%)`,
                    opacity: 0.8,
                    type: 'stellar_wind',
                    maxTrailLength: 10,
                    behaviorData: {
                        windStrength: intensity * 50,
                        expansionRate: 0.1
                    }
                }
            );
            
            this.particles.push(particle);
        }
        
        console.log(`⭐ 恒星風エフェクト生成: ${particleCount}個`);
    }
    
    /**
     * 重力波エフェクト生成
     */
    createGravitationalWaves(body1, body2, intensity = 1.0) {
        const midX = (body1.x + body2.x) / 2;
        const midY = (body1.y + body2.y) / 2;
        const waveCount = Math.floor(5 * intensity * this.qualityLevel);
        
        for (let ring = 0; ring < waveCount; ring++) {
            const angleCount = Math.floor(32 * this.qualityLevel);
            
            for (let i = 0; i < angleCount; i++) {
                const angle = (i / angleCount) * Math.PI * 2;
                
                const particle = new AdvancedParticle(midX, midY, {
                    life: 3 + ring * 0.5,
                    size: 1,
                    color: '#4ecdc4',
                    type: 'gravitational_wave',
                    behaviorData: {
                        centerX: midX,
                        centerY: midY,
                        angle: angle,
                        radius: ring * 20,
                        maxRadius: 200 + ring * 50,
                        expansionSpeed: 50 + ring * 10,
                        initialOpacity: 0.6 - ring * 0.1
                    }
                });
                
                this.particles.push(particle);
            }
        }
        
        console.log(`🌊 重力波エフェクト生成: ${waveCount}波`);
    }
    
    /**
     * ブラックホール合体時の泡状パーティクルエフェクト生成
     */
    createSpacetimeBubbles(blackHoles, intensity = 1.0) {
        if (!blackHoles || blackHoles.length === 0) return;
        
        blackHoles.forEach((bh, index) => {
            const baseMass = Math.abs(bh.mass || 30);
            const bubbleRegionRadius = Math.sqrt(baseMass) * 15;
            const bubbleCount = Math.floor(80 * intensity * this.qualityLevel);
            
            // 各ブラックホール周辺に泡状パーティクルを生成
            for (let i = 0; i < bubbleCount; i++) {
                // 泡の初期位置（ブラックホール周辺のランダム分布）
                const angle = Math.random() * Math.PI * 2;
                const distance = bubbleRegionRadius * (0.3 + Math.random() * 0.7);
                const x = bh.x + Math.cos(angle) * distance;
                const y = bh.y + Math.sin(angle) * distance;
                
                // 泡のサイズ（大小さまざま）
                const bubbleSize = 2 + Math.random() * 8;
                const bubbleLifetime = 4 + Math.random() * 6;
                
                // 泡の色（青紫から白まで）
                const hue = 240 + Math.random() * 60; // 青紫系
                const saturation = 60 + Math.random() * 40;
                const lightness = 50 + Math.random() * 40;
                
                const particle = new AdvancedParticle(x, y, {
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20,
                    life: bubbleLifetime,
                    size: bubbleSize,
                    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                    opacity: 0.7 + Math.random() * 0.3,
                    type: 'spacetime_bubble',
                    pulseSpeed: 0.5 + Math.random() * 1.0,
                    maxTrailLength: 0, // 泡は軌跡を残さない
                    behaviorData: {
                        blackHoleX: bh.x,
                        blackHoleY: bh.y,
                        mass: baseMass,
                        bubbleRadius: bubbleSize,
                        maxBubbleRadius: bubbleSize * 3,
                        expansionPhase: Math.random() * Math.PI * 2,
                        expansionSpeed: 1.5 + Math.random() * 2.0,
                        floatSpeed: 10 + Math.random() * 20,
                        wobbleFrequency: 2 + Math.random() * 3,
                        wobbleAmplitude: 5 + Math.random() * 10,
                        iridescence: Math.random() * 0.5 + 0.5, // 虹色効果
                        popProbability: 0.0001 + Math.random() * 0.0005 // 泡が弾ける確率
                    }
                });
                
                this.particles.push(particle);
            }
        });
        
        console.log(`🫧 時空の泡エフェクト生成: ${blackHoles.length}個のブラックホール周辺`);
    }
    
    /**
     * 磁場エフェクト生成
     */
    createMagneticField(source, intensity = 1.0) {
        const fieldLines = Math.floor(8 * intensity * this.qualityLevel);
        
        for (let line = 0; line < fieldLines; line++) {
            const baseAngle = (line / fieldLines) * Math.PI * 2;
            const particlesPerLine = Math.floor(20 * this.qualityLevel);
            
            for (let i = 0; i < particlesPerLine; i++) {
                const particle = new AdvancedParticle(source.x, source.y, {
                    life: 4 + Math.random() * 2,
                    size: 1,
                    color: '#9370DB',
                    type: 'magnetic_field',
                    behaviorData: {
                        centerX: source.x,
                        centerY: source.y,
                        baseAngle: baseAngle,
                        baseRadius: 20 + i * 5,
                        twist: 0.1,
                        speed: 0.5,
                        t: i * 0.1,
                        radiusVariation: 10
                    }
                });
                
                this.particles.push(particle);
            }
        }
        
        console.log(`🧲 磁場エフェクト生成: ${fieldLines}本の磁場線`);
    }
    
    /**
     * プラズマトレイルエフェクト生成
     */
    createPlasmaTrail(source, target, intensity = 1.0) {
        const particleCount = Math.floor(30 * intensity * this.qualityLevel);
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        for (let i = 0; i < particleCount; i++) {
            const progress = i / particleCount;
            const x = source.x + dx * progress;
            const y = source.y + dy * progress;
            
            const particle = new AdvancedParticle(x, y, {
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 3 + Math.random() * 2,
                size: 1 + Math.random() * 2,
                color: '#ff6600',
                type: 'plasma_trail',
                charge: Math.random() - 0.5,
                magneticAffected: true,
                maxTrailLength: 15,
                behaviorData: {
                    spiralRadius: 5 + Math.random() * 10,
                    spiralSpeed: 2 + Math.random() * 3,
                    spiralPhase: Math.random() * Math.PI * 2
                }
            });
            
            this.particles.push(particle);
        }
        
        console.log(`⚡ プラズマトレイル生成: ${particleCount}個`);
    }
    
    /**
     * エネルギーバーストエフェクト生成
     */
    createEnergyBurst(x, y, energy, intensity = 1.0) {
        // ★ 修正：パーティクル数を制限してパフォーマンスを改善
        const baseParticleCount = Math.min(200, Math.max(20, Math.sqrt(energy) * 0.5));
        const particleCount = Math.floor(baseParticleCount * intensity * this.qualityLevel);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 50;
            
            const particle = new AdvancedParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1 + Math.random() * 2,
                size: 2 + Math.random() * 4,
                color: `hsl(${Math.random() * 60 + 0}, 100%, 70%)`, // 赤からオレンジ
                type: 'energy_burst',
                behaviorData: {
                    burstStrength: energy * 10,
                    initialSize: 2 + Math.random() * 4
                }
            });
            
            this.particles.push(particle);
        }
        
        // ★ 修正：パフォーマンス向上のためログを簡略化
        if (particleCount > 100) {
            console.log(`💥 エネルギーバースト生成: ${particleCount}個 (制限済み、元エネルギー: ${energy.toFixed(0)})`);
        }
    }
    
    /**
     * ワームホールエフェクト生成
     */
    createWormholeEffect(x, y, intensity = 1.0) {
        const particleCount = Math.floor(100 * intensity * this.qualityLevel);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100;
            
            const particle = new AdvancedParticle(
                x + Math.cos(angle) * distance,
                y + Math.sin(angle) * distance,
                {
                    life: 3 + Math.random() * 2,
                    size: 2 + Math.random() * 3,
                    color: `hsl(${280 + Math.random() * 80}, 70%, 60%)`,
                    type: 'wormhole',
                    maxTrailLength: 20,
                    behaviorData: {
                        targetX: x,
                        targetY: y,
                        suctionStrength: intensity * 100,
                        spiralSpeed: 2 + Math.random() * 3,
                        spiralAngle: 0,
                        maxDistance: distance
                    }
                }
            );
            
            this.particles.push(particle);
        }
        
        console.log(`🌀 ワームホールエフェクト生成: ${particleCount}個`);
    }
    
    /**
     * 重力レンズ光子エフェクト生成
     */
    createGravitationalLensingPhotons(x, y, mass, intensity = 1.0) {
        const particleCount = Math.floor(50 * intensity * this.qualityLevel);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 100;
            const speed = 80 + Math.random() * 40;
            
            // 光子の初期位置（ブラックホール周辺）
            const startX = x + Math.cos(angle) * distance;
            const startY = y + Math.sin(angle) * distance;
            
            // 光子の初期速度（ランダム方向）
            const velocityAngle = Math.random() * Math.PI * 2;
            
            const particle = new AdvancedParticle(startX, startY, {
                vx: Math.cos(velocityAngle) * speed,
                vy: Math.sin(velocityAngle) * speed,
                life: 3 + Math.random() * 2,
                size: 1 + Math.random(),
                color: '#ffffff',
                type: 'lensing_photon',
                maxTrailLength: 30,
                behaviorData: {
                    blackHoleX: x,
                    blackHoleY: y,
                    mass: mass,
                    initialDistance: distance
                }
            });
            
            this.particles.push(particle);
        }
        
        console.log(`💫 重力レンズ光子エフェクト生成: ${particleCount}個`);
    }
    
    /**
     * 時空の泡パーティクルの更新処理
     */
    updateSpacetimeBubble(deltaTime) {
        const data = this.behaviorData;
        const time = Date.now() * 0.001;
        
        // 泡の浮遊動作（水中の泡のように）
        data.wobblePhase = (data.wobblePhase || 0) + data.wobbleFrequency * deltaTime;
        const wobbleX = Math.sin(data.wobblePhase) * data.wobbleAmplitude * 0.1;
        const wobbleY = Math.cos(data.wobblePhase * 1.3) * data.wobbleAmplitude * 0.1;
        
        // 泡の上昇動作（緩やかな上昇）
        this.vy -= data.floatSpeed * deltaTime * 0.1;
        
        // 微細なランダム動作
        this.vx += wobbleX * deltaTime;
        this.vy += wobbleY * deltaTime;
        
        // 泡のサイズ変化（呼吸するような動き）
        data.expansionPhase += data.expansionSpeed * deltaTime;
        const sizeMultiplier = 1 + Math.sin(data.expansionPhase) * 0.3;
        this.size = data.bubbleRadius * sizeMultiplier;
        
        // 虹色効果（泡の色が微細に変化）
        if (data.iridescence > 0.5) {
            const colorShift = Math.sin(time * 3 + data.expansionPhase) * 20;
            const baseHue = 240 + colorShift;
            const saturation = 60 + Math.sin(time * 2) * 20;
            const lightness = 50 + Math.sin(time * 1.5) * 20;
            this.color = `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
        }
        
        // 泡が弾ける確率処理
        if (Math.random() < data.popProbability) {
            this.life = 0; // 泡が弾けた！
            
            // 弾けたときの小さな泡の破片を生成
            this.createBubbleFragments();
        }
        
        // ブラックホールから遠ざかると徐々に消失
        const distanceToBlackHole = Math.sqrt(
            (this.x - data.blackHoleX) ** 2 + (this.y - data.blackHoleY) ** 2
        );
        if (distanceToBlackHole > 300) {
            this.life -= deltaTime * 2; // 速い消失
        }
        
        // 透明度の調整
        this.opacity = Math.min(this.opacity, this.life / this.maxLife);
    }
    
    /**
     * 泡が弾けたときの破片生成
     */
    createBubbleFragments() {
        const fragmentCount = 3 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < fragmentCount; i++) {
            const angle = (i / fragmentCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 15 + Math.random() * 25;
            
            const fragment = new AdvancedParticle(
                this.x + (Math.random() - 0.5) * this.size,
                this.y + (Math.random() - 0.5) * this.size,
                {
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.5 + Math.random() * 1.0,
                    size: this.size * (0.1 + Math.random() * 0.3),
                    color: this.color,
                    opacity: this.opacity * 0.8,
                    type: 'bubble_fragment',
                    decay: 0.1 + Math.random() * 0.1
                }
            );
            
            // フラグメントをシステムに追加（グローバル参照が必要）
            if (window.particleSystem && window.particleSystem.advancedSystem) {
                window.particleSystem.advancedSystem.particles.push(fragment);
            }
        }
    }
    
    /**
     * パーティクルシステムの更新
     */
    update(deltaTime, forces = {}) {
        // グローバル力の更新
        this.globalForces = { ...this.globalForces, ...forces };
        
        // パーティクル更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime, this.globalForces);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
        
        // パーティクル数制限
        this.limitParticles();
    }
    
    /**
     * パーティクルシステムの描画
     */
    render(ctx) {
        ctx.save();
        
        // 描画順序の制御（透明度の高いものから先に描画）
        const sortedParticles = [...this.particles].sort((a, b) => a.opacity - b.opacity);
        
        sortedParticles.forEach(particle => {
            particle.draw(ctx);
        });
        
        ctx.restore();
    }
    
    /**
     * パーティクル数制限
     */
    limitParticles() {
        // ★ パフォーマンス最適化：積極的なパーティクル削減
        if (this.particles.length > this.maxParticles) {
            // 急速削減: ソートを省略して単純に先頭から削除
            const excessCount = this.particles.length - this.maxParticles;
            this.particles.splice(0, excessCount * 2); // バッファを作って頑繁な削減を防止
        }
        
        // ★ 定期的な全体クリーンアップ（メモリ管理）
        const now = Date.now();
        if (now - this.lastCleanup > 5000) { // 5秒ごと
            this.particles = this.particles.filter(p => p.life > 0.1);
            this.lastCleanup = now;
            if (this.particles.length > this.maxParticles * 0.8) {
                console.log('⚡ 緊急パーティクルクリーンアップ実行');
                this.particles.splice(0, Math.floor(this.particles.length * 0.3));
            }
        }
    }
    
    /**
     * 特定のエフェクトを生成
     */
    createEffect(type, ...args) {
        if (this.effectTypes[type]) {
            this.effectTypes[type](...args);
        } else {
            console.warn(`未知のエフェクトタイプ: ${type}`);
        }
    }
    
    /**
     * パーティクル数取得
     */
    getParticleCount() {
        return this.particles.length;
    }
    
    /**
     * 品質レベル設定
     */
    setQualityLevel(level) {
        this.qualityLevel = Math.max(0.1, Math.min(1.0, level));
        console.log(`🎨 パーティクル品質レベル: ${this.qualityLevel}`);
    }
    
    /**
     * 全パーティクルクリア
     */
    clear() {
        this.particles = [];
    }
}