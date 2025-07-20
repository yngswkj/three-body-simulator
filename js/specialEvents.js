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

        // パーティクルシステムへの参照（外部から設定される）
        this.particleSystem = null;
        
        // ★ 泡エフェクト用のタイマー
        this.lastBubbleTime = 0;

        // イベント表示設定
        this.eventMessageConfigs = {
            solarFlare: {
                mainMessage: '太陽フレア発生中',
                subMessage: '磁気リコネクションによる巨大エネルギー放出',
                credit: '- Solar Magnetic Reconnection -',
                bgColor1: '255, 100, 0',
                bgColor2: '200, 50, 0',
                borderColor: '255, 200, 100',
                subTextColor: '255, 200, 100',
                showProgress: true,
                progressLabel: 'フレア強度',
                progressColor1: '255, 150, 0',
                progressColor2: '255, 255, 100'
            },
            hawkingRadiation: {
                mainMessage: 'ホーキング輻射発生中',
                subMessage: '量子場による事象の地平線での粒子放出',
                credit: '- Hawking Radiation Theory -',
                bgColor1: '100, 0, 200',
                bgColor2: '150, 0, 255',
                borderColor: '200, 100, 255',
                subTextColor: '200, 150, 255',
                showProgress: true,
                progressLabel: '輻射強度',
                progressColor1: '150, 100, 255',
                progressColor2: '255, 200, 255'
            },
            gravitationalLensing: {
                mainMessage: '重力レンズ効果発生中',
                subMessage: '時空の歪みによる光の屈曲現象',
                credit: '- Einstein\'s General Relativity -',
                bgColor1: '0, 0, 50',
                bgColor2: '0, 0, 100',
                borderColor: '135, 206, 255',
                subTextColor: '200, 255, 255',
                showProgress: true,
                progressLabel: 'レンズ強度',
                progressColor1: '100, 150, 255',
                progressColor2: '200, 255, 255'
            },
            cosmicStorm: {
                mainMessage: '宇宙嵐発生中',
                subMessage: '太陽風・宇宙線による電磁気的擾乱',
                credit: '- Cosmic Ray Storm -',
                bgColor1: '0, 100, 100',
                bgColor2: '0, 150, 150',
                borderColor: '100, 255, 255',
                subTextColor: '150, 255, 255',
                showProgress: true,
                progressLabel: '嵐の強度',
                progressColor1: '0, 200, 200',
                progressColor2: '100, 255, 255'
            },
            blackHoleMerger: {
                mainMessage: 'ブラックホール合体発生中',
                subMessage: '重力波による時空の振動',
                credit: '- LIGO Gravitational Waves -',
                bgColor1: '50, 0, 50',
                bgColor2: '100, 0, 100',
                borderColor: '255, 100, 255',
                subTextColor: '255, 150, 255',
                showProgress: true,
                progressLabel: '合体進行',
                progressColor1: '200, 0, 200',
                progressColor2: '255, 100, 255'
            },
            perfectAlignment: {
                mainMessage: '完璧な整列発生中',
                subMessage: '天体の三点共線による重力共鳴現象',
                credit: '- Grand Conjunction -',
                bgColor1: '100, 100, 0',
                bgColor2: '150, 150, 0',
                borderColor: '255, 255, 100',
                subTextColor: '255, 255, 150',
                showProgress: true,
                progressLabel: '整列精度',
                progressColor1: '200, 200, 0',
                progressColor2: '255, 255, 100'
            },
            resonanceHarmony: {
                mainMessage: '共鳴ハーモニー発生中',
                subMessage: '軌道共鳴による天体間の音楽的振動',
                credit: '- Orbital Resonance Harmony -',
                bgColor1: '0, 100, 50',
                bgColor2: '0, 150, 100',
                borderColor: '100, 255, 150',
                subTextColor: '150, 255, 200',
                showProgress: true,
                progressLabel: '共鳴強度',
                progressColor1: '50, 200, 100',
                progressColor2: '100, 255, 150'
            },
            multiverse: {
                mainMessage: 'マルチバース現象発生中',
                subMessage: '並行宇宙との次元境界の一時的開放',
                credit: '- Multiverse Theory -',
                bgColor1: '0, 20, 60',
                bgColor2: '20, 0, 80',
                borderColor: '100, 200, 255',
                subTextColor: '150, 220, 255',
                showProgress: true,
                progressLabel: '次元強度',
                progressColor1: '50, 150, 255',
                progressColor2: '150, 255, 255'
            }
        };
    }

    /**
     * パーティクルシステムへの参照を設定
     */
    setParticleSystem(particleSystem) {
        this.particleSystem = particleSystem;
    }

    /**
     * 特殊イベント発生中メッセージの共通表示
     */
    renderEventMessage(ctx, eventConfig, progress, intensity) {
        const time = Date.now() * 0.001;
        const canvas = ctx.canvas;

        // メッセージの透明度
        const messageAlpha = intensity * 0.9 * (0.7 + 0.3 * Math.sin(time * 2));

        // 背景フレーム
        const frameX = canvas.width / 2 - (eventConfig.frameWidth || 180);
        const frameY = eventConfig.frameY || 50;
        const frameWidth = (eventConfig.frameWidth || 180) * 2;
        const frameHeight = eventConfig.frameHeight || 110; // ★ 80 → 110に拡張（30px増加）

        // フレーム背景（イベントタイプ別カラー）
        const frameGradient = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameHeight);
        frameGradient.addColorStop(0, `rgba(${eventConfig.bgColor1}, ${messageAlpha * 0.9})`);
        frameGradient.addColorStop(1, `rgba(${eventConfig.bgColor2}, ${messageAlpha * 0.6})`);

        ctx.fillStyle = frameGradient;
        ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

        // フレーム境界線
        ctx.strokeStyle = `rgba(${eventConfig.borderColor}, ${messageAlpha})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);

        // メインメッセージ
        ctx.font = `bold ${eventConfig.mainFontSize || 28}px "Yu Gothic", "Noto Sans JP", sans-serif`;
        ctx.fillStyle = `rgba(255, 255, 255, ${messageAlpha})`;
        ctx.textAlign = 'center';
        ctx.fillText(eventConfig.mainMessage, canvas.width / 2, frameY + 35);

        // サブメッセージ
        ctx.font = `${eventConfig.subFontSize || 16}px "Yu Gothic", "Noto Sans JP", sans-serif`;
        ctx.fillStyle = `rgba(${eventConfig.subTextColor}, ${messageAlpha * 0.8})`;
        ctx.fillText(eventConfig.subMessage, canvas.width / 2, frameY + 60);

        // クレジット表示（オプション）
        if (eventConfig.credit) {
            ctx.font = '12px monospace';
            ctx.fillStyle = `rgba(${eventConfig.creditColor || '180, 200, 255'}, ${messageAlpha * 0.6})`;
            ctx.fillText(eventConfig.credit, canvas.width / 2, frameY + frameHeight + 15);
        }

        // 進捗バー（オプション）
        if (eventConfig.showProgress) {
            const progressBarX = frameX + 30;
            const progressBarY = frameY + frameHeight - 20; // ★ フレーム内に戻す
            const progressBarWidth = frameWidth - 60;
            const progressBarHeight = 6;

            // 進捗バー背景
            ctx.fillStyle = `rgba(50, 50, 100, ${messageAlpha * 0.8})`;
            ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

            // 進捗バー（現在の強度）
            const progressFill = progress * progressBarWidth;
            const progressGradient = ctx.createLinearGradient(
                progressBarX, progressBarY,
                progressBarX + progressFill, progressBarY
            );
            progressGradient.addColorStop(0, `rgba(${eventConfig.progressColor1}, ${messageAlpha})`);
            progressGradient.addColorStop(1, `rgba(${eventConfig.progressColor2}, ${messageAlpha})`);

            ctx.fillStyle = progressGradient;
            ctx.fillRect(progressBarX, progressBarY, progressFill, progressBarHeight);

            // 進捗バーのラベル
            ctx.font = '10px monospace';
            ctx.fillStyle = `rgba(200, 200, 255, ${messageAlpha * 0.7})`;
            ctx.textAlign = 'left';
            ctx.fillText(`${eventConfig.progressLabel}:`, progressBarX, progressBarY - 10);
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(progress * 100)}%`, progressBarX + progressBarWidth, progressBarY - 5);
        }

        // リセット
        ctx.textAlign = 'left';
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

        // レア度による重み付け選択（ホーキング輻射を気づきやすく）
        const weightedEvents = [];
        availableEvents.forEach(event => {
            let weight = event.rarity === 'common' ? 100 :
                event.rarity === 'uncommon' ? 60 : // ★ uncommonの重みを追加
                    event.rarity === 'rare' ? 20 :
                        event.rarity === 'legendary' ? 2 : 50;

            // ★ ホーキング輻射の特別ボーナス
            if (event.name === 'hawkingRadiation') {
                weight *= 2; // 発生率を2倍に
            }

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
            duration: 18, // ★ 12秒から18秒に延長して気づきやすく
            condition: () => bodies.some(b =>
                b.isValid && (
                    b.type === 'star' ||
                    (b.type === 'normal' && b.mass >= 20) ||
                    b.stellarClass
                )
            )
        });

        // レアイベント
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        if (blackHoles.length > 0) {
            events.push({
                name: 'hawkingRadiation',
                rarity: 'uncommon', // ★ rareからuncommonに変更して発生率を向上
                duration: 25, // ★ 持続時間を更に延長して特別感を強化
                condition: () => true
            });

            events.push({
                name: 'gravitationalLensing',
                rarity: 'rare',
                duration: 20,
                condition: () => bodies.length >= 3
            });
        }

        // 伝説級イベント（発生条件を緩和）
        if (this.detectSpecialAlignment(bodies)) {
            events.push({
                name: 'perfectAlignment',
                rarity: 'rare', // ★ legendary → rare に変更（発生率大幅向上）
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

        // ★ 超レアイベント：マルチバース現象（極めて複雑な系でのみ発生）
        if (this.internalTime > 900 && bodies.length >= 7) { // 15分後、7天体以上
            // 極限条件：超複雑系または超大質量系または超長時間
            const ultraComplexSystem = bodies.length >= 8;
            const massiveSystem = bodies.some(b => b.mass > 200 && b.isValid);
            const veryLongRunning = this.internalTime > 1200; // 20分経過
            
            if (ultraComplexSystem || massiveSystem || veryLongRunning) {
                events.push({
                    name: 'multiverse',
                    rarity: 'ultra_rare',
                    duration: 35, // 35秒の壮大な演出
                    condition: () => Math.random() < 0.0001 // 0.01%の極低確率
                });
            }
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

            case 'multiverse':
                // ★ マルチバース効果：並行宇宙からの影響
                bodies.forEach(body => {
                    if (body.isValid) {
                        // 並行宇宙の重力場による微細な影響
                        const parallelInfluence = 0.05;
                        body.vx += (Math.random() - 0.5) * parallelInfluence;
                        body.vy += (Math.random() - 0.5) * parallelInfluence;
                        
                        // 次元境界での質量変動（異なる宇宙の物理定数）
                        if (!body.originalMass) body.originalMass = body.mass;
                        const dimensionalShift = body.originalMass * 0.002 * Math.sin(Date.now() * 0.001);
                        body.mass = Math.max(1, body.originalMass + dimensionalShift);
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
            case 'multiverse':
                this.renderMultiverse(ctx, bodies, progress, intensity);
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

        // ★ 宇宙嵐発生中メッセージ（共通メソッド使用）
        if (progress > 0.1 && progress < 0.8) { // ★ 0.7 → 0.8に変更（17.5秒表示）
            this.renderEventMessage(ctx, this.eventMessageConfigs.cosmicStorm, progress, intensity);
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
        // ★ 修正：恒星の特定を改善（typeが'star'ではなく'normal'の場合も含む）
        const stars = bodies.filter(b => {
            if (!b.isValid) return false;
            // 恒星タイプまたは質量が十分大きい天体を恒星とみなす
            return b.type === 'star' ||
                (b.type === 'normal' && b.mass >= 20) || // 恒星分類システムの恒星
                b.stellarClass; // 恒星分類がある場合
        });

        if (stars.length === 0) {
            return;
        }

        const time = Date.now() * 0.001;
        const fadeIn = Math.min(1, progress * 3);
        const fadeOut = progress > 0.8 ? (1 - progress) * 5 : 1;
        const mainAlpha = fadeIn * fadeOut * intensity;
        const explosionPulse = 0.7 + 0.3 * Math.sin(time * 6);

        stars.forEach((star, index) => {
            const baseRadius = Math.sqrt(Math.abs(star.mass || 30)) * 2;
            const flareRadius = baseRadius * (2 + progress * 4) * explosionPulse;

            // ★ 1. 中心爆発コア（白熱光）
            const coreGradient = ctx.createRadialGradient(
                star.x, star.y, 0,
                star.x, star.y, baseRadius * 0.8
            );
            coreGradient.addColorStop(0, `rgba(255, 255, 255, ${mainAlpha})`);
            coreGradient.addColorStop(0.4, `rgba(255, 255, 200, ${mainAlpha * 0.9})`);
            coreGradient.addColorStop(1, `rgba(255, 200, 100, ${mainAlpha * 0.5})`);

            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, baseRadius * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // ★ 2. 放射状フレアエフェクト（16方向）
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2 + time * 0.5;
                const flareLength = flareRadius * (0.8 + 0.6 * Math.sin(time * 3 + i));
                const flareWidth = baseRadius * (0.3 + 0.2 * Math.sin(time * 4 + i * 0.5));

                // 放射状フレアの描画
                ctx.save();
                ctx.translate(star.x, star.y);
                ctx.rotate(angle);

                const flareGradient = ctx.createLinearGradient(0, 0, flareLength, 0);
                flareGradient.addColorStop(0, `rgba(255, 255, 100, ${mainAlpha * 0.9})`);
                flareGradient.addColorStop(0.3, `rgba(255, 150, 0, ${mainAlpha * 0.7})`);
                flareGradient.addColorStop(0.7, `rgba(255, 100, 0, ${mainAlpha * 0.4})`);
                flareGradient.addColorStop(1, `rgba(255, 50, 0, 0)`);

                ctx.fillStyle = flareGradient;
                ctx.beginPath();
                ctx.ellipse(flareLength / 2, 0, flareLength / 2, flareWidth / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            // ★ 3. 外層フレアシェル（大型フレア）
            const outerGradient = ctx.createRadialGradient(
                star.x, star.y, baseRadius,
                star.x, star.y, flareRadius * 1.5
            );
            outerGradient.addColorStop(0, `rgba(255, 100, 0, ${mainAlpha * 0.4})`);
            outerGradient.addColorStop(0.5, `rgba(255, 50, 0, ${mainAlpha * 0.2})`);
            outerGradient.addColorStop(1, `rgba(200, 0, 0, 0)`);

            ctx.fillStyle = outerGradient;
            ctx.beginPath();
            ctx.arc(star.x, star.y, flareRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // ★ 4. 改善されたプロミネンス（コロナルループ）
            this.renderProminences(ctx, star, progress, mainAlpha, baseRadius);

            // ★ 5. 磁気リコネクションの電気弧効果
            for (let arc = 0; arc < 8; arc++) {
                const arcAngle = (arc / 8) * Math.PI * 2 + time;
                const arcRadius = baseRadius * (1.5 + 0.5 * Math.sin(time * 2 + arc));
                const arcX = star.x + arcRadius * Math.cos(arcAngle);
                const arcY = star.y + arcRadius * Math.sin(arcAngle);

                // 電気弧の描画
                ctx.strokeStyle = `rgba(100, 200, 255, ${mainAlpha * 0.8})`;
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    const segmentAngle = arcAngle + (j - 2) * 0.1;
                    const segmentRadius = arcRadius + Math.sin(time * 10 + j) * 5;
                    const x = star.x + segmentRadius * Math.cos(segmentAngle);
                    const y = star.y + segmentRadius * Math.sin(segmentAngle);
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // ★ 6. フレアイベントの警告メッセージ（共通メソッド使用）
            if (progress < 0.85 && index === 0) { // ★ 0.3 → 0.85に変更（10.2秒表示）
                this.renderEventMessage(ctx, this.eventMessageConfigs.solarFlare, progress, intensity);
            }
        });
    }

    /**
     * ホーキング輻射の描画
     */
    renderHawkingRadiation(ctx, bodies, progress, intensity) {
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);

        blackHoles.forEach(bh => {
            const time = Date.now() * 0.001;
            const radiationRadius = Math.sqrt(Math.abs(bh.mass || 30)) * 6 * (1 + progress * 0.5);
            const fadeIn = Math.min(1, progress * 3); // 急速フェードイン
            const fadeOut = progress > 0.8 ? (1 - progress) * 5 : 1;
            const mainAlpha = fadeIn * fadeOut * intensity;

            // ★ 1. 事象の地平線の爆発的発光エフェクト
            const eventHorizonRadius = Math.sqrt(Math.abs(bh.mass || 30)) * 2;
            const explosionGradient = ctx.createRadialGradient(
                bh.x, bh.y, 0,
                bh.x, bh.y, eventHorizonRadius * 3
            );
            explosionGradient.addColorStop(0, `rgba(255, 255, 255, ${mainAlpha * 0.9})`);
            explosionGradient.addColorStop(0.3, `rgba(0, 255, 255, ${mainAlpha * 0.7})`);
            explosionGradient.addColorStop(0.7, `rgba(255, 0, 255, ${mainAlpha * 0.4})`);
            explosionGradient.addColorStop(1, `rgba(100, 0, 255, 0)`);

            ctx.fillStyle = explosionGradient;
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, eventHorizonRadius * 3, 0, Math.PI * 2);
            ctx.fill();

            // ★ 2. 立体的な量子フォーム効果（多層球体）
            for (let layer = 0; layer < 4; layer++) {
                const layerRadius = radiationRadius * (0.6 + layer * 0.3);
                const particleCount = 60 - layer * 10; // 外側ほど粗い

                for (let i = 0; i < particleCount; i++) {
                    const theta = (i / particleCount) * Math.PI * 2 + time * (1 + layer * 0.5);
                    const phi = Math.sin(time * 0.8 + i * 0.1 + layer) * Math.PI;

                    // 3D球面座標を使用
                    const r = layerRadius * (0.8 + 0.4 * Math.sin(time * 2 + i * 0.1));
                    const x = bh.x + r * Math.cos(theta) * Math.cos(phi);
                    const y = bh.y + r * Math.sin(theta) * Math.cos(phi);
                    const z = r * Math.sin(phi); // 立体感のためのサイズ調整

                    const particleSize = Math.max(1, 3 + Math.sin(time * 4 + i) * 2) * (1 + z * 0.001);
                    const alpha = mainAlpha * 0.8 * (0.6 + 0.4 * Math.sin(time * 3 + i)) * (1 - layer * 0.2);

                    // 量子エネルギーの色変化（ガンマ線から正の電子へ）
                    const hue = 180 + Math.sin(time * 2 + i * 0.2) * 120; // シアンから青紫
                    const saturation = 90 + Math.sin(time * 1.5 + i) * 10;
                    const lightness = 70 + Math.sin(time * 3 + i) * 20;

                    ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(x, y, particleSize, 0, Math.PI * 2);
                    ctx.fill();

                    // ★ 3. 量子グロー効果
                    if (layer === 0 && i % 3 === 0) {
                        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, particleSize * 3);
                        glowGradient.addColorStop(0, `hsla(${hue}, 100%, 80%, ${alpha * 0.5})`);
                        glowGradient.addColorStop(1, `hsla(${hue}, 100%, 80%, 0)`);
                        ctx.fillStyle = glowGradient;
                        ctx.beginPath();
                        ctx.arc(x, y, particleSize * 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // ★ 4. 量子真空の波紋効果（同心円状のエネルギー波）
            for (let ring = 0; ring < 5; ring++) {
                const ringRadius = radiationRadius * (0.5 + ring * 0.3);
                const waveOffset = time * 2 + ring * 0.8;
                const waveAlpha = mainAlpha * 0.6 * Math.abs(Math.sin(waveOffset));

                ctx.strokeStyle = `rgba(0, 255, 255, ${waveAlpha})`;
                ctx.lineWidth = 3;
                ctx.setLineDash([10, 5]);
                ctx.lineDashOffset = -time * 20;
                ctx.beginPath();
                ctx.arc(bh.x, bh.y, ringRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // ★ 5. ホーキング輻射の温度勾配表示
            const temperatureText = `T = ħc³/(8πGMk)`;
            ctx.fillStyle = `rgba(255, 255, 255, ${mainAlpha * 0.8})`;
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(temperatureText, bh.x, bh.y - radiationRadius - 20);

            // ★ 6. 特別イベントの警告メッセージ（共通メソッド使用）
            if (progress < 0.7) { // ★ 0.4 → 0.7に変更（10.5秒表示）
                this.renderEventMessage(ctx, this.eventMessageConfigs.hawkingRadiation, progress, intensity);
            }

            // ★ 7. 全画面グローエフェクト（特別イベントの場合）
            if (progress > 0.2 && progress < 0.8) {
                // 画面全体に量子グローを追加
                const screenGlow = ctx.createRadialGradient(
                    ctx.canvas.width / 2, ctx.canvas.height / 2, 0,
                    ctx.canvas.width / 2, ctx.canvas.height / 2, Math.max(ctx.canvas.width, ctx.canvas.height)
                );
                const glowIntensity = Math.sin(progress * Math.PI) * mainAlpha * 0.15;
                screenGlow.addColorStop(0, `rgba(0, 255, 255, ${glowIntensity})`);
                screenGlow.addColorStop(0.5, `rgba(255, 0, 255, ${glowIntensity * 0.5})`);
                screenGlow.addColorStop(1, `rgba(100, 0, 255, 0)`);

                ctx.fillStyle = screenGlow;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
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

        // ★ 完璧な整列発生中メッセージ（共通メソッド使用）
        if (progress > 0.1 && progress < 0.8) {
            this.renderEventMessage(ctx, this.eventMessageConfigs.perfectAlignment, progress, intensity);
        }
    }

    /**
     * ブラックホール合体の描画
     */
    renderBlackHoleMerger(ctx, bodies, progress, intensity) {
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        if (blackHoles.length < 2) return;

        const time = Date.now() * 0.001;

        const canvas = ctx.canvas;

        // ★ 1. 時空歪みの波動エフェクト（各ブラックホールから放射状に伝播）
        blackHoles.forEach((bh, index) => {
            const baseMass = Math.abs(bh.mass || 30);
            
            // 多重重力波の伝播
            for (let wave = 0; wave < 12; wave++) {
                const waveRadius = wave * 80 + (time * 200 + index * 100) % 800;
                const waveAge = waveRadius / 800; // 0-1の波の年齢
                const waveAlpha = intensity * 0.8 * (1 - waveAge) * Math.exp(-waveAge * 2);
                
                if (waveAlpha > 0.01) {
                    // 波の厚み（時空の圧縮・伸張）
                    const compressionPhase = time * 6 + wave * 0.8;
                    const compressionStrength = 1 + Math.sin(compressionPhase) * 0.3;
                    
                    // 重力波の二重性（+偏波と×偏波）
                    for (let polarization = 0; polarization < 2; polarization++) {
                        const polAngle = polarization * Math.PI / 4; // 45度回転
                        
                        ctx.strokeStyle = `rgba(${polarization ? '100, 255, 255' : '255, 100, 255'}, ${waveAlpha})`;
                        ctx.lineWidth = 3 * compressionStrength;
                        ctx.beginPath();
                        
                        // 楕円形の歪み波（重力波の特性）
                        const ellipseA = waveRadius * (1 + Math.sin(compressionPhase) * 0.2);
                        const ellipseB = waveRadius * (1 - Math.sin(compressionPhase) * 0.2);
                        
                        ctx.ellipse(bh.x, bh.y, ellipseA, ellipseB, polAngle, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
        });

        // ★ 2. 時空格子の動的歪みエフェクト（波の伝播を視覚化）
        if (progress > 0.2) {
            const gridSpacing = 50;
            const waveSpeed = 150; // ピクセル/秒
            
            ctx.strokeStyle = `rgba(200, 150, 255, ${intensity * 0.4})`;
            ctx.lineWidth = 1;
            
            // 動的な時空歪み計算
            for (let x = 0; x <= canvas.width; x += gridSpacing) {
                for (let y = 0; y <= canvas.height; y += gridSpacing) {
                    
                    // 各点での重力波による歪み計算
                    let totalDistortionX = 0;
                    let totalDistortionY = 0;
                    
                    blackHoles.forEach((bh, bhIndex) => {
                        const dx = x - bh.x;
                        const dy = y - bh.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // 重力波の到達時間
                        const arrivalTime = distance / waveSpeed;
                        const wavePhase = time * 4 - arrivalTime;
                        
                        // 重力波強度（距離による減衰）
                        const waveAmplitude = Math.sqrt(Math.abs(bh.mass || 30)) * 30 / (distance + 50);
                        
                        // 時空歪み（h+ と h× 偏波）
                        const hPlus = waveAmplitude * Math.sin(wavePhase) * Math.exp(-distance / 400);
                        const hCross = waveAmplitude * Math.cos(wavePhase) * Math.exp(-distance / 400);
                        
                        // 歪みテンソルの適用
                        const directionX = dx / (distance + 1);
                        const directionY = dy / (distance + 1);
                        
                        totalDistortionX += hPlus * (directionX * directionX - directionY * directionY) * 20;
                        totalDistortionY += 2 * hCross * directionX * directionY * 20;
                    });
                    
                    // 歪んだ格子点の描画
                    const distortedX = x + totalDistortionX;
                    const distortedY = y + totalDistortionY;
                    
                    // 格子線の描画（隣接点との接続）
                    if (x > 0) {
                        // 水平線
                        const prevX = x - gridSpacing;
                        let prevDistortionX = 0;
                        let prevDistortionY = 0;
                        
                        blackHoles.forEach(bh => {
                            const dx = prevX - bh.x;
                            const dy = y - bh.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const arrivalTime = distance / waveSpeed;
                            const wavePhase = time * 4 - arrivalTime;
                            const waveAmplitude = Math.sqrt(Math.abs(bh.mass || 30)) * 30 / (distance + 50);
                            const hPlus = waveAmplitude * Math.sin(wavePhase) * Math.exp(-distance / 400);
                            const hCross = waveAmplitude * Math.cos(wavePhase) * Math.exp(-distance / 400);
                            const directionX = dx / (distance + 1);
                            const directionY = dy / (distance + 1);
                            
                            prevDistortionX += hPlus * (directionX * directionX - directionY * directionY) * 20;
                            prevDistortionY += 2 * hCross * directionX * directionY * 20;
                        });
                        
                        ctx.beginPath();
                        ctx.moveTo(prevX + prevDistortionX, y + prevDistortionY);
                        ctx.lineTo(distortedX, distortedY);
                        ctx.stroke();
                    }
                    
                    if (y > 0) {
                        // 垂直線
                        const prevY = y - gridSpacing;
                        let prevDistortionX = 0;
                        let prevDistortionY = 0;
                        
                        blackHoles.forEach(bh => {
                            const dx = x - bh.x;
                            const dy = prevY - bh.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            const arrivalTime = distance / waveSpeed;
                            const wavePhase = time * 4 - arrivalTime;
                            const waveAmplitude = Math.sqrt(Math.abs(bh.mass || 30)) * 30 / (distance + 50);
                            const hPlus = waveAmplitude * Math.sin(wavePhase) * Math.exp(-distance / 400);
                            const hCross = waveAmplitude * Math.cos(wavePhase) * Math.exp(-distance / 400);
                            const directionX = dx / (distance + 1);
                            const directionY = dy / (distance + 1);
                            
                            prevDistortionX += hPlus * (directionX * directionX - directionY * directionY) * 20;
                            prevDistortionY += 2 * hCross * directionX * directionY * 20;
                        });
                        
                        ctx.beginPath();
                        ctx.moveTo(x + prevDistortionX, prevY + prevDistortionY);
                        ctx.lineTo(distortedX, distortedY);
                        ctx.stroke();
                    }
                }
            }
        }

        // ★ 3. 高エネルギー相対論ジェット（ビーミング効果付き）
        blackHoles.forEach((bh, index) => {
            const baseMass = Math.abs(bh.mass || 30);
            const jetLength = Math.sqrt(baseMass) * 25 * intensity;
            const jetBaseWidth = Math.sqrt(baseMass) * 1.5;
            
            // 双極ジェット（上下方向、回転考慮）
            for (let jetDirection = 0; jetDirection < 2; jetDirection++) {
                const jetAngle = jetDirection * Math.PI + time * 0.1 + index * 0.3; // 微細な回転
                
                // ★ ジェットのコアとヘイロー構造
                // コア（超高温・高密度）
                const coreLength = jetLength * 0.9;
                const coreWidth = jetBaseWidth * 0.3;
                
                // コアのビーミング効果（相対論的効果）
                const beamingFactor = 1 + 0.5 * Math.sin(time * 12 + index * Math.PI);
                const coreIntensity = intensity * beamingFactor;
                
                // ★ 1. ジェットコア（白青色・超高温）
                const coreGradient = ctx.createLinearGradient(
                    bh.x, bh.y,
                    bh.x + Math.cos(jetAngle) * coreLength,
                    bh.y + Math.sin(jetAngle) * coreLength
                );
                
                coreGradient.addColorStop(0, `rgba(255, 255, 255, ${coreIntensity * 0.95})`);
                coreGradient.addColorStop(0.2, `rgba(200, 220, 255, ${coreIntensity * 0.9})`);
                coreGradient.addColorStop(0.5, `rgba(100, 150, 255, ${coreIntensity * 0.7})`);
                coreGradient.addColorStop(0.8, `rgba(50, 100, 255, ${coreIntensity * 0.4})`);
                coreGradient.addColorStop(1, `rgba(20, 50, 255, 0)`);
                
                // コアの描画（細い線として）
                ctx.strokeStyle = coreGradient;
                ctx.lineWidth = coreWidth * beamingFactor;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(bh.x, bh.y);
                ctx.lineTo(
                    bh.x + Math.cos(jetAngle) * coreLength,
                    bh.y + Math.sin(jetAngle) * coreLength
                );
                ctx.stroke();
                
                // ★ 2. ジェットヘイロー（相対論的粒子の外殻）
                const haloLength = jetLength;
                const haloWidth = jetBaseWidth;
                
                for (let haloLayer = 0; haloLayer < 3; haloLayer++) {
                    const layerScale = 1 + haloLayer * 0.4;
                    const layerAlpha = intensity * 0.3 * (1 - haloLayer * 0.3);
                    
                    const haloGradient = ctx.createLinearGradient(
                        bh.x, bh.y,
                        bh.x + Math.cos(jetAngle) * haloLength * layerScale,
                        bh.y + Math.sin(jetAngle) * haloLength * layerScale
                    );
                    
                    // シンクロトロン放射の色（青→紫→赤）
                    const baseHue = 240 - haloLayer * 40; // 青→赤紫→赤
                    haloGradient.addColorStop(0, `hsla(${baseHue}, 100%, 70%, ${layerAlpha})`);
                    haloGradient.addColorStop(0.4, `hsla(${baseHue}, 90%, 60%, ${layerAlpha * 0.8})`);
                    haloGradient.addColorStop(0.7, `hsla(${baseHue}, 80%, 50%, ${layerAlpha * 0.5})`);
                    haloGradient.addColorStop(1, `hsla(${baseHue}, 70%, 40%, 0)`);
                    
                    ctx.strokeStyle = haloGradient;
                    ctx.lineWidth = haloWidth * layerScale;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(bh.x, bh.y);
                    ctx.lineTo(
                        bh.x + Math.cos(jetAngle) * haloLength * layerScale,
                        bh.y + Math.sin(jetAngle) * haloLength * layerScale
                    );
                    ctx.stroke();
                }
                
                // ★ 3. 高エネルギーパーティクル（ローレンツビーミング）
                const particleCount = 12;
                for (let p = 0; p < particleCount; p++) {
                    const particleProgress = (p / particleCount) + (time * 2) % 1; // 高速移動
                    if (particleProgress > 1) continue;
                    
                    // 相対論的効果で粒子が集中
                    const lorentzFactor = 1 / Math.sqrt(1 - 0.99 * 0.99); // v=0.99c
                    const beamedProgress = Math.pow(particleProgress, 1/lorentzFactor);
                    
                    const particleX = bh.x + Math.cos(jetAngle) * jetLength * beamedProgress;
                    const particleY = bh.y + Math.sin(jetAngle) * jetLength * beamedProgress;
                    
                    // ドップラーシフト効果
                    const dopplerShift = 1 + particleProgress * 0.5;
                    const particleHue = 200 + dopplerShift * 100; // 青方偏移
                    const particleSize = 2 + Math.sin(time * 15 + p) * 1;
                    const particleAlpha = intensity * 0.8 * (1 - particleProgress);
                    
                    // パーティクルのグロー
                    const particleGlow = ctx.createRadialGradient(
                        particleX, particleY, 0,
                        particleX, particleY, particleSize * 3
                    );
                    particleGlow.addColorStop(0, `hsla(${particleHue}, 100%, 90%, ${particleAlpha})`);
                    particleGlow.addColorStop(0.5, `hsla(${particleHue}, 100%, 70%, ${particleAlpha * 0.6})`);
                    particleGlow.addColorStop(1, `hsla(${particleHue}, 100%, 50%, 0)`);
                    
                    ctx.fillStyle = particleGlow;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, particleSize * 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // パーティクル本体
                    ctx.fillStyle = `hsla(${particleHue}, 100%, 95%, ${particleAlpha})`;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // ★ 4. ジェット先端の衝撃波（ボウショック）
                const shockDistance = jetLength * 0.95;
                const shockX = bh.x + Math.cos(jetAngle) * shockDistance;
                const shockY = bh.y + Math.sin(jetAngle) * shockDistance;
                
                // 複数の衝撃波リング
                for (let ring = 0; ring < 4; ring++) {
                    const ringRadius = jetBaseWidth * (2 + ring * 0.8);
                    const ringPhase = time * 8 + ring * Math.PI/2;
                    const ringAlpha = intensity * 0.5 * Math.abs(Math.sin(ringPhase)) * (1 - ring * 0.2);
                    
                    if (ringAlpha > 0.1) {
                        // 衝撃波のグラデーション
                        const shockGradient = ctx.createRadialGradient(
                            shockX, shockY, ringRadius * 0.7,
                            shockX, shockY, ringRadius
                        );
                        shockGradient.addColorStop(0, 'transparent');
                        shockGradient.addColorStop(0.8, `rgba(255, 150, 50, ${ringAlpha})`);
                        shockGradient.addColorStop(1, `rgba(255, 100, 100, ${ringAlpha * 0.8})`);
                        
                        ctx.strokeStyle = shockGradient;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(shockX, shockY, ringRadius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
                
                // ★ 5. ジェット周辺の磁場線効果
                if (intensity > 0.5) {
                    for (let field = 0; field < 6; field++) {
                        const fieldAngle = jetAngle + (field - 2.5) * 0.1;
                        const fieldLength = jetLength * 0.7;
                        const fieldAlpha = intensity * 0.2 * Math.abs(Math.sin(time * 4 + field));
                        
                        ctx.strokeStyle = `rgba(100, 255, 100, ${fieldAlpha})`;
                        ctx.lineWidth = 1;
                        ctx.setLineDash([5, 10]);
                        ctx.lineDashOffset = -time * 20;
                        ctx.beginPath();
                        ctx.moveTo(bh.x, bh.y);
                        ctx.lineTo(
                            bh.x + Math.cos(fieldAngle) * fieldLength,
                            bh.y + Math.sin(fieldAngle) * fieldLength
                        );
                        ctx.stroke();
                    }
                    ctx.setLineDash([]);
                }
            }
        });

        // ★ 4. 重力波の伝播ライン（波動の方向性を明確に表示）
        if (progress > 0.3) {
            blackHoles.forEach((bh, bhIndex) => {
                const baseMass = Math.abs(bh.mass || 30);
                const waveSpeed = 200;
                
                // 24方向への波動伝播ライン
                for (let direction = 0; direction < 24; direction++) {
                    const angle = (direction / 24) * Math.PI * 2;
                    const maxDistance = 400;
                    
                    // 複数の波がこの方向に伝播
                    for (let waveNum = 0; waveNum < 5; waveNum++) {
                        const waveStartTime = waveNum * 0.5; // 0.5秒間隔で波が発生
                        const currentWaveTime = time - waveStartTime;
                        
                        if (currentWaveTime > 0) {
                            const waveDistance = currentWaveTime * waveSpeed;
                            
                            if (waveDistance < maxDistance) {
                                // 波面の位置
                                const waveX = bh.x + Math.cos(angle) * waveDistance;
                                const waveY = bh.y + Math.sin(angle) * waveDistance;
                                
                                // 波の強度（距離による減衰）
                                const waveIntensity = intensity * Math.exp(-waveDistance / 200) * 
                                                    Math.sin(currentWaveTime * 8) * 0.5 + 0.5;
                                
                                if (waveIntensity > 0.1) {
                                    // 波面の描画（短い線分）
                                    const waveLength = 30;
                                    const perpAngle = angle + Math.PI / 2;
                                    
                                    ctx.strokeStyle = `rgba(255, 200, 100, ${waveIntensity})`;
                                    ctx.lineWidth = 4;
                                    ctx.lineCap = 'round';
                                    ctx.beginPath();
                                    ctx.moveTo(
                                        waveX + Math.cos(perpAngle) * waveLength / 2,
                                        waveY + Math.sin(perpAngle) * waveLength / 2
                                    );
                                    ctx.lineTo(
                                        waveX - Math.cos(perpAngle) * waveLength / 2,
                                        waveY - Math.sin(perpAngle) * waveLength / 2
                                    );
                                    ctx.stroke();
                                    
                                    // 波の軌跡（薄い線）
                                    if (waveDistance > 20) {
                                        const trailStartX = bh.x + Math.cos(angle) * 20;
                                        const trailStartY = bh.y + Math.sin(angle) * 20;
                                        
                                        ctx.strokeStyle = `rgba(255, 255, 150, ${waveIntensity * 0.3})`;
                                        ctx.lineWidth = 1;
                                        ctx.setLineDash([5, 10]);
                                        ctx.beginPath();
                                        ctx.moveTo(trailStartX, trailStartY);
                                        ctx.lineTo(waveX, waveY);
                                        ctx.stroke();
                                        ctx.setLineDash([]);
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        // ★ 5. 重力波干渉による「うなり」効果
        if (blackHoles.length >= 2 && progress > 0.4) {
            for (let i = 0; i < blackHoles.length; i++) {
                for (let j = i + 1; j < blackHoles.length; j++) {
                    const bh1 = blackHoles[i];
                    const bh2 = blackHoles[j];
                    
                    // 干渉領域の中心線
                    const centerX = (bh1.x + bh2.x) / 2;
                    const centerY = (bh1.y + bh2.y) / 2;
                    const distance = Math.sqrt((bh2.x - bh1.x) ** 2 + (bh2.y - bh1.y) ** 2);
                    
                    // 干渉パターンの描画
                    for (let k = 0; k < 8; k++) {
                        const interferenceDistance = k * 50 + time * 100;
                        const phase1 = time * 6 - interferenceDistance / 150;
                        const phase2 = time * 6 - interferenceDistance / 150 + Math.PI / 3;
                        
                        // 建設的干渉と破壊的干渉
                        const interferenceStrength = Math.cos(phase1) * Math.cos(phase2);
                        const interferenceAlpha = intensity * 0.6 * Math.abs(interferenceStrength);
                        
                        if (interferenceAlpha > 0.1) {
                            const angle = Math.atan2(bh2.y - bh1.y, bh2.x - bh1.x);
                            const perpAngle = angle + Math.PI / 2;
                            
                            // 干渉縞の描画
                            ctx.strokeStyle = interferenceStrength > 0 ? 
                                `rgba(255, 255, 255, ${interferenceAlpha})` : 
                                `rgba(100, 100, 255, ${interferenceAlpha})`;
                            ctx.lineWidth = Math.abs(interferenceStrength) * 5 + 1;
                            
                            const fringeLength = distance * 0.8;
                            ctx.beginPath();
                            ctx.moveTo(
                                centerX + Math.cos(perpAngle) * fringeLength / 2,
                                centerY + Math.sin(perpAngle) * fringeLength / 2
                            );
                            ctx.lineTo(
                                centerX - Math.cos(perpAngle) * fringeLength / 2,
                                centerY - Math.sin(perpAngle) * fringeLength / 2
                            );
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        // ★ 6. 重力波エフェクトの高度なパーティクル生成
        if (this.particleSystem && progress > 0.5) {
            blackHoles.forEach((bh, index) => {
                if (blackHoles[index + 1]) {
                    this.particleSystem.createAdvancedEffect('gravitational_waves', 
                        bh, blackHoles[index + 1], intensity);
                }
            });
        }

        // ★ 7. ブラックホール周辺の時空の泡エフェクト（改善された泡状パーティクル）
        if (this.particleSystem && progress > 0.2) {
            // 一定間隔で泡を生成（連続的な生成を避ける）
            const bubbleGenerationInterval = 3; // 3秒間隔
            const currentTime = Date.now() * 0.001;
            if (!this.lastBubbleTime || currentTime - this.lastBubbleTime > bubbleGenerationInterval) {
                this.particleSystem.createAdvancedEffect('spacetime_bubbles', blackHoles, intensity * 0.8);
                this.lastBubbleTime = currentTime;
            }
        }

        // ★ ブラックホール合体発生中メッセージ（共通メソッド使用）
        if (progress > 0.1 && progress < 0.8) {
            this.renderEventMessage(ctx, this.eventMessageConfigs.blackHoleMerger, progress, intensity);
        }
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
                    if (this.areCollinear(validBodies[i], validBodies[j], validBodies[k], 60)) { // ★ 30px → 60px に緩和
                        return true;
                    }
                }
            }
        }
        return false;
    }

    areCollinear(a, b, c, threshold = 60) { // ★ 30px → 60px に緩和（2倍）
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

    renderProminences(ctx, star, progress, mainAlpha, baseRadius) {
        const time = Date.now() * 0.001;

        // ★ 改善されたプロミネンス（コロナルループ） - 6本から増量
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + time * 0.3;
            const prominenceHeight = baseRadius * (3 + progress * 5) * (0.7 + 0.5 * Math.sin(time * 1.5 + i));
            const archHeight = prominenceHeight * 0.7;

            const startX = star.x + baseRadius * 1.2 * Math.cos(angle);
            const startY = star.y + baseRadius * 1.2 * Math.sin(angle);

            // アーチ型プロミネンスの描画（ベジェ曲線）
            ctx.strokeStyle = `rgba(255, 100, 0, ${mainAlpha * 0.8})`;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();

            // アーチの制御点を計算
            const controlX = star.x + (prominenceHeight * 0.6) * Math.cos(angle + Math.PI / 6);
            const controlY = star.y + (prominenceHeight * 0.6) * Math.sin(angle + Math.PI / 6);
            const endX = star.x + baseRadius * 1.2 * Math.cos(angle + Math.PI / 3);
            const endY = star.y + baseRadius * 1.2 * Math.sin(angle + Math.PI / 3);

            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            ctx.stroke();

            // プロミネンスのグロー効果
            const glowGradient = ctx.createRadialGradient(
                controlX, controlY, 0,
                controlX, controlY, 20
            );
            glowGradient.addColorStop(0, `rgba(255, 200, 0, ${mainAlpha * 0.6})`);
            glowGradient.addColorStop(1, `rgba(255, 100, 0, 0)`);

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(controlX, controlY, 20, 0, Math.PI * 2);
            ctx.fill();

            // ★ プラズマジェット効果（直線状プロミネンス）
            if (i % 2 === 0) {
                const jetLength = prominenceHeight * 1.5;
                const jetEndX = star.x + jetLength * Math.cos(angle);
                const jetEndY = star.y + jetLength * Math.sin(angle);

                const jetGradient = ctx.createLinearGradient(startX, startY, jetEndX, jetEndY);
                jetGradient.addColorStop(0, `rgba(255, 150, 0, ${mainAlpha * 0.9})`);
                jetGradient.addColorStop(0.5, `rgba(255, 100, 0, ${mainAlpha * 0.6})`);
                jetGradient.addColorStop(1, `rgba(255, 0, 0, 0)`);

                ctx.strokeStyle = jetGradient;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(jetEndX, jetEndY);
                ctx.stroke();
            }
        }
    }

    // 残りのメソッド
    renderGravitationalLensing(ctx, bodies, progress, intensity) {
        const blackHoles = bodies.filter(b => b.type === 'blackHole' && b.isValid);
        const time = Date.now() * 0.001;

        blackHoles.forEach(bh => {
            const baseMass = Math.abs(bh.mass || 30);
            const baseRadius = Math.sqrt(baseMass) * 3.5; // ★ 6 → 3.5に縮小

            // ★ 1. 多重アインシュタインリング（3層）
            for (let ring = 1; ring <= 3; ring++) {
                const ringRadius = baseRadius * ring * intensity;
                const ringAlpha = intensity * 0.8 * (1.5 - ring * 0.3);
                const pulseEffect = 1 + Math.sin(time * 2 + ring * Math.PI / 3) * 0.2;

                // メインリング
                ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`;
                ctx.lineWidth = 5 - ring;
                ctx.beginPath();
                ctx.arc(bh.x, bh.y, ringRadius * pulseEffect, 0, Math.PI * 2);
                ctx.stroke();

                // リングのグロー効果
                const glowGradient = ctx.createRadialGradient(
                    bh.x, bh.y, ringRadius * pulseEffect - 10,
                    bh.x, bh.y, ringRadius * pulseEffect + 10
                );
                glowGradient.addColorStop(0, 'transparent');
                glowGradient.addColorStop(0.5, `rgba(135, 206, 255, ${ringAlpha * 0.5})`);
                glowGradient.addColorStop(1, 'transparent');

                ctx.strokeStyle = glowGradient;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(bh.x, bh.y, ringRadius * pulseEffect, 0, Math.PI * 2);
                ctx.stroke();
            }

            // ★ 2. 光の屈曲軌道表現（16方向）
            for (let i = 0; i < 16; i++) {
                const angle = (i / 16) * Math.PI * 2;
                const distortionAngle = angle + Math.sin(time * 1.5 + i * 0.4) * 0.3;
                const pathRadius = baseRadius * 2.5 * intensity;

                // 曲がった光線の描画
                ctx.strokeStyle = `rgba(255, 255, 200, ${intensity * 0.6})`;
                ctx.lineWidth = 2;
                ctx.beginPath();

                // 光線の起点（遠方）- サイズ縮小
                const startX = bh.x + Math.cos(angle) * pathRadius * 1.5; // ★ 2 → 1.5に縮小
                const startY = bh.y + Math.sin(angle) * pathRadius * 1.5;

                // 中間点（屈曲）
                const midX = bh.x + Math.cos(distortionAngle) * pathRadius * 1.0; // ★ 1.3 → 1.0に縮小
                const midY = bh.y + Math.sin(distortionAngle) * pathRadius * 1.0;

                // 終点（観測者方向）
                const endX = bh.x + Math.cos(angle + Math.PI) * pathRadius * 1.5; // ★ 2 → 1.5に縮小
                const endY = bh.y + Math.sin(angle + Math.PI) * pathRadius * 1.5;

                ctx.moveTo(startX, startY);
                ctx.quadraticCurveTo(midX, midY, endX, endY);
                ctx.stroke();
            }

            // ★ 3. 重力場歪み効果（同心円状の時空歪み）
            for (let wave = 1; wave <= 5; wave++) {
                const waveRadius = baseRadius * wave * 0.7 * intensity;
                const waveAlpha = intensity * 0.4 * (1 - wave * 0.15);
                const distortionEffect = 1 + Math.sin(time * 3 + wave * 0.8) * 0.15;

                ctx.strokeStyle = `rgba(100, 150, 255, ${waveAlpha})`;
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(bh.x, bh.y, waveRadius * distortionEffect, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // ★ 4. 中心事象の地平線強調
            const horizonRadius = Math.sqrt(baseMass) * 2;
            const horizonGlow = ctx.createRadialGradient(
                bh.x, bh.y, 0,
                bh.x, bh.y, horizonRadius * 2
            );
            horizonGlow.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
            horizonGlow.addColorStop(0.7, `rgba(50, 50, 100, ${intensity * 0.8})`);
            horizonGlow.addColorStop(1, 'transparent');

            ctx.fillStyle = horizonGlow;
            ctx.beginPath();
            ctx.arc(bh.x, bh.y, horizonRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            // ★ 5. 背景星の歪み効果シミュレーション
            if (progress > 0.3) {
                for (let star = 0; star < 8; star++) {
                    const starAngle = (star / 8) * Math.PI * 2 + time * 0.2;
                    const starDistance = baseRadius * (2.2 + Math.sin(time + star) * 0.3); // ★ サイズ縮小

                    // 歪んだ星の位置
                    const distortion = 1 + Math.sin(time * 2 + star) * 0.3;
                    const starX = bh.x + Math.cos(starAngle) * starDistance * distortion;
                    const starY = bh.y + Math.sin(starAngle) * starDistance * distortion;

                    // 星の描画（歪み効果付き）
                    const starAlpha = intensity * 0.7 * (0.5 + 0.5 * Math.sin(time * 3 + star));
                    ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
                    ctx.beginPath();
                    ctx.arc(starX, starY, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // 星光の筋
                    ctx.strokeStyle = `rgba(255, 255, 255, ${starAlpha * 0.5})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(starX - 5, starY);
                    ctx.lineTo(starX + 5, starY);
                    ctx.moveTo(starX, starY - 5);
                    ctx.lineTo(starX, starY + 5);
                    ctx.stroke();
                }
            }

            // ★ 6. 科学的精度表示（アインシュタイン方程式）
            if (progress > 0.7) {
                ctx.font = '14px monospace';
                ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.8})`;
                ctx.fillText('R_μν - ½gμνR = 8πG/c⁴ T_μν', bh.x - 100, bh.y - baseRadius * 3);

                // レンズ方程式の表示
                ctx.font = '12px monospace';
                ctx.fillStyle = `rgba(200, 255, 200, ${intensity * 0.7})`;
                ctx.fillText(`θ_E = √(4GM/c²D)`, bh.x - 80, bh.y + baseRadius * 3.5);
            }

            // ★ 7. 高度なパーティクル効果（光子の軌道）
            if (this.particleSystem) {
                this.particleSystem.createAdvancedEffect('gravitational_lensing_photons',
                    bh.x, bh.y, baseMass, intensity);
            }
        });

        // ★ 8. 重力レンズ発生中の表示（共通メソッド使用）
        if (blackHoles.length > 0 && progress > 0.1) {
            this.renderEventMessage(ctx, this.eventMessageConfigs.gravitationalLensing, progress, intensity);
        }
    }

    renderResonanceHarmony(ctx, bodies, progress, intensity) {
        const validBodies = bodies.filter(b => b.isValid);
        const time = Date.now() * 0.001;
        const canvas = ctx.canvas;

        // ★ 1. 軌道共鳴の可視化（天体間の調和関係）
        for (let i = 0; i < validBodies.length; i++) {
            for (let j = i + 1; j < validBodies.length; j++) {
                const body1 = validBodies[i];
                const body2 = validBodies[j];
                
                // 軌道周期の推定（距離ベース）
                const distance = Math.max(10, Math.sqrt((body2.x - body1.x) ** 2 + (body2.y - body1.y) ** 2)); // ★ 最小距離10pxを保証
                const period1 = Math.sqrt(distance) * 0.1 + i * 0.2;
                const period2 = Math.sqrt(distance) * 0.1 + j * 0.2;
                
                // 共鳴比の計算（近似整数比、ゼロ除算防止）
                const ratio = period2 > 0.001 ? period1 / period2 : 1; // ★ ゼロ除算防止
                const nearestRatio = Math.round(ratio * 6) / 6; // 1/6刻みで近似
                
                // 共鳴が近い場合に強い視覚化
                const resonanceStrength = Math.max(0, 1 - Math.abs(ratio - nearestRatio) * 10);
                
                if (resonanceStrength > 0.3) {
                    // 共鳴線の描画（美しい調和曲線）
                    const lineAlpha = intensity * resonanceStrength * 0.8;
                    const resonancePhase = time * 3 * nearestRatio;
                    
                    // 中間点での波動
                    const midX = (body1.x + body2.x) / 2;
                    const midY = (body1.y + body2.y) / 2;
                    const waveAmplitude = 20 * resonanceStrength * Math.sin(resonancePhase);
                    
                    // 共鳴線のベジェ曲線
                    const controlOffset = distance * 0.1 * Math.sin(resonancePhase * 0.7);
                    const perpX = -(body2.y - body1.y) / distance * controlOffset;
                    const perpY = (body2.x - body1.x) / distance * controlOffset;
                    
                    // グラデーション色（調和音の色）
                    const hue1 = (i * 72) % 360; // 5度音程（ペンタトニック）
                    const hue2 = (j * 72) % 360;
                    const resonanceHue = (hue1 + hue2) / 2;
                    
                    const resonanceGradient = ctx.createLinearGradient(
                        body1.x, body1.y, body2.x, body2.y
                    );
                    resonanceGradient.addColorStop(0, `hsla(${hue1}, 90%, 70%, ${lineAlpha})`);
                    resonanceGradient.addColorStop(0.5, `hsla(${resonanceHue}, 100%, 80%, ${lineAlpha * 1.5})`);
                    resonanceGradient.addColorStop(1, `hsla(${hue2}, 90%, 70%, ${lineAlpha})`);
                    
                    ctx.strokeStyle = resonanceGradient;
                    ctx.lineWidth = 3 * resonanceStrength;
                    ctx.beginPath();
                    ctx.moveTo(body1.x, body1.y);
                    ctx.quadraticCurveTo(
                        midX + perpX + waveAmplitude,
                        midY + perpY + waveAmplitude,
                        body2.x, body2.y
                    );
                    ctx.stroke();
                }
            }
        }

        // ★ 2. 各天体周囲の調和波（多重オクターブ）
        validBodies.forEach((body, i) => {
            const baseMass = Math.abs(body.mass || 30);
            const baseRadius = Math.max(10, Math.sqrt(baseMass) * 3); // ★ 最小基準半径10pxを保証
            
            // 基音周波数（天体の「音程」）
            const fundamentalFreq = 0.8 + i * 0.4;
            const baseHue = (i * 72) % 360; // ペンタトニックスケール
            
            // 5つのオクターブ波（倍音列）
            for (let octave = 1; octave <= 5; octave++) {
                const frequency = fundamentalFreq * octave;
                const harmonicRadius = baseRadius * (1 + octave * 0.4);
                const amplitude = intensity * 25 / octave; // 高次倍音ほど弱く
                
                const waveRadius = Math.max(5, harmonicRadius + amplitude * Math.sin(time * frequency)); // ★ 最小半径5pxを保証
                const harmonicAlpha = intensity * 0.7 / octave;
                
                // 倍音の色相（音楽理論に基づく）
                const harmonicHue = (baseHue + octave * 30) % 360;
                
                // 波紋の描画
                ctx.strokeStyle = `hsla(${harmonicHue}, 85%, 75%, ${harmonicAlpha})`;
                ctx.lineWidth = Math.max(1, 4 - octave * 0.5);
                ctx.setLineDash([5 * octave, 5]);
                ctx.lineDashOffset = -time * 50;
                ctx.beginPath();
                ctx.arc(body.x, body.y, waveRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        });

        // ★ 3. 音符とト音記号の視覚化
        if (intensity > 0.6) {
            const noteCount = Math.min(validBodies.length, 8);
            for (let i = 0; i < noteCount; i++) {
                const body = validBodies[i];
                const notePhase = time * 2 + i * Math.PI / 4;
                const noteY = body.y - 60 - 20 * Math.sin(notePhase);
                const noteAlpha = intensity * 0.8 * (0.7 + 0.3 * Math.sin(notePhase));
                
                // 音符の描画（簡易）
                ctx.fillStyle = `rgba(255, 255, 255, ${noteAlpha})`;
                ctx.beginPath();
                ctx.arc(body.x, noteY, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // 音符の棒
                ctx.strokeStyle = `rgba(255, 255, 255, ${noteAlpha})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(body.x + 8, noteY);
                ctx.lineTo(body.x + 8, noteY - 20);
                ctx.stroke();
            }
        }

        // ★ 4. 全体的な調和フィールド（スタンディングウェーブ）
        if (progress > 0.3) {
            const fieldResolution = 60; // 格子の解像度
            ctx.globalAlpha = intensity * 0.3;
            
            for (let x = 0; x < canvas.width; x += fieldResolution) {
                for (let y = 0; y < canvas.height; y += fieldResolution) {
                    let totalHarmony = 0;
                    
                    // 各天体からの調和度を計算
                    validBodies.forEach((body, i) => {
                        const dx = x - body.x;
                        const dy = y - body.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const frequency = 0.8 + i * 0.4;
                        
                        // 波動関数
                        const wave = Math.sin(distance * 0.02 - time * frequency * 4) / (distance + 50);
                        totalHarmony += wave;
                    });
                    
                    // 調和度に基づく色彩
                    const harmonyIntensity = Math.abs(totalHarmony);
                    if (harmonyIntensity > 0.01) {
                        const harmonyHue = 120 + totalHarmony * 180; // 緑から紫
                        const harmonyAlpha = Math.min(0.6, harmonyIntensity * 5);
                        
                        ctx.fillStyle = `hsla(${harmonyHue}, 80%, 60%, ${harmonyAlpha})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }

        // ★ 5. 軌道共鳴の周期表示
        if (progress > 0.5 && validBodies.length >= 2) {
            const resonanceText = '♪ 軌道共鳴 2:3:5 ♫';
            ctx.fillStyle = `rgba(255, 255, 200, ${intensity * 0.9})`;
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.fillText(resonanceText, canvas.width / 2, canvas.height - 100);
            
            // 楽譜ライン
            for (let line = 0; line < 5; line++) {
                const lineY = canvas.height - 80 + line * 8;
                ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.6})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(canvas.width / 2 - 100, lineY);
                ctx.lineTo(canvas.width / 2 + 100, lineY);
                ctx.stroke();
            }
        }

        // ★ 共鳴ハーモニー発生中メッセージ（共通メソッド使用）
        if (progress > 0.1 && progress < 0.8) {
            this.renderEventMessage(ctx, this.eventMessageConfigs.resonanceHarmony, progress, intensity);
        }
    }

    /**
     * マルチバース現象の描画 - Ultra Rare級の段階的現実変容
     */
    renderMultiverse(ctx, bodies, progress, intensity) {
        const validBodies = bodies.filter(b => b.isValid);
        const time = Date.now() * 0.001;
        const canvas = ctx.canvas;

        // Phase 1 (0-0.3): 現実の歪み開始
        if (progress >= 0) {
            this.renderProgressiveWormhole(ctx, progress, intensity, time);
            this.renderRealityDistortion(ctx, progress, intensity, time);
        }

        // Phase 2 (0.3-0.6): 並行宇宙の侵入
        if (progress >= 0.3) {
            this.renderParallelOverlay(ctx, validBodies, progress, intensity, time);
        }

        // Phase 3 (0.6-1.0): 完全なマルチバース開放
        if (progress >= 0.6) {
            this.renderRealityBreak(ctx, progress, intensity, time);
        }

        // マルチバース現象発生中メッセージ
        if (progress > 0.1 && progress < 0.8) {
            this.renderEventMessage(ctx, this.eventMessageConfigs.multiverse, progress, intensity);
        }

        // 究極の多元宇宙数式表示
        if (progress > 0.7) {
            ctx.fillStyle = `rgba(200, 255, 255, ${intensity * 0.95})`;
            ctx.font = 'bold 22px serif';
            ctx.textAlign = 'center';
            ctx.fillText('∑∞ |Ψᵢ⟩ = ∞ × Reality', canvas.width / 2, canvas.height - 160);
            
            ctx.font = 'bold 16px serif';
            ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
            ctx.fillText('- Infinite Dimensional Multiverse -', canvas.width / 2, canvas.height - 130);
            
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = `rgba(255, 200, 100, ${intensity * 0.9})`;
            ctx.fillText('All possibilities exist simultaneously...', canvas.width / 2, canvas.height - 100);
        }
    }

    /**
     * Phase 1: プログレッシブワームホール - 段階的に成長する宇宙の扉
     */
    renderProgressiveWormhole(ctx, progress, intensity, time) {
        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Phase 1での成長率（最大30%まで）
        const phase1Progress = Math.min(progress / 0.3, 1);
        const wormholeRadius = Math.min(canvas.width, canvas.height) * 0.25 * phase1Progress;
        const wormholeAlpha = intensity * phase1Progress;
        
        if (wormholeRadius < 5) return; // 小さすぎる場合はスキップ
        
        // 深い宇宙の入口 - 段階的に色が深くなる
        const depthGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, wormholeRadius
        );
        depthGradient.addColorStop(0, `rgba(0, 0, 0, ${wormholeAlpha})`); // 完全な黒
        depthGradient.addColorStop(0.6, `rgba(20, 40, 80, ${wormholeAlpha * 0.8})`); // 深い青
        depthGradient.addColorStop(0.8, `rgba(60, 20, 120, ${wormholeAlpha * 0.6})`); // 深い紫
        depthGradient.addColorStop(1, `rgba(120, 80, 200, ${wormholeAlpha * 0.3})`); // 薄い紫
        
        ctx.fillStyle = depthGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, wormholeRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // エレガントな境界リング
        const ringGradient = ctx.createRadialGradient(
            centerX, centerY, wormholeRadius * 0.9,
            centerX, centerY, wormholeRadius * 1.1
        );
        ringGradient.addColorStop(0, `rgba(100, 200, 255, 0)`);
        ringGradient.addColorStop(0.5, `rgba(150, 150, 255, ${wormholeAlpha * 0.8})`);
        ringGradient.addColorStop(1, `rgba(200, 100, 255, 0)`);
        
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, wormholeRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内部の小宇宙群（後の段階で表示される準備）
        if (phase1Progress > 0.7) {
            this.renderMiniUniverses(ctx, centerX, centerY, wormholeRadius * 0.8, wormholeAlpha * 0.4, time);
        }
    }

    /**
     * 内部の小宇宙群
     */
    renderMiniUniverses(ctx, centerX, centerY, radius, alpha, time) {
        const universeCount = 8;
        for (let i = 0; i < universeCount; i++) {
            const angle = (i / universeCount) * Math.PI * 2 + time * 0.2;
            const distance = radius * 0.6;
            const uniX = centerX + Math.cos(angle) * distance;
            const uniY = centerY + Math.sin(angle) * distance;
            const uniRadius = 12 + Math.sin(time * 2 + i) * 4;
            
            const uniGradient = ctx.createRadialGradient(uniX, uniY, 0, uniX, uniY, uniRadius);
            const hue = (i * 45 + time * 10) % 360;
            uniGradient.addColorStop(0, `hsla(${hue}, 80%, 80%, ${alpha})`);
            uniGradient.addColorStop(1, `hsla(${hue}, 60%, 40%, 0)`);
            
            ctx.fillStyle = uniGradient;
            ctx.beginPath();
            ctx.arc(uniX, uniY, uniRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Phase 1: 現実歪みエフェクト - 微細な空間歪み
     */
    renderRealityDistortion(ctx, progress, intensity, time) {
        const canvas = ctx.canvas;
        const phase1Progress = Math.min(progress / 0.3, 1);
        const distortionAlpha = intensity * phase1Progress * 0.3;
        
        // 画面端から「他の宇宙」が透けて見える
        const edgeGradients = [
            { x: 0, y: canvas.height / 2, w: 50, h: canvas.height, dir: 'right' },
            { x: canvas.width - 50, y: canvas.height / 2, w: 50, h: canvas.height, dir: 'left' },
            { x: canvas.width / 2, y: 0, w: canvas.width, h: 50, dir: 'down' },
            { x: canvas.width / 2, y: canvas.height - 50, w: canvas.width, h: 50, dir: 'up' }
        ];
        
        edgeGradients.forEach((edge, i) => {
            const hue = (i * 90 + time * 20) % 360;
            let gradient;
            
            switch (edge.dir) {
                case 'right':
                    gradient = ctx.createLinearGradient(edge.x, edge.y, edge.x + edge.w, edge.y);
                    break;
                case 'left':
                    gradient = ctx.createLinearGradient(edge.x + edge.w, edge.y, edge.x, edge.y);
                    break;
                case 'down':
                    gradient = ctx.createLinearGradient(edge.x, edge.y, edge.x, edge.y + edge.h);
                    break;
                case 'up':
                    gradient = ctx.createLinearGradient(edge.x, edge.y + edge.h, edge.x, edge.y);
                    break;
            }
            
            gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${distortionAlpha})`);
            gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
            
            ctx.fillStyle = gradient;
            if (edge.dir === 'right' || edge.dir === 'left') {
                ctx.fillRect(edge.x, edge.y - edge.h / 2, edge.w, edge.h);
            } else {
                ctx.fillRect(edge.x - edge.w / 2, edge.y, edge.w, edge.h);
            }
        });
    }

    /**
     * Phase 2: パラレルオーバーレイ - 並行現実の重ね合わせ
     */
    renderParallelOverlay(ctx, validBodies, progress, intensity, time) {
        if (progress < 0.3) return;
        
        const phase2Progress = Math.min((progress - 0.3) / 0.3, 1);
        const overlayAlpha = intensity * phase2Progress * 0.6;
        const canvas = ctx.canvas;
        
        // ★ 1. 各天体の並行宇宙版を重ねる
        validBodies.forEach((body, i) => {
            const parallelCount = 4; // 4つの並行宇宙
            
            for (let p = 1; p <= parallelCount; p++) {
                const offsetMagnitude = 40 + p * 20;
                const offsetAngle = (p / parallelCount) * Math.PI * 2 + time * 0.3 + i * 0.5;
                
                const parallelX = body.x + Math.cos(offsetAngle) * offsetMagnitude * phase2Progress;
                const parallelY = body.y + Math.sin(offsetAngle) * offsetMagnitude * phase2Progress;
                
                // 並行宇宙での異なる物理定数
                const parallelRadius = Math.sqrt(body.mass) * 1.5 * (0.7 + p * 0.15);
                const parallelAlpha = overlayAlpha * (1 - p * 0.2);
                
                // エレガントな色彩 - 現実からの乖離度で色が変化
                const divergenceHue = (i * 60 + p * 80 + time * 15) % 360;
                const parallelGradient = ctx.createRadialGradient(
                    parallelX, parallelY, 0,
                    parallelX, parallelY, parallelRadius
                );
                parallelGradient.addColorStop(0, `hsla(${divergenceHue}, 80%, 75%, ${parallelAlpha})`);
                parallelGradient.addColorStop(0.6, `hsla(${divergenceHue}, 70%, 55%, ${parallelAlpha * 0.7})`);
                parallelGradient.addColorStop(1, `hsla(${divergenceHue}, 60%, 35%, 0)`);
                
                ctx.fillStyle = parallelGradient;
                ctx.beginPath();
                ctx.arc(parallelX, parallelY, parallelRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // 可能性の線（現実との繋がり）
                if (phase2Progress > 0.5) {
                    ctx.strokeStyle = `hsla(${divergenceHue}, 60%, 70%, ${parallelAlpha * 0.4})`;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([8, 12]);
                    ctx.lineDashOffset = -time * 30;
                    ctx.beginPath();
                    ctx.moveTo(body.x, body.y);
                    ctx.lineTo(parallelX, parallelY);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        });
        
        // ★ 2. 次元境界の波紋効果
        this.renderDimensionalRipples(ctx, phase2Progress, overlayAlpha, time, canvas);
        
        // ★ 3. 並行宇宙からのゴースト軌道
        this.renderGhostOrbits(ctx, validBodies, phase2Progress, overlayAlpha, time);
        
        // ★ 4. 現実歪み格子
        this.renderRealityGrid(ctx, phase2Progress, overlayAlpha, time, canvas);
        
        // ★ 5. 量子もつれ効果
        this.renderQuantumEntanglement(ctx, validBodies, phase2Progress, overlayAlpha, time);
    }

    /**
     * 次元境界の波紋効果
     */
    renderDimensionalRipples(ctx, progress, alpha, time, canvas) {
        const rippleCount = 8;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let i = 0; i < rippleCount; i++) {
            const ripplePhase = time * 2 + i * Math.PI / 4;
            const rippleRadius = 100 + i * 60 + Math.sin(ripplePhase) * 40;
            const rippleAlpha = alpha * 0.4 * (1 - i / rippleCount) * Math.abs(Math.sin(ripplePhase * 0.5));
            
            if (rippleAlpha > 0.05) {
                // 波紋の色（異次元の周波数）
                const rippleHue = (i * 45 + time * 20) % 360;
                
                // 波紋のグラデーション
                const rippleGradient = ctx.createRadialGradient(
                    centerX, centerY, rippleRadius * 0.9,
                    centerX, centerY, rippleRadius * 1.1
                );
                rippleGradient.addColorStop(0, `hsla(${rippleHue}, 80%, 60%, 0)`);
                rippleGradient.addColorStop(0.5, `hsla(${rippleHue}, 90%, 70%, ${rippleAlpha})`);
                rippleGradient.addColorStop(1, `hsla(${rippleHue}, 80%, 60%, 0)`);
                
                ctx.strokeStyle = rippleGradient;
                ctx.lineWidth = 3 + Math.sin(ripplePhase) * 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, rippleRadius * progress, 0, Math.PI * 2);
                ctx.stroke();
                
                // 波紋上の次元突破点
                const punctureCount = 6;
                for (let p = 0; p < punctureCount; p++) {
                    const punctureAngle = (p / punctureCount) * Math.PI * 2 + time * 0.5;
                    const punctureX = centerX + Math.cos(punctureAngle) * rippleRadius * progress;
                    const punctureY = centerY + Math.sin(punctureAngle) * rippleRadius * progress;
                    
                    const punctureGlow = ctx.createRadialGradient(punctureX, punctureY, 0, punctureX, punctureY, 12);
                    punctureGlow.addColorStop(0, `hsla(${rippleHue}, 100%, 90%, ${rippleAlpha * 1.5})`);
                    punctureGlow.addColorStop(1, `hsla(${rippleHue}, 80%, 40%, 0)`);
                    
                    ctx.fillStyle = punctureGlow;
                    ctx.beginPath();
                    ctx.arc(punctureX, punctureY, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * 並行宇宙からのゴースト軌道
     */
    renderGhostOrbits(ctx, validBodies, progress, alpha, time) {
        validBodies.forEach((body, i) => {
            const ghostOrbitCount = 3;
            
            for (let g = 0; g < ghostOrbitCount; g++) {
                const orbitRadius = 80 + g * 40;
                const orbitSpeed = 0.5 + g * 0.3;
                const ghostPhase = time * orbitSpeed + i * Math.PI / 3 + g * Math.PI / 2;
                
                // ゴースト軌道の透明度
                const ghostAlpha = alpha * 0.3 * (1 - g * 0.3) * progress;
                
                if (ghostAlpha > 0.05) {
                    // 軌道線の描画
                    const orbitHue = (i * 90 + g * 120 + time * 30) % 360;
                    ctx.strokeStyle = `hsla(${orbitHue}, 70%, 60%, ${ghostAlpha})`;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([15, 10]);
                    ctx.lineDashOffset = -time * 50;
                    ctx.beginPath();
                    ctx.arc(body.x, body.y, orbitRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                    
                    // 軌道上のゴースト天体
                    const ghostX = body.x + Math.cos(ghostPhase) * orbitRadius;
                    const ghostY = body.y + Math.sin(ghostPhase) * orbitRadius;
                    
                    const ghostGradient = ctx.createRadialGradient(ghostX, ghostY, 0, ghostX, ghostY, 15);
                    ghostGradient.addColorStop(0, `hsla(${orbitHue}, 80%, 80%, ${ghostAlpha * 1.2})`);
                    ghostGradient.addColorStop(0.6, `hsla(${orbitHue}, 70%, 60%, ${ghostAlpha * 0.8})`);
                    ghostGradient.addColorStop(1, `hsla(${orbitHue}, 60%, 40%, 0)`);
                    
                    ctx.fillStyle = ghostGradient;
                    ctx.beginPath();
                    ctx.arc(ghostX, ghostY, 12 + Math.sin(ghostPhase * 3) * 3, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // ゴースト天体のトレイル
                    const trailLength = 8;
                    for (let t = 1; t <= trailLength; t++) {
                        const trailPhase = ghostPhase - t * 0.1;
                        const trailX = body.x + Math.cos(trailPhase) * orbitRadius;
                        const trailY = body.y + Math.sin(trailPhase) * orbitRadius;
                        const trailAlpha = ghostAlpha * (1 - t / trailLength);
                        
                        ctx.fillStyle = `hsla(${orbitHue}, 70%, 70%, ${trailAlpha})`;
                        ctx.beginPath();
                        ctx.arc(trailX, trailY, 4 * (1 - t / trailLength), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });
    }

    /**
     * 現実歪み格子
     */
    renderRealityGrid(ctx, progress, alpha, time, canvas) {
        if (progress < 0.4) return;
        
        const gridProgress = (progress - 0.4) / 0.6;
        const gridAlpha = alpha * gridProgress * 0.4;
        const gridSize = 80;
        const distortionMagnitude = 25 * gridProgress;
        
        ctx.strokeStyle = `rgba(100, 200, 255, ${gridAlpha})`;
        ctx.lineWidth = 1;
        
        // 歪んだ格子の描画
        for (let x = 0; x <= canvas.width; x += gridSize) {
            for (let y = 0; y <= canvas.height; y += gridSize) {
                // 多次元からの歪み影響
                const distortX = Math.sin(x * 0.008 + time * 1.5) * Math.cos(y * 0.012 + time * 2) * distortionMagnitude;
                const distortY = Math.cos(x * 0.010 + time * 1.8) * Math.sin(y * 0.006 + time * 2.5) * distortionMagnitude;
                
                const finalX = x + distortX;
                const finalY = y + distortY;
                
                // 格子点の強調
                if (Math.abs(distortX) + Math.abs(distortY) > 8) {
                    const distortIntensity = (Math.abs(distortX) + Math.abs(distortY)) / (distortionMagnitude * 2);
                    const pointHue = (distortIntensity * 180 + time * 40) % 360;
                    
                    const pointGradient = ctx.createRadialGradient(finalX, finalY, 0, finalX, finalY, 8);
                    pointGradient.addColorStop(0, `hsla(${pointHue}, 90%, 80%, ${gridAlpha * distortIntensity})`);
                    pointGradient.addColorStop(1, `hsla(${pointHue}, 70%, 50%, 0)`);
                    
                    ctx.fillStyle = pointGradient;
                    ctx.beginPath();
                    ctx.arc(finalX, finalY, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 格子線の描画（歪み考慮）
                if (x > 0) {
                    const prevDistortX = Math.sin((x - gridSize) * 0.008 + time * 1.5) * 
                                       Math.cos(y * 0.012 + time * 2) * distortionMagnitude;
                    const prevDistortY = Math.cos((x - gridSize) * 0.010 + time * 1.8) * 
                                       Math.sin(y * 0.006 + time * 2.5) * distortionMagnitude;
                    
                    ctx.beginPath();
                    ctx.moveTo(x - gridSize + prevDistortX, y + prevDistortY);
                    ctx.lineTo(finalX, finalY);
                    ctx.stroke();
                }
                
                if (y > 0) {
                    const prevDistortX = Math.sin(x * 0.008 + time * 1.5) * 
                                       Math.cos((y - gridSize) * 0.012 + time * 2) * distortionMagnitude;
                    const prevDistortY = Math.cos(x * 0.010 + time * 1.8) * 
                                       Math.sin((y - gridSize) * 0.006 + time * 2.5) * distortionMagnitude;
                    
                    ctx.beginPath();
                    ctx.moveTo(x + prevDistortX, y - gridSize + prevDistortY);
                    ctx.lineTo(finalX, finalY);
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * 量子もつれ効果
     */
    renderQuantumEntanglement(ctx, validBodies, progress, alpha, time) {
        if (validBodies.length < 2 || progress < 0.6) return;
        
        const entanglementProgress = (progress - 0.6) / 0.4;
        const entanglementAlpha = alpha * entanglementProgress * 0.5;
        
        // 天体間の量子もつれ線
        for (let i = 0; i < validBodies.length; i++) {
            for (let j = i + 1; j < validBodies.length; j++) {
                const body1 = validBodies[i];
                const body2 = validBodies[j];
                
                const distance = Math.sqrt((body2.x - body1.x) ** 2 + (body2.y - body1.y) ** 2);
                
                // 距離に応じたもつれ強度
                const entangleStrength = Math.max(0, 1 - distance / 400);
                
                if (entangleStrength > 0.1) {
                    const entangleAlpha = entanglementAlpha * entangleStrength;
                    
                    // もつれの脈動
                    const pulsePhase = time * 4 + i + j;
                    const pulseIntensity = 0.5 + 0.5 * Math.sin(pulsePhase);
                    
                    // 量子もつれ線（波状）
                    const segments = 20;
                    const entangleHue = ((i + j) * 60 + time * 25) % 360;
                    
                    ctx.strokeStyle = `hsla(${entangleHue}, 85%, 75%, ${entangleAlpha * pulseIntensity})`;
                    ctx.lineWidth = 2 + pulseIntensity;
                    ctx.beginPath();
                    
                    for (let s = 0; s <= segments; s++) {
                        const segProgress = s / segments;
                        const segX = body1.x + (body2.x - body1.x) * segProgress;
                        const segY = body1.y + (body2.y - body1.y) * segProgress;
                        
                        // 量子波動の振動
                        const waveAmplitude = 15 * entangleStrength * Math.sin(pulsePhase + segProgress * Math.PI * 4);
                        const perpX = -(body2.y - body1.y) / distance * waveAmplitude;
                        const perpY = (body2.x - body1.x) / distance * waveAmplitude;
                        
                        const finalX = segX + perpX;
                        const finalY = segY + perpY;
                        
                        if (s === 0) {
                            ctx.moveTo(finalX, finalY);
                        } else {
                            ctx.lineTo(finalX, finalY);
                        }
                    }
                    ctx.stroke();
                    
                    // もつれポイント（天体間の中点）
                    const midX = (body1.x + body2.x) / 2;
                    const midY = (body1.y + body2.y) / 2;
                    
                    const entangleGradient = ctx.createRadialGradient(midX, midY, 0, midX, midY, 20);
                    entangleGradient.addColorStop(0, `hsla(${entangleHue}, 100%, 90%, ${entangleAlpha * pulseIntensity})`);
                    entangleGradient.addColorStop(0.5, `hsla(${entangleHue}, 90%, 70%, ${entangleAlpha * pulseIntensity * 0.7})`);
                    entangleGradient.addColorStop(1, `hsla(${entangleHue}, 80%, 50%, 0)`);
                    
                    ctx.fillStyle = entangleGradient;
                    ctx.beginPath();
                    ctx.arc(midX, midY, 15 * pulseIntensity, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * Phase 3: 多次元侵食 - 異次元存在の現実世界への侵入
     */
    renderRealityBreak(ctx, progress, intensity, time) {
        if (progress < 0.6) return;
        
        const phase3Progress = Math.min((progress - 0.6) / 0.4, 1);
        const breakAlpha = intensity * phase3Progress;
        const canvas = ctx.canvas;
        
        // ★ 1. 多次元の触手・テンドリル（画面端から侵入）
        this.renderDimensionalTendrils(ctx, phase3Progress, breakAlpha, time, canvas);
        
        // ★ 2. 侵食エンティティ（異次元生命体の影）
        this.renderInvasiveEntities(ctx, phase3Progress, breakAlpha, time, canvas);
        
        // ★ 3. 現実の浸食パターン（ヒビ割れのような拡散）
        this.renderRealityErosion(ctx, phase3Progress, breakAlpha, time, canvas);
        
        // ★ 4. 次元の目（監視している異次元の視線）
        this.renderDimensionalEyes(ctx, phase3Progress, breakAlpha, time, canvas);
    }

    /**
     * 多次元触手の侵入エフェクト
     */
    renderDimensionalTendrils(ctx, progress, alpha, time, canvas) {
        const tendrilCount = 12;
        
        for (let i = 0; i < tendrilCount; i++) {
            // 画面の各辺から侵入
            const edge = i % 4; // 0=上, 1=右, 2=下, 3=左
            let startX, startY, targetX, targetY;
            
            const edgeProgress = (i / tendrilCount) + time * 0.1;
            
            switch (edge) {
                case 0: // 上から
                    startX = (edgeProgress % 1) * canvas.width;
                    startY = 0;
                    targetX = canvas.width / 2 + Math.sin(time + i) * 200;
                    targetY = canvas.height * 0.4;
                    break;
                case 1: // 右から
                    startX = canvas.width;
                    startY = (edgeProgress % 1) * canvas.height;
                    targetX = canvas.width * 0.6;
                    targetY = canvas.height / 2 + Math.cos(time + i) * 200;
                    break;
                case 2: // 下から
                    startX = canvas.width - (edgeProgress % 1) * canvas.width;
                    startY = canvas.height;
                    targetX = canvas.width / 2 + Math.sin(time + i + Math.PI) * 200;
                    targetY = canvas.height * 0.6;
                    break;
                case 3: // 左から
                    startX = 0;
                    startY = canvas.height - (edgeProgress % 1) * canvas.height;
                    targetX = canvas.width * 0.4;
                    targetY = canvas.height / 2 + Math.cos(time + i + Math.PI) * 200;
                    break;
            }
            
            // 触手の成長進行度
            const tendrilProgress = Math.min(progress * 1.5, 1);
            const currentTargetX = startX + (targetX - startX) * tendrilProgress;
            const currentTargetY = startY + (targetY - startY) * tendrilProgress;
            
            // 触手の蠢き
            const wiggleAmplitude = 30 + Math.sin(time * 3 + i) * 15;
            const segmentCount = 8;
            
            // 触手の太さ（根元から先端へ細くなる）
            const baseWidth = 12 + Math.sin(time * 2 + i) * 4;
            
            // 不気味な色彩（多次元の特徴）
            const hue = (i * 30 + time * 50) % 360;
            const tendrilAlpha = alpha * 0.8 * (0.6 + 0.4 * Math.sin(time * 4 + i));
            
            ctx.strokeStyle = `hsla(${hue}, 70%, 40%, ${tendrilAlpha})`;
            ctx.lineWidth = baseWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // 触手の描画（うねうねと蠢く）
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            for (let seg = 1; seg <= segmentCount; seg++) {
                const segProgress = seg / segmentCount;
                const segX = startX + (currentTargetX - startX) * segProgress;
                const segY = startY + (currentTargetY - startY) * segProgress;
                
                // うねり効果
                const wiggleX = segX + Math.sin(time * 5 + i + seg * 0.8) * wiggleAmplitude * segProgress;
                const wiggleY = segY + Math.cos(time * 3 + i + seg * 1.2) * wiggleAmplitude * segProgress;
                
                ctx.lineTo(wiggleX, wiggleY);
                
                // 線の太さを徐々に変更
                ctx.lineWidth = baseWidth * (1 - segProgress * 0.7);
            }
            ctx.stroke();
            
            // 触手の先端エフェクト（侵食点）
            if (tendrilProgress > 0.5) {
                const tipAlpha = tendrilAlpha * (tendrilProgress - 0.5) * 2;
                const tipGradient = ctx.createRadialGradient(
                    currentTargetX, currentTargetY, 0,
                    currentTargetX, currentTargetY, 25
                );
                tipGradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${tipAlpha})`);
                tipGradient.addColorStop(0.5, `hsla(${hue}, 80%, 30%, ${tipAlpha * 0.7})`);
                tipGradient.addColorStop(1, `hsla(${hue}, 60%, 20%, 0)`);
                
                ctx.fillStyle = tipGradient;
                ctx.beginPath();
                ctx.arc(currentTargetX, currentTargetY, 25, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * 侵食エンティティ（異次元生命体の影）
     */
    renderInvasiveEntities(ctx, progress, alpha, time, canvas) {
        const entityCount = 6;
        
        for (let i = 0; i < entityCount; i++) {
            const entityPhase = time * 0.3 + i * Math.PI / 3;
            const entityProgress = Math.max(0, (progress - 0.3) / 0.7);
            
            // エンティティの位置（画面外から侵入）
            const angle = (i / entityCount) * Math.PI * 2 + time * 0.1;
            const distance = Math.min(canvas.width, canvas.height) * 0.6;
            const baseX = canvas.width / 2 + Math.cos(angle) * distance;
            const baseY = canvas.height / 2 + Math.sin(angle) * distance;
            
            // 侵入の進行度
            const invasionX = canvas.width / 2 + (baseX - canvas.width / 2) * (1 - entityProgress);
            const invasionY = canvas.height / 2 + (baseY - canvas.height / 2) * (1 - entityProgress);
            
            // エンティティのサイズと形状
            const entitySize = 40 + Math.sin(entityPhase) * 20;
            const entityAlpha = alpha * entityProgress * 0.6;
            
            if (entityAlpha > 0.05) {
                // 不定形な影の描画
                const shadowGradient = ctx.createRadialGradient(
                    invasionX, invasionY, 0,
                    invasionX, invasionY, entitySize * 2
                );
                
                const shadowHue = (i * 60 + time * 30) % 360;
                shadowGradient.addColorStop(0, `hsla(${shadowHue}, 50%, 20%, ${entityAlpha})`);
                shadowGradient.addColorStop(0.3, `hsla(${shadowHue}, 60%, 15%, ${entityAlpha * 0.8})`);
                shadowGradient.addColorStop(0.7, `hsla(${shadowHue}, 70%, 10%, ${entityAlpha * 0.4})`);
                shadowGradient.addColorStop(1, `hsla(${shadowHue}, 80%, 5%, 0)`);
                
                ctx.fillStyle = shadowGradient;
                ctx.beginPath();
                
                // 不定形な形状（モーフィング）
                const vertices = 8;
                for (let v = 0; v <= vertices; v++) {
                    const vAngle = (v / vertices) * Math.PI * 2;
                    const morphing = 1 + Math.sin(entityPhase + v * 0.5) * 0.4;
                    const vX = invasionX + Math.cos(vAngle) * entitySize * morphing;
                    const vY = invasionY + Math.sin(vAngle) * entitySize * morphing;
                    
                    if (v === 0) {
                        ctx.moveTo(vX, vY);
                    } else {
                        ctx.lineTo(vX, vY);
                    }
                }
                ctx.fill();
                
                // エンティティの「触手」
                for (let t = 0; t < 4; t++) {
                    const tentacleAngle = angle + t * Math.PI / 2 + Math.sin(time * 2 + i + t) * 0.3;
                    const tentacleLength = entitySize * (1.5 + Math.sin(time * 3 + t) * 0.5);
                    const tentacleX = invasionX + Math.cos(tentacleAngle) * tentacleLength;
                    const tentacleY = invasionY + Math.sin(tentacleAngle) * tentacleLength;
                    
                    ctx.strokeStyle = `hsla(${shadowHue}, 80%, 30%, ${entityAlpha * 0.6})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(invasionX, invasionY);
                    ctx.lineTo(tentacleX, tentacleY);
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * 現実浸食パターン（ヒビ割れ拡散）
     */
    renderRealityErosion(ctx, progress, alpha, time, canvas) {
        const erosionProgress = Math.max(0, (progress - 0.5) / 0.5);
        const erosionAlpha = alpha * erosionProgress * 0.7;
        
        if (erosionAlpha > 0.05) {
            // 中心から放射状にヒビが拡散
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const crackCount = 16;
            
            for (let i = 0; i < crackCount; i++) {
                const crackAngle = (i / crackCount) * Math.PI * 2 + Math.sin(time + i) * 0.2;
                const crackLength = Math.min(canvas.width, canvas.height) * 0.7 * erosionProgress;
                
                // ヒビの不規則性
                const segments = 12;
                ctx.strokeStyle = `rgba(0, 0, 0, ${erosionAlpha})`;
                ctx.lineWidth = 2 + Math.sin(time * 2 + i) * 1;
                ctx.lineCap = 'round';
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                
                for (let seg = 1; seg <= segments; seg++) {
                    const segProgress = seg / segments;
                    const segLength = crackLength * segProgress;
                    
                    // ヒビの蛇行
                    const deviation = Math.sin(time * 3 + i + seg) * 15 * segProgress;
                    const segX = centerX + Math.cos(crackAngle + deviation * 0.01) * segLength;
                    const segY = centerY + Math.sin(crackAngle + deviation * 0.01) * segLength;
                    
                    ctx.lineTo(segX, segY);
                }
                ctx.stroke();
                
                // ヒビの周囲に異次元からの「漏れ」
                for (let leak = 0; leak < 3; leak++) {
                    const leakProgress = (leak + 1) / 4;
                    const leakX = centerX + Math.cos(crackAngle) * crackLength * leakProgress;
                    const leakY = centerY + Math.sin(crackAngle) * crackLength * leakProgress;
                    
                    const leakRadius = 8 + Math.sin(time * 4 + i + leak) * 4;
                    const leakHue = (i * 20 + leak * 120 + time * 40) % 360;
                    
                    const leakGradient = ctx.createRadialGradient(leakX, leakY, 0, leakX, leakY, leakRadius);
                    leakGradient.addColorStop(0, `hsla(${leakHue}, 80%, 60%, ${erosionAlpha * 0.8})`);
                    leakGradient.addColorStop(1, `hsla(${leakHue}, 60%, 30%, 0)`);
                    
                    ctx.fillStyle = leakGradient;
                    ctx.beginPath();
                    ctx.arc(leakX, leakY, leakRadius, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    /**
     * 次元の目（監視する異次元の視線）
     */
    renderDimensionalEyes(ctx, progress, alpha, time, canvas) {
        const eyeProgress = Math.max(0, (progress - 0.6) / 0.4);
        const eyeAlpha = alpha * eyeProgress;
        
        if (eyeAlpha > 0.05) {
            const eyeCount = 4;
            
            for (let i = 0; i < eyeCount; i++) {
                const eyePhase = time * 0.5 + i * Math.PI / 2;
                
                // 目の位置（四隅に配置）
                const cornerX = i % 2 === 0 ? canvas.width * 0.1 : canvas.width * 0.9;
                const cornerY = i < 2 ? canvas.height * 0.1 : canvas.height * 0.9;
                
                // 瞬きエフェクト
                const blinkCycle = Math.sin(time * 1.5 + i * 0.7);
                const isBlinking = blinkCycle > 0.8;
                const eyeOpenness = isBlinking ? 0.2 : 1.0;
                
                // 目の外側（虹彩）
                const irisRadius = 25 * eyeProgress;
                const irisGradient = ctx.createRadialGradient(cornerX, cornerY, 0, cornerX, cornerY, irisRadius);
                irisGradient.addColorStop(0, `rgba(255, 50, 50, ${eyeAlpha * 0.9})`);
                irisGradient.addColorStop(0.6, `rgba(150, 0, 150, ${eyeAlpha * 0.7})`);
                irisGradient.addColorStop(1, `rgba(50, 0, 100, ${eyeAlpha * 0.3})`);
                
                ctx.fillStyle = irisGradient;
                ctx.beginPath();
                ctx.ellipse(cornerX, cornerY, irisRadius, irisRadius * eyeOpenness, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 瞳孔（プレイヤーを見つめる）
                if (eyeOpenness > 0.3) {
                    const pupilRadius = irisRadius * 0.4;
                    ctx.fillStyle = `rgba(0, 0, 0, ${eyeAlpha})`;
                    ctx.beginPath();
                    ctx.ellipse(cornerX, cornerY, pupilRadius, pupilRadius * eyeOpenness, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // 視線の光
                    const gazeGradient = ctx.createRadialGradient(cornerX, cornerY, 0, cornerX, cornerY, pupilRadius * 2);
                    gazeGradient.addColorStop(0, `rgba(255, 255, 255, ${eyeAlpha * 0.8})`);
                    gazeGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                    
                    ctx.fillStyle = gazeGradient;
                    ctx.beginPath();
                    ctx.arc(cornerX, cornerY, pupilRadius * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // 目の周囲のオーラ
                for (let aura = 0; aura < 3; aura++) {
                    const auraRadius = irisRadius * (1.5 + aura * 0.5);
                    const auraAlpha = eyeAlpha * 0.2 * (1 - aura * 0.3) * Math.abs(Math.sin(time * 2 + i + aura));
                    
                    ctx.strokeStyle = `rgba(200, 100, 255, ${auraAlpha})`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(cornerX, cornerY, auraRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
    }



    startEventEffect(event, bodies, ctx, canvas) {
        // イベント開始時の特殊効果
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
            resonanceHarmony: '共鳴ハーモニー',
            multiverse: 'マルチバース現象'
        };
        return names[eventName] || eventName;
    }

    getEventStats() {
        return { ...this.eventStats };
    }

    getEventHistory() {
        return [...this.eventHistory];
    }

    /**
     * 開発者モード用：特殊イベントを強制発生
     */
    triggerEvent(eventType, bodies, particleSystem, ctx, canvas) {

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
                'multiverse': {
                    name: 'multiverse',
                    rarity: 'ultra_rare',
                    duration: 35,
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
        // 最も質量の大きい恒星を特定
        const star = bodies.reduce((max, body) => {
            if (!body.isValid) return max;

            // 恒星の判定条件を拡張
            const isStar = body.type === 'star' ||
                (body.type === 'normal' && body.mass >= 15) ||
                body.stellarClass;

            return isStar && body.mass > max.mass ? body : max;
        }, { mass: 0 });

        if (star.mass > 0) {
            // プラズマエフェクト
            if (particleSystem) {
                // 恒星風パーティクル
                particleSystem.createAdvancedEffect('stellar_wind', star, 2.0);

                // プラズマジェットエフェクト
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const distance = star.radius * 3;
                    const targetX = star.x + distance * Math.cos(angle);
                    const targetY = star.y + distance * Math.sin(angle);

                    setTimeout(() => {
                        particleSystem.createAdvancedEffect('plasma_trail',
                            star,
                            { x: targetX, y: targetY },
                            1.2);
                    }, i * 300);
                }

                // コロナルマスエジェクションエフェクト
                for (let wave = 0; wave < 4; wave++) {
                    setTimeout(() => {
                        for (let i = 0; i < 25; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const distance = star.radius * (2 + wave * 1.5);
                            const x = star.x + Math.cos(angle) * distance;
                            const y = star.y + Math.sin(angle) * distance;
                            particleSystem.createAdvancedEffect('energy_burst', x, y, 1.0);
                        }
                    }, wave * 1000);
                }
            }

            this.addEventToHistory('solar_flare', '太陽フレア');
        }
    }

    /**
     * ホーキング輻射の強制発生
     */
    triggerHawkingRadiation(bodies, particleSystem, ctx, canvas) {
        // ブラックホールを探す
        const blackHole = bodies.find(body => body.isValid && body.type === 'blackHole');

        if (blackHole) {
            // 量子エフェクト
            if (particleSystem) {
                // 中心爆発エフェクト
                for (let i = 0; i < 50; i++) {
                    const angle = (i / 50) * Math.PI * 2;
                    const distance = blackHole.radius * (1.5 + Math.random() * 2);
                    const x = blackHole.x + Math.cos(angle) * distance;
                    const y = blackHole.y + Math.sin(angle) * distance;
                    particleSystem.createAdvancedEffect('energy_burst', x, y, 0.8);
                }

                // 量子泡ワームホールエフェクト
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        particleSystem.createAdvancedEffect('wormhole',
                            blackHole.x + (Math.random() - 0.5) * blackHole.radius * 4,
                            blackHole.y + (Math.random() - 0.5) * blackHole.radius * 4,
                            0.6);
                    }, i * 1000);
                }

                // 量子フィールド波動エフェクト
                for (let wave = 0; wave < 3; wave++) {
                    setTimeout(() => {
                        for (let i = 0; i < 30; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const distance = blackHole.radius * (3 + wave * 2);
                            const x = blackHole.x + Math.cos(angle) * distance;
                            const y = blackHole.y + Math.sin(angle) * distance;
                            particleSystem.createAdvancedEffect('gravitational_waves',
                                { x: blackHole.x, y: blackHole.y },
                                { x, y }, 0.7);
                        }
                    }, wave * 2000);
                }
            }

            this.addEventToHistory('hawking_radiation', 'ホーキング輻射');
        }
    }

    /**
     * 重力レンズの強制発生
     */
    triggerGravityLens(bodies, particleSystem, ctx, canvas) {
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
     * マルチバース現象の強制発生
     */
    triggerMultiverse(bodies, particleSystem, ctx, canvas) {
        // 並行宇宙からの影響
        bodies.forEach(body => {
            if (body.isValid) {
                // 次元境界での微細な変動
                body.vx += (Math.random() - 0.5) * 0.05;
                body.vy += (Math.random() - 0.5) * 0.05;
            }
        });

        // 次元ポータルエフェクト
        if (particleSystem) {
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            
            // 次元間ポータル
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const distance = Math.min(canvas.width, canvas.height) * 0.4;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                particleSystem.createAdvancedEffect('wormhole', x, y, 0.8);
            }
            
            // 並行宇宙のエネルギー放出
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                particleSystem.createAdvancedEffect('energy_burst', x, y, 0.4);
            }
        }

        this.addEventToHistory('multiverse', 'マルチバース現象');
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
