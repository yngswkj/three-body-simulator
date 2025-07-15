'use strict';

import { mobileOptimization } from './mobile-optimization.js';
import { Particle } from './particles.js';

/**
 * モンスターストライク風の天体射出システム
 */
export class BodyLauncher {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        
        // 射出状態管理
        this.isLaunching = false;
        this.launchingBody = null;
        this.launchStartPos = { x: 0, y: 0 };
        this.currentDragPos = { x: 0, y: 0 };
        this.launchVector = { x: 0, y: 0 };
        
        // ★ 追加：複数天体の射出設定管理
        this.queuedLaunches = new Map(); // 天体ID -> 射出設定のマップ
        this.nextLaunchId = 0;
        
        // 射出設定
        this.maxLaunchPower = 50; // 最大射出力（15→50に増加）
        this.minLaunchPower = 2;  // 最小射出力（1→2に増加）
        this.maxDragDistance = 200; // 最大ドラッグ距離（150→200に増加）
        this.powerScale = 0.8; // 力の倍率調整（0.3→0.8に増加）
        
        // 視覚設定
        this.trajectoryPoints = 20; // 軌道予測点数
        this.trajectorySteps = 8;   // 軌道計算ステップ
        
        // モバイル対応
        this.isMobile = mobileOptimization.isMobile;
        this.touchSensitivity = this.isMobile ? 1.5 : 1.0; // モバイルでより高感度に
        
