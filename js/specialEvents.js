'use strict';

/**
 * 特殊イベントシステム
 * 極稀に発生する美しい天体現象をシミュレート
 */

class SpecialEventsManager {
    constructor() {
        this.events = [];
        this.lastEventTime = 0;
        this.eventCooldown = 30; // 最低30秒のクールダウン
        this.baseEventChance = 0.0001; // 基本発生率（フレームあたり）
        this.activeEvents = new Map();

        // ★ 追加：内部時計管理
        this.internalTime = 0;
        this.lastUpdateTime = Date.now() * 0.001;

        // イベント履歴
        this.eventHistory = [];
        this.maxHistoryLength = 10;

        // イベント統計
        this.eventStats = {
            totalEvents: 0,
            eventTypes: {},
            rareEvents: 0,
            legendaryEvents: 0
        };
    }

    /**
     * フレームごとのイベントチェック
     */
    update(bodies, simulationTime, ctx, canvas) {
        // ★ 修正：内部時計を更新
        const currentRealTime = Date.now() * 0.001;
        const deltaTime = currentRealTime - this.lastUpdateTime;
        this.internalTime += deltaTime;
        this.lastUpdateTime = currentRealTime;

        // ★ 修正：内部時計を使用してクールダウンチェック
        if (this.internalTime - this.lastEventTime < this.eventCooldown) {
            this.updateActiveEvents(ctx, bodies);
            return;
        }

        // イベント発生チェック（シミュレーション時間を使用）
        const eventChance = this.calculateEventChance(bodies, simulationTime);
        if (Math.random() < eventChance) {
            this.triggerRandomEvent(bodies, simulationTime, ctx, canvas);
        }

        // アクティブイベントの更新
        this.updateActiveEvents(ctx, bodies);
    }

    /**
     * イベント発生確率の計算
     */
    calculateEventChance(bodies, time) {
        let chance = this.baseEventChance;

        // 天体数による補正
        const bodyCount = bodies.filter(b => b.isValid).length;
        if (bodyCount >= 4) chance *= 2;
        if (bodyCount >= 6) chance *= 1.5;

        // ブラックホールの存在
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        if (blackHoles.length > 0) chance *= 3;

        // 特殊配置の検出
        if (this.detectSpecialAlignment(bodies)) chance *= 5;
        if (this.detectBinarySystem(bodies)) chance *= 2;
        if (this.detectCloseEncounter(bodies)) chance *= 4;

        // 時間による補正（長時間実行で確率上昇）
        if (time > 120) chance *= 1.5; // 2分後
        if (time > 300) chance *= 2;   // 5分後

        return Math.min(chance, 0.01); // 最大1%/フレーム
    }

    /**
     * ランダムイベントの発生
     */
    triggerRandomEvent(bodies, simulationTime, ctx, canvas) {
        const availableEvents = this.getAvailableEvents(bodies);
        if (availableEvents.length === 0) return;

        // レア度による重み付け選択
        const weightedEvents = [];
        availableEvents.forEach(event => {
            const weight = event.rarity === 'common' ? 100 :
                event.rarity === 'rare' ? 20 :
                    event.rarity === 'legendary' ? 2 : 50;
            for (let i = 0; i < weight; i++) {
                weightedEvents.push(event);
            }
        });

        const selectedEvent = weightedEvents[Math.floor(Math.random() * weightedEvents.length)];
        this.executeEvent(selectedEvent, bodies, simulationTime, ctx, canvas); // ★ 修正：simulationTimeを渡す
    }

    /**
     * 利用可能なイベントの取得
     */
    getAvailableEvents(bodies) {
        const events = [];

        // 基本イベント
        events.push({
            name: 'cosmicStorm',
            rarity: 'common',
            duration: 25, // ★ 修正：8秒から25秒に延長
            condition: () => true
        });

        events.push({
            name: 'solarFlare',
            rarity: 'uncommon',
            duration: 12,
            condition: () => bodies.some(b => b.type === 'star')
        });

        // レアイベント
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        if (blackHoles.length > 0) {
            events.push({
                name: 'hawkingRadiation',
                rarity: 'rare',
                duration: 15,
                condition: () => true
            });

            events.push({
                name: 'gravitationalLensing',
                rarity: 'rare',
                duration: 20,
                condition: () => bodies.length >= 3
            });
        }

        // 伝説級イベント
        if (this.detectSpecialAlignment(bodies)) {
            events.push({
                name: 'perfectAlignment',
                rarity: 'legendary',
                duration: 25,
                condition: () => true
            });
        }

        if (blackHoles.length >= 2) {
            events.push({
                name: 'blackHoleMerger',
                rarity: 'legendary',
                duration: 30,
                condition: () => true
            });
        }

        if (this.detectStableOrbit(bodies)) {
            events.push({
                name: 'resonanceHarmony',
                rarity: 'legendary',
                duration: 40,
                condition: () => true
            });
        }

        return events.filter(event => event.condition());
    }

