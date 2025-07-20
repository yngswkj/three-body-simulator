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
            'wormhole': this.createWormholeEffect.bind(this)
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