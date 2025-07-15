'use strict';

/**
 * パーティクルクラス
 */
export class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = Math.random() * 3 + 1;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.life * 0.6;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

/**
 * パーティクルシステム管理クラス
 */
export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    /**
     * パーティクル追加
     */
    addParticle(particle) {
        this.particles.push(particle);
    }

    /**
     * 衝突エフェクトの生成
     */
    createCollisionEffect(x, y, color1, color2) {
        // 多数のパーティクルを生成
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 3 + Math.random() * 4;
            const px = x + Math.cos(angle) * 10;
            const py = y + Math.sin(angle) * 10;

            const effectColor = Math.random() < 0.5 ? color1 : color2;

            const particle = new Particle(px, py, effectColor);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1.5;
            particle.size = 2 + Math.random() * 3;
            this.addParticle(particle);
        }

        // 中心部の明るいフラッシュ
        for (let i = 0; i < 5; i++) {
            const particle = new Particle(x, y, '#ffffff');
            particle.vx = (Math.random() - 0.5) * 2;
            particle.vy = (Math.random() - 0.5) * 2;
            particle.life = 1.0;
            particle.size = 4 + Math.random() * 2;
            this.addParticle(particle);
        }
    }

    /**
     * パーティクル更新・描画
     */
    update(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            this.particles[i].draw(ctx);
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * パーティクル数制限
     */
    limitParticles(maxCount) {
        if (this.particles.length > maxCount) {
            this.particles.splice(0, this.particles.length - maxCount);
        }
    }

    /**
     * パーティクル数取得
     */
    getParticleCount() {
        return this.particles.length;
    }

    /**
     * 全パーティクルクリア
     */
    clear() {
        this.particles = [];
    }
    
    /**
     * 全パーティクルクリア（別名メソッド）
     */
    clearAll() {
        this.clear();
    }
}