    /**
     * イベントの実行
     */
    executeEvent(eventData, bodies, simulationTime, ctx, canvas) { // ★ 修正：simulationTimeを受け取る
        const event = {
            ...eventData,
            id: Date.now() + Math.random(),
            startTime: this.internalTime, // ★ 修正：内部時計を使用
            endTime: this.internalTime + eventData.duration, // ★ 修正：内部時計ベースで終了時間設定
            realStartTime: Date.now() * 0.001, // ★ 追加：デバッグ用リアル開始時間
            progress: 0,
            intensity: 1
        };

        this.activeEvents.set(event.id, event);
        this.lastEventTime = this.internalTime; // ★ 修正：内部時計を使用

        // 統計更新
        this.updateEventStats(event.name);
        this.addToHistory(event);

        // イベント開始効果
        this.startEventEffect(event, bodies, ctx, canvas);

        // 頻度を制限したログ出力
        if (event.rarity === 'legendary' || Math.random() < 0.3) {
            console.log(`🌟 特殊イベント発生: ${this.getEventDisplayName(event.name)} (${event.rarity}) - 継続時間: ${eventData.duration}秒`);
        }
    }

    /**
     * アクティブイベントの更新
     */
    updateActiveEvents(ctx, bodies) {
        for (const [id, event] of this.activeEvents) {
            // ★ 修正：内部時計を使用してprogress計算
            const elapsedTime = this.internalTime - event.startTime;
            event.progress = Math.min(1, elapsedTime / event.duration);

            // イベント効果の描画
            this.renderEventEffect(event, ctx, bodies);

            // ★ 修正：イベント終了チェックも内部時計ベース
            if (this.internalTime >= event.endTime) {
                // 終了ログを制限（伝説級イベントまたは確率で出力）
                if (event.rarity === 'legendary' || Math.random() < 0.2) {
                    const totalDuration = this.internalTime - event.startTime;
                    console.log(`🌙 ${this.getEventDisplayName(event.name)} 終了 - 経過時間: ${totalDuration.toFixed(1)}秒`);
                }
                this.endEvent(event, bodies);
                this.activeEvents.delete(id);
            }
        }
    }

    /**
     * イベント開始時の効果
     */
    startEventEffect(event, bodies, ctx, canvas) {
        const { name } = event;
        
        switch (name) {
            case 'cosmicStorm':
                // 全天体に軽微な擾乱を与える
                bodies.forEach(body => {
                    if (body.isValid) {
                        body.vx += (Math.random() - 0.5) * 0.5;
                        body.vy += (Math.random() - 0.5) * 0.5;
                    }
                });
                break;
                
            case 'perfectAlignment':
                // 天体を一直線に整列
                const validBodies = bodies.filter(body => body.isValid);
                if (validBodies.length >= 3) {
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    const spacing = 150;
                    
                    validBodies.forEach((body, index) => {
                        const targetX = centerX + (index - (validBodies.length - 1) / 2) * spacing;
                        const targetY = centerY;
                        
                        // 滑らかに移動するための速度調整
                        body.vx += (targetX - body.x) * 0.001;
                        body.vy += (targetY - body.y) * 0.001;
                    });
                }
                break;
                
            case 'resonanceHarmony':
                // 軌道の安定化
                bodies.forEach(body => {
                    if (body.isValid) {
                        body.vx *= 0.95;
                        body.vy *= 0.95;
                    }
                });
                break;
                
            case 'quantumFluctuation':
                // 微細な位置揺らぎ
                bodies.forEach(body => {
                    if (body.isValid) {
                        body.x += (Math.random() - 0.5) * 0.1;
                        body.y += (Math.random() - 0.5) * 0.1;
                    }
                });
                break;
        }
    }

    /**
     * イベント終了時の処理
     */
    endEvent(event, bodies) {
        // 必要に応じて終了時の処理を追加
        switch (event.name) {
            case 'cosmicStorm':
                // 特に何もしない
                break;
            case 'perfectAlignment':
                // 整列状態を少し崩す
                const validBodies = bodies.filter(body => body.isValid);
                validBodies.forEach(body => {
                    body.vx += (Math.random() - 0.5) * 0.1;
                    body.vy += (Math.random() - 0.5) * 0.1;
                });
                break;
        }
    }