        console.log('🎯 天体射出システムを初期化しました');
    }
    
    /**
     * 天体にIDを設定（まだない場合）
     */
    ensureBodyId(body) {
        if (!body.launchId) {
            body.launchId = this.nextLaunchId++;
        }
        return body.launchId;
    }
    
    /**
     * 天体射出の開始
     */
    startLaunch(x, y, body) {
        if (this.isLaunching) {
            // 既に射出中の場合は、現在の射出を保存してから新しい射出を開始
            this.saveCurrentLaunch();
        }
        
        this.isLaunching = true;
        this.launchingBody = body;
        this.launchStartPos = { x: body.x, y: body.y };
        this.currentDragPos = { x, y };
        
        // 天体IDを確保
        this.ensureBodyId(body);
        
        // 射出中は天体の物理演算を停止
        if (body) {
            body.vx = 0;
            body.vy = 0;
            body.isLaunching = true;
        }
        
        console.log(`🎯 射出開始: ${body.getTypeNameJapanese()} at (${x}, ${y})`);
        return true;
    }
    
    /**
     * ドラッグ中の更新
     */
    updateDrag(x, y) {
        if (!this.isLaunching || !this.launchingBody) return;
        
        this.currentDragPos = { x, y };
        
        // 射出ベクトルの計算
        const dx = this.launchStartPos.x - x;
        const dy = this.launchStartPos.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 最大距離制限
        const clampedDistance = Math.min(distance, this.maxDragDistance);
        
        if (distance > 0) {
            const normalizedDx = (dx / distance) * clampedDistance;
            const normalizedDy = (dy / distance) * clampedDistance;
            
            // タッチ感度を適用
            this.launchVector = {
                x: normalizedDx * this.touchSensitivity,
                y: normalizedDy * this.touchSensitivity
            };
        } else {
            this.launchVector = { x: 0, y: 0 };
        }
    }
    
    /**
     * 現在の射出設定を保存
     */
    saveCurrentLaunch() {
        if (!this.isLaunching || !this.launchingBody) return;
        
        const power = this.calculateLaunchPower();
        if (power > this.minLaunchPower) {
            const bodyId = this.ensureBodyId(this.launchingBody);
            
            // 射出設定を保存
            this.queuedLaunches.set(bodyId, {
                body: this.launchingBody,
                launchVector: { ...this.launchVector },
                power: power,
                startPos: { ...this.launchStartPos }
            });
            
            console.log(`💾 射出設定保存: ${this.launchingBody.getTypeNameJapanese()} - 力=${power.toFixed(1)}`);
        }
    }
    
    /**
     * 射出の実行（現在の射出 + 保存された射出）
     */
    executeLaunch() {
        // 現在の射出を保存
        if (this.isLaunching && this.launchingBody) {
            this.saveCurrentLaunch();
        }
        
        // すべての保存された射出を実行
        let executedCount = 0;
        this.queuedLaunches.forEach((launchData, bodyId) => {
            const { body, launchVector, power } = launchData;
            
            if (power > this.minLaunchPower) {
                // 射出力を速度に変換
                const launchVx = (launchVector.x / this.maxDragDistance) * this.maxLaunchPower * this.powerScale;
                const launchVy = (launchVector.y / this.maxDragDistance) * this.maxLaunchPower * this.powerScale;
                
                // 天体に速度を設定
                body.vx = launchVx;
                body.vy = launchVy;
                
                // 軌跡をクリア（新しい軌道用）
                body.trail = [];
                
                console.log(`🚀 射出実行: ${body.getTypeNameJapanese()} - 力=${power.toFixed(1)}, 速度=(${launchVx.toFixed(2)}, ${launchVy.toFixed(2)})`);
                
                // 射出エフェクトを生成
                this.createLaunchEffectForBody(body, power);
                executedCount++;
            }
        });
        
        console.log(`🎯 合計${executedCount}個の天体を射出しました`);
        
        // すべての状態をリセット
        this.resetAllLaunches();
        return executedCount > 0;
    }
    
    /**
     * 射出のキャンセル
     */
    cancelLaunch() {
        if (this.launchingBody) {
            this.launchingBody.isLaunching = false;
        }
        this.resetLaunch();
        console.log('🎯 現在の射出をキャンセルしました');
    }
    
    /**
     * 全射出設定のキャンセル
     */
    cancelAllLaunches() {
        this.resetAllLaunches();
        console.log('🎯 すべての射出設定をキャンセルしました');
    }
    
    /**
     * 射出状態のリセット（現在の射出のみ）
     */
    resetLaunch() {
        if (this.launchingBody) {
            this.launchingBody.isLaunching = false;
        }
        
        this.isLaunching = false;
        this.launchingBody = null;
        this.launchVector = { x: 0, y: 0 };
    }
    
    /**
     * すべての射出状態のリセット
     */
    resetAllLaunches() {
        // 保存された射出設定の天体フラグをクリア
        this.queuedLaunches.forEach((launchData) => {
            if (launchData.body) {
                launchData.body.isLaunching = false;
            }
        });
        
        // すべてクリア
        this.queuedLaunches.clear();
        this.resetLaunch();
    }
    
    /**
     * 射出力の計算
     */
    calculateLaunchPower() {
        const distance = Math.sqrt(
            this.launchVector.x * this.launchVector.x + 
            this.launchVector.y * this.launchVector.y
        );
        return Math.min(distance / this.maxDragDistance * this.maxLaunchPower, this.maxLaunchPower);
    }
    
    /**
     * 軌道予測の計算
     */
    calculateTrajectory(bodies) {
        if (!this.isLaunching || !this.launchingBody) return [];
        
        const power = this.calculateLaunchPower();
        if (power < this.minLaunchPower) return [];
        
        // 初期速度の計算
        const initialVx = (this.launchVector.x / this.maxDragDistance) * this.maxLaunchPower * this.powerScale;
        const initialVy = (this.launchVector.y / this.maxDragDistance) * this.maxLaunchPower * this.powerScale;
        
        // 予測軌道の計算
        const trajectory = [];
        const timeStep = 0.1; // 予測の時間ステップ
        const maxPredictionTime = 3.0; // 最大予測時間（秒）
        
        // 仮想天体で軌道計算
        const virtualBody = {
            x: this.launchingBody.x,
            y: this.launchingBody.y,
            vx: initialVx,
            vy: initialVy,
            mass: this.launchingBody.mass
        };
        
        // 他の天体（射出中の天体以外）
        const otherBodies = bodies.filter(b => b !== this.launchingBody && b.isValid);
        
        for (let t = 0; t < maxPredictionTime; t += timeStep) {
            // 重力の影響を計算
            let fx = 0, fy = 0;
            const G = 150 * 50; // 重力定数（シミュレーションと同じ）
            
            otherBodies.forEach(otherBody => {
                const dx = otherBody.x - virtualBody.x;
                const dy = otherBody.y - virtualBody.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq + 100); // ソフトニング
                
                let effectiveG = G;
                if (otherBody.isBlackHole) {
                    effectiveG *= 3; // ブラックホールの重力強化
                }
                
                const F = effectiveG * virtualBody.mass * otherBody.mass / (dist * dist);
                fx += F * dx / dist;
                fy += F * dy / dist;
            });
            
            // 速度と位置の更新
            virtualBody.vx += (fx / virtualBody.mass) * timeStep;
            virtualBody.vy += (fy / virtualBody.mass) * timeStep;
            virtualBody.x += virtualBody.vx * timeStep;
            virtualBody.y += virtualBody.vy * timeStep;
            
            // 軌道点を記録（適度に間引き）
            if (trajectory.length % this.trajectorySteps === 0) {
                trajectory.push({
                    x: virtualBody.x,
                    y: virtualBody.y,
                    t: t
                });
            }
            
            // 画面外に出たら予測終了
            if (virtualBody.x < -100 || virtualBody.x > this.canvas.width + 100 ||
                virtualBody.y < -100 || virtualBody.y > this.canvas.height + 100) {
                break;
            }
            
            // 他の天体との衝突チェック（簡略版）
            const collision = otherBodies.some(otherBody => {
                const dx = otherBody.x - virtualBody.x;
                const dy = otherBody.y - virtualBody.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const collisionRadius = Math.sqrt(otherBody.mass) * 1.5 + Math.sqrt(virtualBody.mass) * 1.5;
                return distance < collisionRadius;
            });
            
            if (collision) break;
        }
        
        return trajectory.slice(0, this.trajectoryPoints);
    }
    
    /**
     * 射出システムの描画
     */
    render(bodies) {
        const ctx = this.ctx;
        
        // ★ 修正：未設定の天体には常に矢印エフェクトを表示
        this.renderUnsetBodyArrows(bodies);
        
        // 保存された射出設定を描画
        this.renderQueuedLaunches();
        
        // 射出中の場合は通常の射出UI
        if (this.isLaunching && this.launchingBody) {
            // 射出線の描画
            this.renderLaunchLine();
            
            // 射出力インジケーターの描画
            this.renderPowerIndicator();
            
            // 軌道予測の描画
            this.renderTrajectoryPrediction(bodies);
            
            // 射出中の天体のハイライト
            this.renderLaunchingBodyHighlight();
        }
    }
    
    /**
     * 保存された射出設定の描画
     */
    renderQueuedLaunches() {
        const ctx = this.ctx;
        
        this.queuedLaunches.forEach((launchData, bodyId) => {
            const { body, launchVector, power, startPos } = launchData;
            
            if (!body || !body.isValid) return;
            
            // 保存された射出線を描画（少し透明度を下げて）
            const endX = startPos.x - launchVector.x;
            const endY = startPos.y - launchVector.y;
            
            // 射出線の色を力に応じて変化（保存版）
            const colorIntensity = Math.min(power / this.maxLaunchPower, 1);
            const red = Math.floor(255 * colorIntensity);
            const green = Math.floor(255 * (1 - colorIntensity));
            
            ctx.strokeStyle = `rgba(${red}, ${green}, 50, 0.6)`;
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.setLineDash([]);
            
            // 保存された天体のマーク（アニメーション付き）
            const radius = Math.sqrt(body.mass) * 1.5;
            const time = Date.now() * 0.003;
            const pulseScale = 1 + 0.2 * Math.sin(time * 4 + bodyId);
            
            // 二重の輪でマーク
            ctx.strokeStyle = `rgba(255, 200, 0, 0.9)`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(body.x, body.y, radius + 5 * pulseScale, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.strokeStyle = `rgba(255, 150, 0, 0.6)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(body.x, body.y, radius + 8 * pulseScale, 0, Math.PI * 2);
            ctx.stroke();
            
            // パワー数値表示（背景付き）
            const textY = body.y - radius - 12;
            const powerText = Math.floor(power).toString();
            
            // 背景円
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(body.x, textY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // 数値
            ctx.fillStyle = 'rgba(255, 255, 100, 1)';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(powerText, body.x, textY);
            
            // チェックマーク
            ctx.fillStyle = `rgba(100, 255, 100, ${0.8 + 0.2 * Math.sin(time * 3)})`;
            ctx.font = '14px Arial';
            ctx.fillText('✓', body.x + radius + 10, body.y - radius);
        });
    }
    
    /**
     * 未設定の天体にのみ矢印エフェクトを表示
     */
    renderUnsetBodyArrows(bodies) {
        const ctx = this.ctx;
        const time = Date.now() * 0.002;
        
        bodies.forEach(body => {
            if (!body.isValid) return;
            
            // ★ 修正：設定済みまたは現在射出中の天体はスキップ
            const bodyId = body.launchId;
            const isQueued = bodyId && this.queuedLaunches.has(bodyId);
            const isCurrentlyLaunching = this.launchingBody === body;
            
            if (isQueued || isCurrentlyLaunching) return;
            
            // パルス効果の矢印を描画
            const pulseScale = 1 + 0.3 * Math.sin(time * 3 + body.x * 0.01);
            const radius = Math.sqrt(body.mass) * 1.5;
            const arrowDistance = radius + 15 + 5 * Math.sin(time * 2 + body.y * 0.01);
            
            // 4方向に矢印を配置
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI / 2) + time * 0.5;
                const arrowX = body.x + Math.cos(angle) * arrowDistance;
                const arrowY = body.y + Math.sin(angle) * arrowDistance;
                
                // 矢印の描画
                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle + Math.PI);
                
                const alpha = (Math.sin(time * 4 + i) + 1) / 2 * 0.6 + 0.2;
                ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
                ctx.lineWidth = 1;
                
                const arrowSize = 8 * pulseScale;
                ctx.beginPath();
                ctx.moveTo(arrowSize, 0);
                ctx.lineTo(-arrowSize/2, arrowSize/2);
                ctx.lineTo(-arrowSize/2, -arrowSize/2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                
                ctx.restore();
            }
            
            // 天体の中央に射出可能アイコン
            const iconAlpha = (Math.sin(time * 3) + 1) / 2 * 0.4 + 0.3;
            ctx.fillStyle = `rgba(255, 200, 50, ${iconAlpha})`;
            ctx.font = `${Math.floor(radius * 0.8)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎯', body.x, body.y);
        });
    }
    
    /**
     * 全天体に矢印エフェクトを表示（停止状態）
     */
    renderAllBodyArrows(bodies) {
        // ★ 互換性のため残しておく（現在は使用されない）
        this.renderUnsetBodyArrows(bodies);
    }
    
    /**
     * 射出線の描画
     */
    renderLaunchLine() {
        const ctx = this.ctx;
        const power = this.calculateLaunchPower();
        
        if (power < this.minLaunchPower) return;
        
        // 線の色を力に応じて変化
        const colorIntensity = Math.min(power / this.maxLaunchPower, 1);
        const red = Math.floor(255 * colorIntensity);
        const green = Math.floor(255 * (1 - colorIntensity));
        
        // 射出線の描画
        ctx.strokeStyle = `rgb(${red}, ${green}, 50)`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // グラデーション効果
        const gradient = ctx.createLinearGradient(
            this.launchStartPos.x, this.launchStartPos.y,
            this.currentDragPos.x, this.currentDragPos.y
        );
        gradient.addColorStop(0, `rgba(${red}, ${green}, 50, 0.8)`);
        gradient.addColorStop(1, `rgba(${red}, ${green}, 50, 0.3)`);
        
        ctx.strokeStyle = gradient;
        
        ctx.beginPath();
        ctx.moveTo(this.launchStartPos.x, this.launchStartPos.y);
        ctx.lineTo(this.currentDragPos.x, this.currentDragPos.y);
        ctx.stroke();
        
        // 矢印の描画
        this.renderArrowHead();
    }
    
    /**
     * 矢印の描画
     */
    renderArrowHead() {
        const ctx = this.ctx;
        const arrowSize = 12;
        
        const dx = this.currentDragPos.x - this.launchStartPos.x;
        const dy = this.currentDragPos.y - this.launchStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 20) return;
        
        const angle = Math.atan2(dy, dx);
        
        ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
        ctx.beginPath();
        ctx.moveTo(this.currentDragPos.x, this.currentDragPos.y);
        ctx.lineTo(
            this.currentDragPos.x - arrowSize * Math.cos(angle - Math.PI / 6),
            this.currentDragPos.y - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            this.currentDragPos.x - arrowSize * Math.cos(angle + Math.PI / 6),
            this.currentDragPos.y - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * 射出力インジケーターの描画
     */
    renderPowerIndicator() {
        const ctx = this.ctx;
        const power = this.calculateLaunchPower();
        const powerRatio = power / this.maxLaunchPower;
        
        // パワーメーターの位置（天体の上）
        const meterX = this.launchingBody.x;
        const meterY = this.launchingBody.y - 50;
        const meterWidth = 80; // 幅を広げて高パワーを表示
        const meterHeight = 10; // 高さも少し増加
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(meterX - meterWidth/2, meterY, meterWidth, meterHeight);
        
        // パワーバー
        const powerWidth = meterWidth * powerRatio;
        const powerColor = `hsl(${120 * (1 - powerRatio)}, 100%, 60%)`;
        ctx.fillStyle = powerColor;
        ctx.fillRect(meterX - meterWidth/2, meterY, powerWidth, meterHeight);
        
        // 枠線
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(meterX - meterWidth/2, meterY, meterWidth, meterHeight);
        
        // パワー数値表示
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(power)}`, meterX, meterY - 5);
    }
    
    /**
     * 軌道予測の描画
     */
    renderTrajectoryPrediction(bodies) {
        const trajectory = this.calculateTrajectory(bodies);
        if (trajectory.length < 2) return;
        
        const ctx = this.ctx;
        
        // 軌道線の描画
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(trajectory[0].x, trajectory[0].y);
        
        for (let i = 1; i < trajectory.length; i++) {
            const alpha = 1 - (i / trajectory.length);
            ctx.globalAlpha = alpha * 0.8;
            ctx.lineTo(trajectory[i].x, trajectory[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        
        // 軌道点の描画
        trajectory.forEach((point, index) => {
            if (index % 3 === 0) { // 点を間引き
                const alpha = 1 - (index / trajectory.length);
                const radius = 3 * alpha + 1;
                
                ctx.fillStyle = `rgba(100, 200, 255, ${alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
    
    /**
     * 射出中天体のハイライト
     */
    renderLaunchingBodyHighlight() {
        const ctx = this.ctx;
        const body = this.launchingBody;
        const time = Date.now() * 0.003;
        
        // パルス効果
        const pulseScale = 1 + 0.2 * Math.sin(time * 4);
        const radius = Math.sqrt(body.mass) * 1.5 * pulseScale;
        
        // ハイライトリング
        ctx.strokeStyle = `rgba(255, 255, 100, ${0.8 * Math.sin(time * 2) + 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        
        // 内側のグロー
        const glowGradient = ctx.createRadialGradient(
            body.x, body.y, 0,
            body.x, body.y, radius + 10
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 100, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius + 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * 射出エフェクトの生成
     */
    createLaunchEffect() {
        if (!this.launchingBody) return;
        
        const body = this.launchingBody;
        const power = this.calculateLaunchPower();
        this.createLaunchEffectForBody(body, power);
    }
    
    /**
     * 指定した天体用の射出エフェクト生成
     */
    createLaunchEffectForBody(body, power) {
        if (!body) return;
        
        // パーティクルエフェクト（パーティクルシステムがある場合）
        if (body.particleSystem) {
            for (let i = 0; i < Math.floor(power * 2); i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * power * 0.5 + 2;
                
                // 適切なParticleクラスのインスタンスを作成
                const particle = new Particle(body.x, body.y, '#ffff00');
                particle.vx = Math.cos(angle) * speed;
                particle.vy = Math.sin(angle) * speed;
                particle.life = 1.0;
                particle.size = Math.random() * 4 + 2;
                
                body.particleSystem.addParticle(particle);
            }
        }
        
        console.log(`✨ 射出エフェクト生成: ${body.getTypeNameJapanese()} - 力=${power.toFixed(1)}`);
    }
    
    /**
     * 指定座標に天体があるかチェック
     */
    getBodyAt(x, y, bodies) {
        for (let body of bodies) {
            if (!body.isValid) continue;
            
            const dx = x - body.x;
            const dy = y - body.y;
            const radius = Math.sqrt(body.mass) * 1.5;
            
            if (dx * dx + dy * dy <= radius * radius) {
                return body;
            }
        }
        return null;
    }
    
    /**
     * 現在の射出状態を取得
     */
    getLaunchState() {
        return {
            isLaunching: this.isLaunching,
            launchingBody: this.launchingBody,
            power: this.calculateLaunchPower(),
            vector: { ...this.launchVector }
        };
    }
    
    /**
     * モバイル用のタッチ感度調整
     */
    adjustTouchSensitivity(sensitivity) {
        this.touchSensitivity = sensitivity;
        console.log(`📱 タッチ感度調整: ${sensitivity}`);
    }
}