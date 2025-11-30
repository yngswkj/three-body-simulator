'use strict';

/**
 * 宇宙背景システム - 動的で美しい星空、星雲、銀河を表現
 * GAME_ENHANCEMENT_PLAN.md Phase G1.1の実装
 */
export class CosmicBackground {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // アニメーション制御
        this.animationTime = 0;
        this.lastUpdate = Date.now();

        // 背景要素
        this.stars = [];
        this.nebulae = [];
        this.galaxies = [];
        this.comets = [];
        this.shootingStars = [];

        // パフォーマンス制御
        this.updateInterval = 1000 / 60; // 60FPS目標
        this.lastFrameTime = Date.now(); // 現在時刻で初期化
        this.qualityLevel = 1.0; // 0.1-1.0
        this.frameCount = 0; // フレーム数カウンタ

        // 初期化
        this.initialize();
    }

    initialize() {
        this.generateStarField();
        this.generateNebulae();
        this.generateDistantGalaxies();
        this.generateComets();
    }

    /**
     * 高品質な星空生成（きらめき効果付き）
     */
    generateStarField() {
        const baseCount = 1000; // 星の数を増やして密度を上げる
        const count = Math.floor(baseCount * this.qualityLevel);
        this.stars = [];

        for (let i = 0; i < count; i++) {
            const star = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 0.5,
                brightness: Math.random() * 0.9 + 0.1,

                // きらめき効果（非常に穏やか）
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.005 + Math.random() * 0.01,
                twinkleIntensity: Math.random() * 0.3 + 0.7,

                // 星の色（温度による色分け）
                color: this.getStarColor(),
                temperature: Math.random(),

                // 視差効果（奥行きに基づく）
                depth: Math.random(), // 0.0-1.0

                // 脈動効果（一部の星のみ、非常に穏やか）
                isPulsating: Math.random() < 0.02,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.002 + Math.random() * 0.005
            };

            // 奥行きに基づいてパラメータを調整（多層感の演出）
            // 手前の星（depth大）：速く動く、明るい、大きい
            // 奥の星（depth小）：遅く動く、暗い、小さい
            star.parallaxSpeed = (star.depth * 0.2) + 0.01;
            star.size = (Math.random() * 2 + 0.5) * (0.5 + star.depth * 0.5);
            star.brightness = (Math.random() * 0.5 + 0.5) * (0.3 + star.depth * 0.7);

            this.stars.push(star);
        }

        console.log(`🌟 動的星空生成完了: ${count}個の星 (品質: ${this.qualityLevel})`);
    }

    /**
     * 星の色を温度に基づいて決定
     */
    getStarColor() {
        const temp = Math.random();

        if (temp < 0.1) return '#ff4444'; // 赤色巨星
        if (temp < 0.3) return '#ffaa44'; // オレンジ星
        if (temp < 0.6) return '#ffff88'; // 黄色星（太陽型）
        if (temp < 0.8) return '#ffffff'; // 白色星
        if (temp < 0.95) return '#aaccff'; // 青白星
        return '#4488ff'; // 青色巨星
    }

    /**
     * 美しい星雲の生成
     */
    generateNebulae() {
        const count = Math.floor(2 * this.qualityLevel); // 5から2に削減
        this.nebulae = [];

        for (let i = 0; i < count; i++) {
            const nebula = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: 80 + Math.random() * 120, // サイズ削減

                // 色彩（天体写真風）
                color: this.getNebulaColor(),
                opacity: 0.1 + Math.random() * 0.15, // 透明度減少

                // 動的効果
                driftX: (Math.random() - 0.5) * 0.1, // 動きを軽量化
                driftY: (Math.random() - 0.5) * 0.1,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.001 + Math.random() * 0.002, // 脈動をさらに軽量化

                // 形状
                layers: 2 + Math.floor(Math.random() * 2), // レイヤー数削減
                asymmetry: Math.random() * 0.3 + 0.7, // 非対称性削減
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.001
            };

            this.nebulae.push(nebula);
        }

        console.log(`🌌 星雲生成完了: ${count}個`);
    }

    /**
     * 星雲の色彩パターン
     */
    getNebulaColor() {
        const colors = [
            '255, 107, 107', // 散光星雲（赤）
            '107, 196, 255', // 反射星雲（青）
            '255, 215, 0',   // 惑星状星雲（黄）
            '147, 112, 219', // 電離星雲（紫）
            '255, 165, 0',   // 星形成領域（オレンジ）
            '0, 255, 127'    // 酸素星雲（緑）
        ];

        return colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 遠方銀河の生成
     */
    generateDistantGalaxies() {
        const count = Math.floor(1 * this.qualityLevel); // 3から1に削減
        this.galaxies = [];

        for (let i = 0; i < count; i++) {
            const galaxy = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 30 + Math.random() * 80,

                // 銀河の種類
                type: Math.random() < 0.6 ? 'spiral' : 'elliptical',
                arms: 2 + Math.floor(Math.random() * 3), // 渦巻腕の数

                // 外観
                opacity: 0.1 + Math.random() * 0.2,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.0005,

                // 色彩（赤方偏移効果）
                redshift: Math.random() * 0.3,
                coreColor: '255, 255, 200',
                armColor: '100, 150, 255',

                // 動的効果
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.001 + Math.random() * 0.002
            };

            this.galaxies.push(galaxy);
        }

        console.log(`🌌 遠方銀河生成完了: ${count}個`);
    }

    /**
     * 彗星の生成
     */
    generateComets() {
        this.comets = [];
        // 彗星は動的に生成（低確率）
    }

    /**
     * 流れ星の動的生成
     */
    createShootingStar() {
        if (Math.random() > 0.0001) return; // 0.01%の確率に削減

        const side = Math.floor(Math.random() * 4);
        let startX, startY, endX, endY;

        // 画面端から流れる
        switch (side) {
            case 0: // 上から
                startX = Math.random() * this.canvas.width;
                startY = -50;
                endX = startX + (Math.random() - 0.5) * 400;
                endY = this.canvas.height + 50;
                break;
            case 1: // 右から
                startX = this.canvas.width + 50;
                startY = Math.random() * this.canvas.height;
                endX = -50;
                endY = startY + (Math.random() - 0.5) * 400;
                break;
            case 2: // 下から
                startX = Math.random() * this.canvas.width;
                startY = this.canvas.height + 50;
                endX = startX + (Math.random() - 0.5) * 400;
                endY = -50;
                break;
            case 3: // 左から
                startX = -50;
                startY = Math.random() * this.canvas.height;
                endX = this.canvas.width + 50;
                endY = startY + (Math.random() - 0.5) * 400;
                break;
        }

        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const duration = 2000 + Math.random() * 3000; // 2-5秒

        const shootingStar = {
            startX, startY, endX, endY,
            x: startX, y: startY,
            speed: distance / duration,
            direction: Math.atan2(endY - startY, endX - startX),
            life: 1.0,
            decay: 1.0 / duration,

            // 視覚効果
            size: 2 + Math.random() * 3,
            color: this.getStarColor(),
            trailLength: 30 + Math.random() * 50,
            trail: [],

            // 明るさ
            brightness: 0.8 + Math.random() * 0.2
        };

        this.shootingStars.push(shootingStar);
        console.log('⭐ 流れ星出現！');
    }

    /**
     * 品質レベルの動的調整
     */
    adjustQuality(targetFps = 60) {
        this.frameCount++;

        // 初期30フレームは品質調整をスキップ（安定化期間）
        if (this.frameCount < 30) {
            this.lastFrameTime = Date.now();
            return;
        }

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;

        // 異常な deltaTime をスキップ
        if (deltaTime < 5 || deltaTime > 100) {
            this.lastFrameTime = currentTime;
            return;
        }

        const currentFps = 1000 / deltaTime;

        // 60フレームに1回のみ品質調整（緩やかな調整とログ頻度削減）
        if (this.frameCount % 60 === 0) {
            if (currentFps < targetFps * 0.7) {
                // FPS低下時は品質を下げる（より緩やか）
                this.qualityLevel = Math.max(0.3, this.qualityLevel - 0.05);
                console.log(`🎨 背景品質調整: ${this.qualityLevel.toFixed(1)} (FPS: ${currentFps.toFixed(1)})`);
            } else if (currentFps > targetFps * 1.2 && this.qualityLevel < 1.0) {
                // FPS余裕時は品質を上げる（より緩やか）
                this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.02);
            }
        }

        this.lastFrameTime = currentTime;
    }

    /**
     * メインの更新処理
     */
    update(deltaTime) {
        this.animationTime += deltaTime;

        // 品質調整は毎フレーム実行（正確なFPS測定のため）
        this.adjustQuality();

        // 更新頻度を間引く（3フレームに1回更新）
        if (this.animationTime % 48 < deltaTime) { // 約20FPSで更新
            // 流れ星の動的生成
            this.createShootingStar();

            // 各要素の更新
            this.updateStars(deltaTime * 3); // 更新間隔を調整
            this.updateNebulae(deltaTime * 3);
            this.updateGalaxies(deltaTime * 3);
        }

        // 流れ星のみ毎フレーム更新（スムーズな動きのため）
        this.updateShootingStars(deltaTime);
    }

    /**
     * 星のアニメーション更新
     */
    updateStars(deltaTime) {
        this.stars.forEach(star => {
            // きらめき効果
            star.twinklePhase += star.twinkleSpeed;

            // 脈動効果（一部の星）
            if (star.isPulsating) {
                star.pulsePhase += star.pulseSpeed;
            }

            // 視差効果（微妙な移動）
            star.x += star.parallaxSpeed * deltaTime * 0.001;
            if (star.x > this.canvas.width + 10) {
                star.x = -10;
            }
        });
    }

    /**
     * 星雲のアニメーション更新
     */
    updateNebulae(deltaTime) {
        this.nebulae.forEach(nebula => {
            // ゆっくりとした漂流
            nebula.x += nebula.driftX * deltaTime * 0.001;
            nebula.y += nebula.driftY * deltaTime * 0.001;

            // 脈動
            nebula.pulsePhase += nebula.pulseSpeed;

            // 回転
            nebula.rotation += nebula.rotationSpeed;

            // 境界処理
            if (nebula.x < -nebula.radius) nebula.x = this.canvas.width + nebula.radius;
            if (nebula.x > this.canvas.width + nebula.radius) nebula.x = -nebula.radius;
            if (nebula.y < -nebula.radius) nebula.y = this.canvas.height + nebula.radius;
            if (nebula.y > this.canvas.height + nebula.radius) nebula.y = -nebula.radius;
        });
    }

    /**
     * 銀河のアニメーション更新
     */
    updateGalaxies(deltaTime) {
        this.galaxies.forEach(galaxy => {
            galaxy.rotation += galaxy.rotationSpeed;
            galaxy.twinklePhase += galaxy.twinkleSpeed;
        });
    }

    /**
     * 流れ星のアニメーション更新
     */
    updateShootingStars(deltaTime) {
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const star = this.shootingStars[i];

            // 移動
            star.x += Math.cos(star.direction) * star.speed * deltaTime;
            star.y += Math.sin(star.direction) * star.speed * deltaTime;

            // 軌跡記録
            star.trail.push({ x: star.x, y: star.y });
            if (star.trail.length > star.trailLength) {
                star.trail.shift();
            }

            // 生命減少
            star.life -= star.decay * deltaTime;

            // 削除判定
            if (star.life <= 0) {
                this.shootingStars.splice(i, 1);
            }
        }
    }

    /**
     * メインの描画処理
     */
    render() {
        this.ctx.save();

        // 背景グラデーション（毎フレーム描画してチカチカを防止）
        this.renderBackground();

        // 各要素の描画（奥から手前の順）
        // 品質レベルに応じて描画を調整
        if (this.qualityLevel > 0.3) {
            this.renderGalaxies();
        }
        if (this.qualityLevel > 0.5) {
            this.renderNebulae();
        }
        this.renderStars();
        this.renderShootingStars();

        this.ctx.restore();
    }

    /**
     * 背景グラデーションの描画
     */
    renderBackground() {
        // ★ 修正：背景描画時は source-over を強制し、完全に不透明な色で塗りつぶす
        this.ctx.globalCompositeOperation = 'source-over';

        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2,
            Math.max(this.canvas.width, this.canvas.height)
        );

        // 時間による色変化（非常に遅い変化でちらつき防止）
        const timeVar = Math.sin(this.animationTime * 0.00001) * 0.05;

        // ★ 修正：アルファ値を1.0（完全不透明）にして、前のフレームを確実に消去する
        gradient.addColorStop(0, `rgb(${Math.floor(20 + timeVar * 10)}, ${Math.floor(20 + timeVar * 15)}, ${Math.floor(45 + timeVar * 20)})`);
        gradient.addColorStop(0.5, `rgb(${Math.floor(15 + timeVar * 8)}, ${Math.floor(15 + timeVar * 12)}, ${Math.floor(35 + timeVar * 15)})`);
        gradient.addColorStop(1, `rgb(${Math.floor(10 + timeVar * 5)}, ${Math.floor(10 + timeVar * 8)}, ${Math.floor(25 + timeVar * 10)})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    /**
     * 星の描画
     */
    renderStars() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter'; // 加算合成で星を輝かせる

        this.stars.forEach(star => {
            // きらめき計算
            const twinkle = Math.sin(star.twinklePhase) * star.twinkleIntensity;
            const opacity = Math.min(1.0, star.brightness * (0.8 + 0.4 * twinkle)); // 明るさを強調

            // 脈動計算（一部の星のみ）
            let sizeMultiplier = 1.0;
            if (star.isPulsating) {
                sizeMultiplier = 1.0 + Math.sin(star.pulsePhase) * 0.3;
            }

            const finalSize = star.size * sizeMultiplier * star.depth;

            this.ctx.save();
            this.ctx.globalAlpha = opacity * star.depth;
            this.ctx.fillStyle = star.color;

            // 星本体
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, finalSize, 0, Math.PI * 2);
            this.ctx.fill();

            // 明るい星にはグロー効果
            if (star.size > 2) {
                this.ctx.globalAlpha = opacity * 0.3 * star.depth;
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, finalSize * 3, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 非常に明るい星には十字の光条
            if (star.size > 2.5 && star.brightness > 0.8) {
                this.renderStarSpikes(star, finalSize, opacity);
            }

            this.ctx.restore();
        });

        this.ctx.restore();
    }

    /**
     * 星の光条描画
     */
    renderStarSpikes(star, size, opacity) {
        const spikeLength = size * 8;
        const spikeWidth = size * 0.3;

        this.ctx.globalAlpha = opacity * 0.4;
        this.ctx.strokeStyle = star.color;
        this.ctx.lineWidth = spikeWidth;
        this.ctx.lineCap = 'round';

        // 縦の光条
        this.ctx.beginPath();
        this.ctx.moveTo(star.x, star.y - spikeLength);
        this.ctx.lineTo(star.x, star.y + spikeLength);
        this.ctx.stroke();

        // 横の光条
        this.ctx.beginPath();
        this.ctx.moveTo(star.x - spikeLength, star.y);
        this.ctx.lineTo(star.x + spikeLength, star.y);
        this.ctx.stroke();
    }

    /**
     * 星雲の描画
     */
    renderNebulae() {
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter'; // 加算合成で星雲を幻想的に

        this.nebulae.forEach(nebula => {
            this.ctx.save();
            this.ctx.translate(nebula.x, nebula.y);
            this.ctx.rotate(nebula.rotation);

            // 脈動効果
            const pulse = 1.0 + Math.sin(nebula.pulsePhase) * 0.2;
            const currentRadius = nebula.radius * pulse;

            // 多層描画
            for (let layer = 0; layer < nebula.layers; layer++) {
                const layerRadius = currentRadius * (1 - layer * 0.2);
                const layerOpacity = nebula.opacity * (1 - layer * 0.3);

                const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);
                gradient.addColorStop(0, `rgba(${nebula.color}, ${layerOpacity})`);
                gradient.addColorStop(0.3, `rgba(${nebula.color}, ${layerOpacity * 0.7})`);
                gradient.addColorStop(0.7, `rgba(${nebula.color}, ${layerOpacity * 0.3})`);
                gradient.addColorStop(1, 'transparent');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, layerRadius * nebula.asymmetry, layerRadius, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });

        this.ctx.restore();
    }

    /**
     * 銀河の描画
     */
    renderGalaxies() {
        this.galaxies.forEach(galaxy => {
            this.ctx.save();
            this.ctx.translate(galaxy.x, galaxy.y);
            this.ctx.rotate(galaxy.rotation);

            // きらめき効果
            const twinkle = 1.0 + Math.sin(galaxy.twinklePhase) * 0.1;
            const currentOpacity = galaxy.opacity * twinkle;

            if (galaxy.type === 'spiral') {
                this.renderSpiralGalaxy(galaxy, currentOpacity);
            } else {
                this.renderEllipticalGalaxy(galaxy, currentOpacity);
            }

            this.ctx.restore();
        });
    }

    /**
     * 渦巻銀河の描画
     */
    renderSpiralGalaxy(galaxy, opacity) {
        // 中心核
        const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.size * 0.3);
        coreGradient.addColorStop(0, `rgba(${galaxy.coreColor}, ${opacity})`);
        coreGradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, galaxy.size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // 渦巻腕
        for (let arm = 0; arm < galaxy.arms; arm++) {
            const armAngle = (Math.PI * 2 * arm) / galaxy.arms;
            this.renderSpiralArm(galaxy, armAngle, opacity * 0.6);
        }
    }

    /**
     * 渦巻腕の描画
     */
    renderSpiralArm(galaxy, startAngle, opacity) {
        this.ctx.strokeStyle = `rgba(${galaxy.armColor}, ${opacity})`;
        this.ctx.lineWidth = galaxy.size * 0.02;
        this.ctx.lineCap = 'round';

        this.ctx.beginPath();

        for (let t = 0; t < Math.PI * 4; t += 0.1) {
            const r = (galaxy.size * 0.3) + t * (galaxy.size * 0.1);
            const angle = startAngle + t;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            if (t === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    /**
     * 楕円銀河の描画
     */
    renderEllipticalGalaxy(galaxy, opacity) {
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, galaxy.size);
        gradient.addColorStop(0, `rgba(${galaxy.coreColor}, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(${galaxy.coreColor}, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, galaxy.size, galaxy.size * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 流れ星の描画
     */
    renderShootingStars() {
        this.shootingStars.forEach(star => {
            if (star.trail.length < 2) return;

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';

            // 軌跡の描画
            for (let i = 1; i < star.trail.length; i++) {
                const progress = i / star.trail.length;
                const alpha = progress * star.life * star.brightness;
                const width = (1 - progress) * star.size + 0.5;

                this.ctx.strokeStyle = star.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
                this.ctx.lineWidth = width;
                this.ctx.lineCap = 'round';

                this.ctx.beginPath();
                this.ctx.moveTo(star.trail[i - 1].x, star.trail[i - 1].y);
                this.ctx.lineTo(star.trail[i].x, star.trail[i].y);
                this.ctx.stroke();
            }

            // 流れ星本体（最も明るい）
            if (star.trail.length > 0) {
                const head = star.trail[star.trail.length - 1];
                this.ctx.fillStyle = star.color.replace(')', `, ${star.life * star.brightness})`).replace('rgb', 'rgba');
                this.ctx.beginPath();
                this.ctx.arc(head.x, head.y, star.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        });
    }

    /**
     * リサイズ対応
     */
    handleResize(newWidth, newHeight) {
        // 既存要素の位置を相対的に調整
        const scaleX = newWidth / this.canvas.width;
        const scaleY = newHeight / this.canvas.height;

        this.stars.forEach(star => {
            star.x *= scaleX;
            star.y *= scaleY;
        });

        this.nebulae.forEach(nebula => {
            nebula.x *= scaleX;
            nebula.y *= scaleY;
        });

        this.galaxies.forEach(galaxy => {
            galaxy.x *= scaleX;
            galaxy.y *= scaleY;
        });

        // キャンバスサイズ更新
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;

        console.log(`🎨 背景システムリサイズ: ${newWidth}x${newHeight}`);
    }
}