    /**
     * イベント効果の描画
     */
    renderEventEffect(event, ctx, bodies) {
        const { name, progress, intensity } = event;

        switch (name) {
            case 'cosmicStorm':
                this.renderCosmicStorm(ctx, progress, intensity);
                break;
            case 'solarFlare':
                this.renderSolarFlare(ctx, bodies, progress, intensity);
                break;
            case 'hawkingRadiation':
                this.renderHawkingRadiation(ctx, bodies, progress, intensity);
                break;
            case 'gravitationalLensing':
                this.renderGravitationalLensing(ctx, bodies, progress, intensity);
                break;
            case 'perfectAlignment':
                this.renderPerfectAlignment(ctx, bodies, progress, intensity);
                break;
            case 'blackHoleMerger':
                this.renderBlackHoleMerger(ctx, bodies, progress, intensity);
                break;
            case 'resonanceHarmony':
                this.renderResonanceHarmony(ctx, bodies, progress, intensity);
                break;
        }
    }

    /**
     * 宇宙嵐の描画
     */
    renderCosmicStorm(ctx, progress, intensity) {
        const time = Date.now() * 0.001;
        const fadeIn = Math.min(1, progress * 2); // ★ 修正：フェードインを緩やかに
        const fadeOut = progress > 0.85 ? (1 - progress) * 6.67 : 1; // ★ 修正：フェードアウトタイミング調整
        const alpha = fadeIn * fadeOut * intensity * 0.4; // ★ 修正：基本透明度を少し上げる

        // 背景オーロラ効果（より多くのパーティクル）
        for (let i = 0; i < 80; i++) { // ★ 修正：50から80に増加
            const x = (Math.sin(time * 0.4 + i) * 0.5 + 0.5) * ctx.canvas.width; // ★ 修正：動きを緩やかに
            const y = (Math.sin(time * 0.25 + i * 0.1) * 0.5 + 0.5) * ctx.canvas.height; // ★ 修正：動きを緩やかに
            const size = 25 + Math.sin(time * 1.5 + i) * 15; // ★ 修正：サイズを大きく、動きを緩やかに

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            gradient.addColorStop(0, `rgba(0, 255, 150, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(100, 150, 255, ${alpha * 0.6})`); // ★ 修正：中間透明度を調整
            gradient.addColorStop(1, `rgba(255, 100, 200, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // ★ 追加：追加の大きなオーロラ層
        for (let i = 0; i < 20; i++) {
            const x = (Math.sin(time * 0.2 + i * 0.5) * 0.7 + 0.5) * ctx.canvas.width;
            const y = (Math.sin(time * 0.15 + i * 0.3) * 0.7 + 0.5) * ctx.canvas.height;
            const size = 40 + Math.sin(time * 0.8 + i) * 20;

            const bigGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            bigGradient.addColorStop(0, `rgba(255, 200, 0, ${alpha * 0.3})`);
            bigGradient.addColorStop(0.4, `rgba(200, 100, 255, ${alpha * 0.4})`);
            bigGradient.addColorStop(0.8, `rgba(0, 200, 255, ${alpha * 0.2})`);
            bigGradient.addColorStop(1, `rgba(255, 150, 100, 0)`);

            ctx.fillStyle = bigGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // 稲妻効果（頻度を調整）
        if (Math.sin(time * 8) > 0.6) { // ★ 修正：頻度を少し下げる
            this.renderLightning(ctx, alpha * 2.5); // ★ 修正：稲妻の強度を上げる
        }

        // ★ 追加：宇宙嵐の渦巻き効果
        if (progress > 0.3) { // 嵐が本格化してから渦巻きを表示
            this.renderStormVortex(ctx, progress, alpha, time);
        }
    }

    // ★ 追加：宇宙嵐の渦巻き効果
    renderStormVortex(ctx, progress, alpha, time) {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;
        const vortexIntensity = (progress - 0.3) / 0.7; // 0.3以降で徐々に強化

        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = 100 + layer * 80;
            const spiralTightness = 2 + layer * 0.5;
            const rotationSpeed = 0.5 + layer * 0.2;

            for (let i = 0; i < 60; i++) {
                const angle = (i / 60) * Math.PI * 2 * spiralTightness + time * rotationSpeed;
                const radius = layerRadius * (0.8 + 0.4 * (i / 60)) * vortexIntensity;

                const x = centerX + radius * Math.cos(angle) * (0.8 + 0.2 * Math.sin(time * 2 + i));
                const y = centerY + radius * Math.sin(angle) * (0.8 + 0.2 * Math.cos(time * 2 + i));

                const particleSize = 3 + layer + Math.sin(time * 4 + i) * 2;
                const particleAlpha = alpha * vortexIntensity * (0.5 + 0.5 * Math.sin(time * 3 + i));

                const hue = (layer * 120 + i * 6 + time * 50) % 360;
                ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${particleAlpha})`;
                ctx.beginPath();
                ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * 太陽フレアの描画
     */
    renderSolarFlare(ctx, bodies, progress, intensity) {
        const stars = bodies.filter(b => b.type === 'star' && b.isValid);
        if (stars.length === 0) return;

        const time = Date.now() * 0.001;
        const pulseIntensity = 0.5 + 0.5 * Math.sin(time * 4);

        stars.forEach(star => {
            const flareRadius = Math.sqrt(Math.abs(star.mass || 30)) * 3 * (1 + progress * 2) * pulseIntensity;

            // フレア本体
            const flareGradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, flareRadius
            );
            flareGradient.addColorStop(0, `rgba(255, 200, 100, ${intensity * 0.8})`);
            flareGradient.addColorStop(0.3, `rgba(255, 150, 50, ${intensity * 0.6})`);
            flareGradient.addColorStop(0.7, `rgba(255, 100, 0, ${intensity * 0.3})`);
            flareGradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

            ctx.fillStyle = flareGradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, flareRadius, 0, Math.PI * 2);
            ctx.fill();

            // プロミネンス（噴出）
            this.renderProminences(ctx, star, progress, intensity);
        });
    }

    /**
     * ホーキング輻射の描画
     */
    renderHawkingRadiation(ctx, bodies, progress, intensity) {
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);

        blackHoles.forEach(bh => {
            const time = Date.now() * 0.001;
            const radiationRadius = Math.sqrt(Math.abs(bh.mass || 30)) * 4 * (1 + progress);

            // 量子泡効果
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2 + time * 2;
                const r = radiationRadius * (0.8 + 0.4 * Math.sin(time * 3 + i));
                const x = bh.x + r * Math.cos(angle);
                const y = bh.y + r * Math.sin(angle);

                const particleSize = Math.max(1, 2 + Math.sin(time * 5 + i) * 1);
                const alpha = intensity * 0.6 * (0.5 + 0.5 * Math.sin(time * 4 + i));

                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // エネルギーリング
            ctx.strokeStyle = `rgba(100, 200, 255, ${intensity * 0.4})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, radiationRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }

    /**
     * 完璧な整列の描画
     */
    renderPerfectAlignment(ctx, bodies, progress, intensity) {
        const time = Date.now() * 0.001;
        const validBodies = bodies.filter(b => b.isValid);

        // 整列ライン
        if (validBodies.length >= 3) {
            const centerX = ctx.canvas.width / 2;
            const centerY = ctx.canvas.height / 2;

            // 虹色の整列エフェクト
            for (let i = 0; i < 7; i++) {
                const hue = (i * 60 + time * 30) % 360;
                const alpha = intensity * 0.3 * (0.5 + 0.5 * Math.sin(time * 2 + i));

                ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
                ctx.lineWidth = 8 - i;
                ctx.setLineDash([10, 5]);

                ctx.beginPath();
                ctx.moveTo(0, centerY + i * 3);
                ctx.lineTo(ctx.canvas.width, centerY + i * 3);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // 天体間の共鳴線
        validBodies.forEach((body, i) => {
            validBodies.slice(i + 1).forEach(otherBody => {
                const alpha = intensity * 0.2 * (0.5 + 0.5 * Math.sin(time * 3));

                const gradient = ctx.createLinearGradient(
                    body.x, body.y,
                    otherBody.x, otherBody.y
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(100, 200, 255, ${alpha * 1.5})`);
                gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(body.x, body.y);
                ctx.lineTo(otherBody.x, otherBody.y);
                ctx.stroke();
            });
        });
    }

    /**
     * ブラックホール合体の描画
     */
    renderBlackHoleMerger(ctx, bodies, progress, intensity) {
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        if (blackHoles.length < 2) return;

        const time = Date.now() * 0.001;

        // 重力波リップル
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;

        for (let i = 0; i < 5; i++) {
            const waveRadius = 50 + i * 80 + progress * 200;
            const alpha = intensity * 0.4 * (1 - progress) * (1 - i * 0.15);

            ctx.strokeStyle = `rgba(255, 100, 255, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 12]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // 時空歪み効果
        blackHoles.forEach(bh => {
            const distortionRadius = Math.sqrt(Math.abs(bh.mass || 30)) * 6 * intensity;

            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + time * 0.5;
                const r = distortionRadius * (0.8 + 0.4 * Math.sin(time * 2 + i));
                const x = bh.x + r * Math.cos(angle);
                const y = bh.y + r * Math.sin(angle);

                const spiralGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
                spiralGradient.addColorStop(0, `rgba(200, 100, 255, ${intensity * 0.6})`);
                spiralGradient.addColorStop(1, `rgba(100, 50, 200, 0)`);

                ctx.fillStyle = spiralGradient;
                ctx.beginPath();
                ctx.arc(x, y, 15, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    /**
     * ★ 追加：統計のリセット
     */
    resetStats() {
        this.eventStats = {
            totalEvents: 0,
            eventTypes: {},
            rareEvents: 0,
            legendaryEvents: 0
        };
        this.eventHistory = [];
        this.activeEvents.clear();
        this.lastEventTime = 0;

        // ★ 追加：内部時計もリセット
        this.internalTime = 0;
        this.lastUpdateTime = Date.now() * 0.001;

        // 特殊イベント統計をリセットしました（内部時計もリセット）
    }

    // ヘルパーメソッド
    detectSpecialAlignment(bodies) {
        const validBodies = bodies.filter(b => b.isValid);
        if (validBodies.length < 3) return false;

        // 3つ以上の天体が直線上に並んでいるかチェック
        for (let i = 0; i < validBodies.length - 2; i++) {
            for (let j = i + 1; j < validBodies.length - 1; j++) {
                for (let k = j + 1; k < validBodies.length; k++) {
                    if (this.areCollinear(validBodies[i], validBodies[j], validBodies[k], 30)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    areCollinear(a, b, c, threshold = 30) {
        const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y));
        return area < threshold;
    }

    detectBinarySystem(bodies) {
        const validBodies = bodies.filter(b => b.isValid);
        for (let i = 0; i < validBodies.length - 1; i++) {
            for (let j = i + 1; j < validBodies.length; j++) {
                const distance = Math.sqrt(
                    (validBodies[i].x - validBodies[j].x) ** 2 +
                    (validBodies[i].y - validBodies[j].y) ** 2
                );
                if (distance < 100 && distance > 30) {
                    return true;
                }
            }
        }
        return false;
    }

    detectCloseEncounter(bodies) {
        const validBodies = bodies.filter(b => b.isValid);
        for (let i = 0; i < validBodies.length - 1; i++) {
            for (let j = i + 1; j < validBodies.length; j++) {
                const distance = Math.sqrt(
                    (validBodies[i].x - validBodies[j].x) ** 2 +
                    (validBodies[i].y - validBodies[j].y) ** 2
                );
                if (distance < 50) {
                    return true;
                }
            }
        }
        return false;
    }

    detectStableOrbit(bodies) {
        // 簡略化：軌跡の安定性をチェック
        return bodies.some(body =>
            body.trail && body.trail.length > 50 &&
            this.isOrbitStable(body.trail)
        );
    }

    isOrbitStable(trail) {
        if (trail.length < 20) return false;

        const recent = trail.slice(-20);
        const centerX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length;
        const centerY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length;

        const distances = recent.map(p =>
            Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
        );

        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + (d - avgDistance) ** 2, 0) / distances.length;

        return variance < avgDistance * 0.1; // 分散が平均距離の10%未満なら安定
    }

    /**
     * イベント名の表示用変換
     */
    getEventDisplayName(eventName) {
        const displayNames = {
            'cosmicStorm': '宇宙嵐',
            'solarFlare': '太陽フレア',
            'hawkingRadiation': 'ホーキング輻射',
            'gravitationalLensing': '重力レンズ',
            'perfectAlignment': '完璧な整列',
            'blackHoleMerger': 'ブラックホール合体',
            'resonanceHarmony': '共鳴ハーモニー',
            'quantumFluctuation': '量子ゆらぎ'
        };
        return displayNames[eventName] || eventName;
    }

    // その他のヘルパーメソッド
    renderLightning(ctx, alpha) {
        const points = [];
        const startX = Math.random() * ctx.canvas.width;
        const startY = Math.random() * ctx.canvas.height * 0.3;
        const endX = Math.random() * ctx.canvas.width;
        const endY = startY + Math.random() * ctx.canvas.height * 0.4;

        // ジグザグな稲妻パスを生成
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t + (Math.random() - 0.5) * 50;
            const y = startY + (endY - startY) * t + (Math.random() - 0.5) * 20;
            points.push({ x, y });
        }

        // 稲妻の描画
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();

        // グロー効果
        ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    }

    renderProminences(ctx, star, progress, intensity) {
        const time = Date.now() * 0.001;
        const baseRadius = Math.sqrt(Math.abs(star.mass || 30)) * 1.2;

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + time * 0.5;
            const length = baseRadius * (2 + progress * 3) * (0.8 + 0.4 * Math.sin(time * 2 + i));

            const startX = star.x + baseRadius * Math.cos(angle);
            const startY = star.y + baseRadius * Math.sin(angle);
            const endX = star.x + length * Math.cos(angle);
            const endY = star.y + length * Math.sin(angle);

            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, `rgba(255, 100, 0, ${intensity * 0.8})`);
            gradient.addColorStop(0.5, `rgba(255, 200, 100, ${intensity * 0.6})`);
            gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }

    // 残りのメソッド
    renderGravitationalLensing(ctx, bodies, progress, intensity) {
        // 既存のアインシュタインリング効果を強化
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        blackHoles.forEach(bh => {
            const enhancedRadius = Math.sqrt(Math.abs(bh.mass || 30)) * 6 * intensity;

            ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, enhancedRadius, 0, Math.PI * 2);
            ctx.stroke();
        });
    }

    renderResonanceHarmony(ctx, bodies, progress, intensity) {
        // 音楽的な共鳴視覚化
        const validBodies = bodies.filter(b => b.isValid);
        const time = Date.now() * 0.001;

        validBodies.forEach((body, i) => {
            const frequency = 0.5 + i * 0.3;
            const amplitude = intensity * 20;
            const baseSqrt = Math.sqrt(Math.abs(body.mass || 30)); // 安全チェック
            const waveRadius = Math.max(5, baseSqrt * 2 + amplitude * Math.sin(time * frequency));

            const hue = (i * 60 + time * 20) % 360;
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${intensity * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(body.x, body.y, waveRadius, 0, Math.PI * 2);
            ctx.stroke();
        });
    }

    startEventEffect(event, bodies, ctx, canvas) {
        // イベント開始時の特殊効果
        // ログを制限（伝説級イベントのみ表示）
        if (event.rarity === 'legendary') {
            console.log(`✨ ${this.getEventDisplayName(event.name)} 開始!`);
        }
    }

    endEvent(event, bodies) {
        // endEventメソッドの実装をメインのendEvent関数に移動済み
    }

    updateEventStats(event) {
        this.eventStats.totalEvents++;
        this.eventStats.eventTypes[event.name] = (this.eventStats.eventTypes[event.name] || 0) + 1;

        if (event.rarity === 'rare') this.eventStats.rareEvents++;
        if (event.rarity === 'legendary') this.eventStats.legendaryEvents++;
    }

    addToHistory(event) {
        this.eventHistory.unshift({
            name: event.name,
            rarity: event.rarity,
            time: event.startTime,
            displayName: this.getEventDisplayName(event.name)
        });

        if (this.eventHistory.length > this.maxHistoryLength) {
            this.eventHistory.pop();
        }
    }

    getEventDisplayName(eventName) {
        const names = {
            cosmicStorm: '宇宙嵐',
            solarFlare: '太陽フレア',
            hawkingRadiation: 'ホーキング輻射',
            gravitationalLensing: '重力レンズ効果',
            perfectAlignment: '完璧な整列',
            blackHoleMerger: 'ブラックホール合体',
            resonanceHarmony: '共鳴ハーモニー'
        };
        return names[eventName] || eventName;
    }

    /**
     * ★ 確実にgetEventStatsメソッドが存在することを確認
     */
    getEventStats() {
        return { ...this.eventStats };
    }

    /**
     * ★ 確実にgetEventHistoryメソッドが存在することを確認  
     */
    getEventHistory() {
        return [...this.eventHistory];
    }

    /**
     * ★ 開発者モード用：特殊イベントを強制発生
     */
    triggerEvent(eventType, bodies, particleSystem, ctx, canvas) {
        console.log(`🎯 開発者モード: ${eventType} を強制発生`);
        
        // イベントタイプの正規化
        const normalizedEventType = eventType.replace(/_/g, '').toLowerCase();
        
        try {
            // イベントデータマップ
            const eventDataMap = {
                'cosmicstorm': {
                    name: 'cosmicStorm',
                    rarity: 'common',
                    duration: 25,
                    condition: () => true
                },
                'solarflare': {
                    name: 'solarFlare',
                    rarity: 'uncommon',
                    duration: 12,
                    condition: () => true
                },
                'hawkingradiation': {
                    name: 'hawkingRadiation',
                    rarity: 'rare',
                    duration: 15,
                    condition: () => true
                },
                'gravitylens': {
                    name: 'gravitationalLensing',
                    rarity: 'rare',
                    duration: 20,
                    condition: () => true
                },
                'perfectalignment': {
                    name: 'perfectAlignment',
                    rarity: 'legendary',
                    duration: 30,
                    condition: () => true
                },
                'blackholemerger': {
                    name: 'blackHoleMerger',
                    rarity: 'legendary',
                    duration: 25,
                    condition: () => true
                },
                'resonanceharmony': {
                    name: 'resonanceHarmony',
                    rarity: 'legendary',
                    duration: 35,
                    condition: () => true
                },
                'quantumfluctuation': {
                    name: 'quantumFluctuation',
                    rarity: 'ultra_rare',
                    duration: 20,
                    condition: () => true
                }
            };
            
            const eventData = eventDataMap[normalizedEventType];
            if (!eventData) {
                console.warn(`未知のイベントタイプ: ${eventType}`);
                return false;
            }
            
            // 統一されたイベントシステムを使用
            this.executeEvent(eventData, bodies, this.internalTime, ctx, canvas);
            
            return true;
        } catch (error) {
            console.error(`イベント発生エラー (${eventType}):`, error);
            return false;
        }
    }

    /**
     * 宇宙嵐の強制発生
     */
    triggerCosmicStorm(bodies, particleSystem, ctx, canvas) {
        console.log('⚡ 宇宙嵐を発生させています...');
        
        // 全天体に軽微な擾乱を与える
        bodies.forEach(body => {
            if (body.isValid) {
                body.vx += (Math.random() - 0.5) * 0.5;
                body.vy += (Math.random() - 0.5) * 0.5;
            }
        });
        
        // パーティクルエフェクト
        if (particleSystem) {
            for (let i = 0; i < 50; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                particleSystem.createAdvancedEffect('energy_burst', x, y, 0.5);
            }
        }
        
        this.addEventToHistory('cosmic_storm', '宇宙嵐');
    }

    /**
     * 太陽フレアの強制発生
     */
    triggerSolarFlare(bodies, particleSystem, ctx, canvas) {
        console.log('☀️ 太陽フレアを発生させています...');
        
        // 最も質量の大きい天体から発生
        const star = bodies.reduce((max, body) => 
            body.isValid && body.mass > max.mass ? body : max, 
            { mass: 0 }
        );
        
        if (star.mass > 0) {
            // 恒星風パーティクル
            if (particleSystem) {
                particleSystem.createAdvancedEffect('stellar_wind', star, 1.5);
            }
            
            this.addEventToHistory('solar_flare', '太陽フレア');
        }
    }

    /**
     * ホーキング輻射の強制発生
     */
    triggerHawkingRadiation(bodies, particleSystem, ctx, canvas) {
        console.log('🔬 ホーキング輻射を発生させています...');
        
        // ブラックホールを探す
        const blackHole = bodies.find(body => body.isValid && body.type === 'blackHole');
        
        if (blackHole) {
            // 微細なパーティクル放出
            if (particleSystem) {
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = blackHole.radius * (2 + Math.random());
                    const x = blackHole.x + Math.cos(angle) * distance;
                    const y = blackHole.y + Math.sin(angle) * distance;
                    particleSystem.createAdvancedEffect('energy_burst', x, y, 0.3);
                }
            }
            
            this.addEventToHistory('hawking_radiation', 'ホーキング輻射');
        }
    }

    /**
     * 重力レンズの強制発生
     */
    triggerGravityLens(bodies, particleSystem, ctx, canvas) {
        console.log('🔍 重力レンズ効果を発生させています...');
        
        // 視覚的な重力レンズ効果
        if (particleSystem) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            for (let i = 0; i < 30; i++) {
                const angle = (i / 30) * Math.PI * 2;
                const radius = 100 + i * 5;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                particleSystem.createAdvancedEffect('gravitational_waves', { x: centerX, y: centerY }, { x, y }, 0.5);
            }
        }
        
        this.addEventToHistory('gravity_lens', '重力レンズ');
    }

    /**
     * 完璧な整列の強制発生
     */
    triggerPerfectAlignment(bodies, particleSystem, ctx, canvas) {
        console.log('🌈 完璧な整列を発生させています...');
        
        // 天体を一直線に整列
        const validBodies = bodies.filter(body => body.isValid);
        if (validBodies.length >= 3) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const spacing = 150;
            
            validBodies.forEach((body, index) => {
                body.x = centerX + (index - (validBodies.length - 1) / 2) * spacing;
                body.y = centerY;
            });
            
            // 整列エフェクト
            if (particleSystem) {
                for (let i = 0; i < validBodies.length; i++) {
                    const body = validBodies[i];
                    particleSystem.createAdvancedEffect('energy_burst', body.x, body.y, 0.8);
                }
            }
            
            this.addEventToHistory('perfect_alignment', '完璧な整列');
        }
    }

    /**
     * ブラックホール合体の強制発生
     */
    triggerBlackHoleMerger(bodies, particleSystem, ctx, canvas) {
        console.log('💫 ブラックホール合体を発生させています...');
        
        // 重力波エフェクト
        if (particleSystem) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            particleSystem.createAdvancedEffect('gravitational_waves', 
                { x: centerX - 50, y: centerY }, 
                { x: centerX + 50, y: centerY }, 
                1.0
            );
            
            // 強力なエネルギー放出
            for (let i = 0; i < 100; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 200;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                particleSystem.createAdvancedEffect('energy_burst', x, y, 1.0);
            }
        }
        
        this.addEventToHistory('black_hole_merger', 'ブラックホール合体');
    }

    /**
     * 共鳴ハーモニーの強制発生
     */
    triggerResonanceHarmony(bodies, particleSystem, ctx, canvas) {
        console.log('🎵 共鳴ハーモニーを発生させています...');
        
        // 軌道の安定化
        bodies.forEach(body => {
            if (body.isValid) {
                // 速度を軽微に調整して安定化
                body.vx *= 0.95;
                body.vy *= 0.95;
            }
        });
        
        // 美しい軌道エフェクト
        if (particleSystem) {
            bodies.forEach(body => {
                if (body.isValid) {
                    for (let i = 0; i < 10; i++) {
                        const angle = (i / 10) * Math.PI * 2;
                        const x = body.x + Math.cos(angle) * body.radius * 2;
                        const y = body.y + Math.sin(angle) * body.radius * 2;
                        particleSystem.createAdvancedEffect('energy_burst', x, y, 0.4);
                    }
                }
            });
        }
        
        this.addEventToHistory('resonance_harmony', '共鳴ハーモニー');
    }

    /**
     * 量子ゆらぎの強制発生
     */
    triggerQuantumFluctuation(bodies, particleSystem, ctx, canvas) {
        console.log('🌀 量子ゆらぎを発生させています...');
        
        // 微細な位置揺らぎ
        bodies.forEach(body => {
            if (body.isValid) {
                body.x += (Math.random() - 0.5) * 0.1;
                body.y += (Math.random() - 0.5) * 0.1;
            }
        });
        
        // 量子エフェクト
        if (particleSystem) {
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                particleSystem.createAdvancedEffect('wormhole', x, y, 0.3);
            }
        }
        
        this.addEventToHistory('quantum_fluctuation', '量子ゆらぎ');
    }

    /**
     * イベント統計の更新
     */
    updateEventStats(eventType) {
        this.eventStats.totalEvents++;
        this.eventStats.eventTypes[eventType] = (this.eventStats.eventTypes[eventType] || 0) + 1;
        
        // レア度に応じた統計更新
        if (['hawking_radiation', 'gravity_lens'].includes(eventType)) {
            this.eventStats.rareEvents++;
        }
        if (['perfect_alignment', 'black_hole_merger', 'resonance_harmony'].includes(eventType)) {
            this.eventStats.legendaryEvents++;
        }
    }

    /**
     * イベント履歴への追加
     */
    addToHistory(event) {
        const historyItem = {
            type: event.name,
            name: this.getEventDisplayName(event.name),
            timestamp: Date.now(),
            realTime: new Date().toLocaleTimeString(),
            rarity: event.rarity,
            duration: event.duration
        };
        
        this.eventHistory.unshift(historyItem);
        if (this.eventHistory.length > this.maxHistoryLength) {
            this.eventHistory.pop();
        }
    }

    /**
     * 旧バージョンの履歴追加（後方互換）
     */
    addEventToHistory(eventType, eventName) {
        const event = {
            type: eventType,
            name: eventName,
            timestamp: Date.now(),
            realTime: new Date().toLocaleTimeString()
        };
        
        this.eventHistory.unshift(event);
        if (this.eventHistory.length > this.maxHistoryLength) {
            this.eventHistory.pop();
        }
    }
}

export { SpecialEventsManager };
