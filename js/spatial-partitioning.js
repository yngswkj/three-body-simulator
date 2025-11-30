'use strict';

import { evolutionSystem } from './evolution-system.js';

/**
 * 空間分割による衝突判定最適化システム
 * O(n²)からO(n log n)への最適化を実現
 */

/**
 * 空間ハッシュグリッドクラス
 * 二次元空間を格子状に分割して近傍検索を高速化
 */
export class SpatialHashGrid {
    constructor(canvasWidth, canvasHeight, cellSize = 100) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.cellSize = cellSize;
        this.grid = new Map();

        // グリッドサイズの計算
        this.gridWidth = Math.ceil(canvasWidth / cellSize);
        this.gridHeight = Math.ceil(canvasHeight / cellSize);

        // 半径キャッシュ（計算の高速化）
        this.radiusCache = new Map();
        this.lastCacheCleanup = Date.now();

        console.log(`🔧 空間ハッシュグリッド初期化: ${this.gridWidth}x${this.gridHeight} セル, セルサイズ: ${cellSize}px`);
    }

    /**
     * グリッドをクリアして新しいフレーム用に準備
     */
    clear() {
        this.grid.clear();

        // 定期的にキャッシュをクリーンアップ（メモリ管理）
        const now = Date.now();
        if (now - this.lastCacheCleanup > 10000) { // 10秒ごと
            this.radiusCache.clear();
            this.lastCacheCleanup = now;
        }
    }

    /**
     * 座標からグリッドセルのキーを生成
     */
    getGridKey(x, y) {
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        return `${gridX},${gridY}`;
    }

    /**
     * 天体の半径を計算（キャッシュ付き）
     */
    getBodyRadius(body) {
        const massKey = Math.floor(body.mass * 10); // 小数点以下1桁まで考慮

        if (this.radiusCache.has(massKey)) {
            return this.radiusCache.get(massKey);
        }

        const radius = Math.sqrt(body.mass) * 1.5;
        this.radiusCache.set(massKey, radius);
        return radius;
    }

    /**
     * 天体をグリッドに登録
     * 天体の半径を考慮して複数のセルに跨る場合も対応
     */
    insert(body, bodyIndex) {
        if (!body.isValid) return;

        const radius = this.getBodyRadius(body);
        const cellRadius = Math.ceil(radius / this.cellSize);

        // 天体が影響するセル範囲を計算
        const centerGridX = Math.floor(body.x / this.cellSize);
        const centerGridY = Math.floor(body.y / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const gridX = centerGridX + dx;
                const gridY = centerGridY + dy;

                // グリッド範囲内チェック
                if (gridX >= 0 && gridX < this.gridWidth &&
                    gridY >= 0 && gridY < this.gridHeight) {

                    const key = `${gridX},${gridY}`;
                    if (!this.grid.has(key)) {
                        this.grid.set(key, []);
                    }
                    this.grid.get(key).push({ body, index: bodyIndex, radius });
                }
            }
        }
    }

    /**
     * 近傍の天体ペアを効率的に取得
     * 同一セル内および隣接セル内の天体のみをチェック
     */
    getNearbyPairs() {
        const pairs = [];
        const checkedPairs = new Set();

        for (const [key, cellBodies] of this.grid) {
            // 同一セル内での衝突チェック
            for (let i = 0; i < cellBodies.length; i++) {
                for (let j = i + 1; j < cellBodies.length; j++) {
                    const body1 = cellBodies[i];
                    const body2 = cellBodies[j];

                    // 重複チェックを回避
                    const pairKey = body1.index < body2.index ?
                        `${body1.index}-${body2.index}` :
                        `${body2.index}-${body1.index}`;

                    if (!checkedPairs.has(pairKey)) {
                        checkedPairs.add(pairKey);
                        pairs.push({
                            body1: body1.body,
                            body2: body2.body,
                            radius1: body1.radius,
                            radius2: body2.radius,
                            index1: body1.index,
                            index2: body2.index
                        });
                    }
                }
            }
        }

        return pairs;
    }

    /**
     * グリッドの統計情報を取得（デバッグ用）
     */
    getStats() {
        let totalBodies = 0;
        let maxBodiesPerCell = 0;
        let occupiedCells = 0;

        for (const [key, cellBodies] of this.grid) {
            if (cellBodies.length > 0) {
                occupiedCells++;
                totalBodies += cellBodies.length;
                maxBodiesPerCell = Math.max(maxBodiesPerCell, cellBodies.length);
            }
        }

        return {
            totalCells: this.gridWidth * this.gridHeight,
            occupiedCells,
            totalBodies,
            maxBodiesPerCell,
            averageBodiesPerCell: occupiedCells > 0 ? totalBodies / occupiedCells : 0,
            cacheSize: this.radiusCache.size
        };
    }
}

/**
 * 最適化された衝突検出システム
 */
export class OptimizedCollisionDetector {
    constructor(canvasWidth, canvasHeight) {
        this.spatialGrid = new SpatialHashGrid(canvasWidth, canvasHeight);
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.performanceStats = {
            averageProcessingTime: 0,
            peakProcessingTime: 0,
            totalCollisions: 0,
            pairsChecked: 0,
            pairsSkipped: 0
        };

        console.log('⚡ 最適化衝突検出システム初期化完了');
    }

    /**
     * キャンバスサイズが変更された時の対応
     */
    updateCanvasSize(width, height) {
        this.spatialGrid = new SpatialHashGrid(width, height);
        console.log(`🔧 空間グリッドサイズ更新: ${width}x${height}`);
    }

    /**
     * 最適化された衝突処理
     * O(n²) → O(n log n) への改善
     */
    handleCollisions(bodies, collisionSensitivity, createCollisionEffect, time) {
        const startTime = performance.now();

        // 空間グリッドの準備
        this.spatialGrid.clear();

        // 有効な天体をグリッドに登録
        const validBodies = [];
        for (let i = 0; i < bodies.length; i++) {
            if (bodies[i].isValid) {
                this.spatialGrid.insert(bodies[i], i);
                validBodies.push(bodies[i]);
            }
        }

        // 近傍ペアの取得と衝突チェック
        const nearbyPairs = this.spatialGrid.getNearbyPairs();
        let collisionDetected = false;

        for (const pair of nearbyPairs) {
            if (!pair.body1.isValid || !pair.body2.isValid) {
                this.performanceStats.pairsSkipped++;
                continue;
            }

            // 距離の二乗比較で平方根計算を回避
            const dx = pair.body2.x - pair.body1.x;
            const dy = pair.body2.y - pair.body1.y;
            const distanceSquared = dx * dx + dy * dy;

            const collisionDistance = (pair.radius1 + pair.radius2) * collisionSensitivity;
            const collisionDistanceSquared = collisionDistance * collisionDistance;

            this.performanceStats.pairsChecked++;

            if (distanceSquared < collisionDistanceSquared) {
                // 実際の距離が必要な場合のみ平方根計算
                const distance = Math.sqrt(distanceSquared);

                // 衝突処理を実行
                this.processCollision(pair.body1, pair.body2, distance, createCollisionEffect, time);
                collisionDetected = true;
                this.performanceStats.totalCollisions++;

                // 1フレームに1回の衝突のみ処理
                break;
            }
        }

        // パフォーマンス統計の更新
        const processingTime = performance.now() - startTime;
        this.updatePerformanceStats(processingTime);

        return collisionDetected;
    }

    /**
     * 衝突処理の実行
     */
    processCollision(body1, body2, distance, createCollisionEffect, time) {
        // 質量の大きい方を残す
        let survivor, victim;
        if (body1.mass >= body2.mass) {
            survivor = body1;
            victim = body2;
        } else {
            survivor = body2;
            victim = body1;
        }

        // 運動量保存の法則で新しい速度を計算
        const totalMass = survivor.mass + victim.mass;
        let newVx = (survivor.mass * survivor.vx + victim.mass * victim.vx) / totalMass;
        let newVy = (survivor.mass * survivor.vy + victim.mass * victim.vy) / totalMass;

        // ★ 追加：重い天体（惑星系以上）のエネルギー発散処理
        const isHeavyBody = totalMass >= 100; // 惑星系以上の質量闾値
        if (isHeavyBody) {
            // 質量比に応じたエネルギー発散係数
            const energyDissipationFactor = Math.min(0.8, 0.3 + (totalMass - 100) / 500);

            // 慣性減少：速度を大幅に減衰
            const inertiaLossFactor = 1 - energyDissipationFactor;
            newVx *= inertiaLossFactor;
            newVy *= inertiaLossFactor;

            console.log(`★ 重い天体衝突: 質量${totalMass.toFixed(1)}, エネルギー発散率${(energyDissipationFactor * 100).toFixed(1)}%`);
        }

        // 衝突による角運動量の計算
        const relativeVx = victim.vx - survivor.vx;
        const relativeVy = victim.vy - survivor.vy;
        const impactSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);

        // 衝突エネルギーの計算（運動エネルギー）
        const reducedMass = (survivor.mass * victim.mass) / totalMass;
        const totalEnergy = 0.5 * reducedMass * impactSpeed * impactSpeed;

        // 質量の重心で新しい位置を計算
        const newX = (survivor.mass * survivor.x + victim.mass * victim.x) / totalMass;
        const newY = (survivor.mass * survivor.y + victim.mass * victim.y) / totalMass;

        // 生存者の属性を更新
        survivor.x = newX;
        survivor.y = newY;
        survivor.vx = newVx;
        survivor.vy = newVy;
        survivor.mass = Math.min(totalMass, 400);
        survivor.trail = [];

        // ★ 修正：重い天体の追加エフェクトを簡略化（パフォーマンス改善）
        if (isHeavyBody && createCollisionEffect && typeof createCollisionEffect === 'function') {
            try {
                // 1回だけ、エネルギーを制限した追加エフェクト
                createCollisionEffect(
                    newX,
                    newY,
                    '#ff9500', '#ff6b6b',
                    Math.min(totalEnergy * 0.1, 1000) // エネルギーを大幅制限
                );
            } catch (error) {
                console.warn('重い天体のエネルギー発散エフェクト生成エラー:', error);
            }
        }

        // 衝突エフェクト生成（安全性確保）
        if (createCollisionEffect && typeof createCollisionEffect === 'function') {
            try {
                createCollisionEffect(newX, newY, survivor.color, victim.color, totalEnergy);
            } catch (error) {
                console.warn('衝突エフェクト生成エラー:', error);
            }
        }

        // 被害者を無効化
        victim.isValid = false;

        // 衝突時刻の記録
        survivor.lastCollisionTime = time;
        survivor.collisionImpactSpeed = impactSpeed;

        // 衝突による進化処理
        try {
            evolutionSystem.handleCollisionEvolution(survivor, impactSpeed, totalMass);
        } catch (error) {
            console.warn('Collision evolution failed:', error);
        }

        console.log(`⚡ 最適化衝突: 質量 ${survivor.mass.toFixed(1)}, 衝突速度 ${impactSpeed.toFixed(1)}`);
    }

    /**
     * パフォーマンス統計の更新
     */
    updatePerformanceStats(processingTime) {
        this.frameCount++;

        // 移動平均でのパフォーマンス計算
        const alpha = 0.1; // 平滑化係数
        this.performanceStats.averageProcessingTime =
            this.performanceStats.averageProcessingTime * (1 - alpha) + processingTime * alpha;

        this.performanceStats.peakProcessingTime =
            Math.max(this.performanceStats.peakProcessingTime, processingTime);

        // 100フレームごとに統計をログ出力
        if (this.frameCount % 100 === 0) {
            this.logPerformanceStats();
        }
    }

    /**
     * パフォーマンス統計のログ出力
     */
    logPerformanceStats() {
        const gridStats = this.spatialGrid.getStats();

        console.log('⚡ 衝突検出パフォーマンス統計:', {
            averageProcessingTime: `${this.performanceStats.averageProcessingTime.toFixed(3)}ms`,
            peakProcessingTime: `${this.performanceStats.peakProcessingTime.toFixed(3)}ms`,
            totalCollisions: this.performanceStats.totalCollisions,
            pairsChecked: this.performanceStats.pairsChecked,
            pairsSkipped: this.performanceStats.pairsSkipped,
            spatialGrid: gridStats
        });
    }

    /**
     * デバッグ情報の取得
     */
    getDebugInfo() {
        return {
            performance: this.performanceStats,
            spatialGrid: this.spatialGrid.getStats(),
            frameCount: this.frameCount
        };
    }
}