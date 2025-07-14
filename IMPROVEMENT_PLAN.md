# Three-Body Simulator 改善・ブラッシュアップ計画

## 🌟 プロジェクト概要

現在の三体問題シミュレータは、高度な物理シミュレーションと美しい視覚効果を備えた完成度の高いWebアプリケーションです。このドキュメントでは、さらなる改善とブラッシュアップのための包括的な計画を提示します。

## 📊 現在の分析結果

### 強み
- ✅ 高度な物理シミュレーション（重力計算、衝突処理、天体進化）
- ✅ 美しい視覚効果（アインシュタインリング、パーティクル、特殊イベント）
- ✅ 動的パフォーマンス最適化システム
- ✅ 直感的なユーザーインターフェース
- ✅ 教育的価値の高いコンテンツ

### 改善の余地
- 🔧 物理精度（数値積分法、相対論効果）
- 🔧 パフォーマンス（WebGL、WebWorkers）
- 🔧 機能拡張（軌道予測、データ分析）
- 🔧 視覚品質（3D描画、シェーダー効果）

---

## 🚀 Phase 1: 物理エンジン高度化 (優先度: 高)

### 1.1 数値積分法の改善

#### 現在の問題
```javascript
// 現在のオイラー法（precision.js）
vx += ax * PHYSICS.TIME_STEP;
vy += ay * PHYSICS.TIME_STEP;
x += vx * PHYSICS.TIME_STEP;
y += vy * PHYSICS.TIME_STEP;
```

#### 改善案: 4次ルンゲ・クッタ法
```javascript
class PhysicsEngine {
    static rungeKutta4(body, dt) {
        const k1 = this.calculateAcceleration(body);
        const k2 = this.calculateAcceleration({
            ...body,
            x: body.x + 0.5 * body.vx * dt,
            y: body.y + 0.5 * body.vy * dt,
            vx: body.vx + 0.5 * k1.ax * dt,
            vy: body.vy + 0.5 * k1.ay * dt
        });
        // k3, k4の計算...
        
        return {
            vx: body.vx + (dt / 6) * (k1.ax + 2*k2.ax + 2*k3.ax + k4.ax),
            vy: body.vy + (dt / 6) * (k1.ay + 2*k2.ay + 2*k3.ay + k4.ay),
            x: body.x + (dt / 6) * (k1.vx + 2*k2.vx + 2*k3.vx + k4.vx),
            y: body.y + (dt / 6) * (k1.vy + 2*k2.vy + 2*k3.vy + k4.vy)
        };
    }
}
```

### 1.2 相対論効果の追加

#### 一般相対論補正
```javascript
class RelativisticPhysics {
    static calculateGravitationalForce(body1, body2) {
        const classical = this.classicalGravity(body1, body2);
        
        // 一般相対論補正項
        const c = PHYSICS.SPEED_OF_LIGHT;
        const r = this.distance(body1, body2);
        const v = this.relativeVelocity(body1, body2);
        
        // ポスト・ニュートン補正（1PN項）
        const pn1Correction = 1 + (v*v)/(c*c) + 2*body2.mass*PHYSICS.G/(r*c*c);
        
        return {
            fx: classical.fx * pn1Correction,
            fy: classical.fy * pn1Correction
        };
    }
    
    static calculateGravitationalWaves(body1, body2) {
        // 重力波によるエネルギー損失
        const r = this.distance(body1, body2);
        const mu = (body1.mass * body2.mass) / (body1.mass + body2.mass);
        const M = body1.mass + body2.mass;
        
        const dE_dt = -32/5 * Math.pow(PHYSICS.G, 4) * Math.pow(mu, 2) * Math.pow(M, 3) / 
                      (Math.pow(PHYSICS.SPEED_OF_LIGHT, 5) * Math.pow(r, 5));
        
        return dE_dt;
    }
}
```

### 1.3 潮汐効果の実装

```javascript
class TidalEffects {
    static calculateRocheLimit(primary, secondary) {
        const rho_p = primary.density;
        const rho_s = secondary.density;
        return 2.44 * primary.radius * Math.pow(rho_p / rho_s, 1/3);
    }
    
    static checkTidalDisruption(body1, body2) {
        const distance = this.distance(body1, body2);
        const rocheLimit = this.calculateRocheLimit(body1, body2);
        
        if (distance < rocheLimit) {
            this.disruptBody(body2, body1);
        }
    }
    
    static disruptBody(victim, disruptor) {
        // 天体を複数の破片に分割
        const fragments = this.createFragments(victim, 5 + Math.floor(Math.random() * 10));
        fragments.forEach(fragment => {
            fragment.velocity = this.calculateEjectionVelocity(victim, disruptor);
            addBody(fragment);
        });
        removeBody(victim);
    }
}
```

---

## 🎨 Phase 2: 視覚効果の大幅強化 (優先度: 高)

### 2.1 WebGL 3D描画への移行

#### 現在の制約
- Canvas 2D APIによる描画制限
- CPUベースの処理による性能ボトルネック
- 3D効果の実現困難

#### WebGL実装
```javascript
class WebGLRenderer {
    constructor(canvas) {
        this.gl = canvas.getContext('webgl2');
        this.programs = new Map();
        this.buffers = new Map();
        this.textures = new Map();
        
        this.initShaders();
        this.setupBuffers();
    }
    
    initShaders() {
        // 天体描画用フラグメントシェーダー
        const starFragmentShader = `
            precision mediump float;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform float u_mass;
            uniform int u_bodyType;
            
            vec3 renderStar() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                float dist = length(uv - 0.5);
                
                // 質量に応じた色温度
                float temperature = 3000.0 + u_mass * 2000.0;
                vec3 color = blackbodyColor(temperature);
                
                // コロナ効果
                float corona = 1.0 / (1.0 + dist * 10.0);
                color += vec3(1.0, 0.8, 0.6) * corona * 0.3;
                
                return color;
            }
            
            vec3 renderBlackHole() {
                vec2 uv = gl_FragCoord.xy / u_resolution;
                vec2 center = vec2(0.5);
                
                // アインシュタインリング
                float dist = length(uv - center);
                float angle = atan(uv.y - center.y, uv.x - center.x);
                
                // 重力レンズ効果
                float lensing = u_mass / (dist * dist + 0.01);
                vec2 distorted = uv + normalize(uv - center) * lensing * 0.1;
                
                // 事象の地平面
                float eventHorizon = 0.1 * sqrt(u_mass);
                if (dist < eventHorizon) {
                    return vec3(0.0);
                }
                
                // 降着円盤
                float diskBrightness = accretionDisk(distorted, angle, u_time);
                return vec3(1.0, 0.5, 0.2) * diskBrightness;
            }
            
            void main() {
                vec3 color;
                if (u_bodyType == 0) { // 通常星
                    color = renderStar();
                } else if (u_bodyType == 5) { // ブラックホール
                    color = renderBlackHole();
                }
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        this.programs.set('body', this.createProgram(vertexShader, starFragmentShader));
    }
    
    renderBody(body) {
        const program = this.programs.get('body');
        this.gl.useProgram(program);
        
        // ユニフォーム変数の設定
        this.gl.uniform1f(this.gl.getUniformLocation(program, 'u_time'), performance.now() / 1000);
        this.gl.uniform2f(this.gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
        this.gl.uniform1f(this.gl.getUniformLocation(program, 'u_mass'), body.mass);
        this.gl.uniform1i(this.gl.getUniformLocation(program, 'u_bodyType'), body.type);
        
        // 描画実行
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
}
```

### 2.2 高度なパーティクルシステム

#### GPU加速パーティクル
```javascript
class GPUParticleSystem {
    constructor(maxParticles = 100000) {
        this.maxParticles = maxParticles;
        this.particles = new Float32Array(maxParticles * 8); // x, y, vx, vy, life, size, r, g, b, a
        this.particleBuffer = null;
        this.computeShader = null;
        
        this.initComputeShaders();
    }
    
    initComputeShaders() {
        // コンピュートシェーダーでパーティクル更新
        const computeShader = `
            #version 310 es
            layout(local_size_x = 64) in;
            
            layout(std430, binding = 0) restrict buffer ParticleBuffer {
                float particles[];
            };
            
            uniform float u_deltaTime;
            uniform vec2 u_gravity_sources[10];
            uniform float u_gravity_masses[10];
            uniform int u_num_sources;
            
            void main() {
                uint index = gl_GlobalInvocationID.x;
                if (index >= ${this.maxParticles}u) return;
                
                uint base = index * 8u;
                
                // パーティクル位置と速度の更新
                vec2 pos = vec2(particles[base], particles[base + 1u]);
                vec2 vel = vec2(particles[base + 2u], particles[base + 3u]);
                float life = particles[base + 4u];
                
                // 重力の影響を計算
                vec2 force = vec2(0.0);
                for (int i = 0; i < u_num_sources; i++) {
                    vec2 diff = u_gravity_sources[i] - pos;
                    float dist = length(diff);
                    if (dist > 0.0) {
                        force += normalize(diff) * u_gravity_masses[i] / (dist * dist);
                    }
                }
                
                vel += force * u_deltaTime;
                pos += vel * u_deltaTime;
                life -= u_deltaTime;
                
                // 更新された値を書き込み
                particles[base] = pos.x;
                particles[base + 1u] = pos.y;
                particles[base + 2u] = vel.x;
                particles[base + 3u] = vel.y;
                particles[base + 4u] = life;
            }
        `;
    }
    
    update(deltaTime, bodies) {
        // GPUでパーティクル更新を実行
        this.gl.useProgram(this.computeProgram);
        this.gl.uniform1f(this.gl.getUniformLocation(this.computeProgram, 'u_deltaTime'), deltaTime);
        
        // 重力源を設定
        const gravitySourcesArray = new Float32Array(20);
        const gravityMassesArray = new Float32Array(10);
        
        bodies.slice(0, 10).forEach((body, i) => {
            gravitySourcesArray[i * 2] = body.x;
            gravitySourcesArray[i * 2 + 1] = body.y;
            gravityMassesArray[i] = body.mass;
        });
        
        this.gl.uniform2fv(this.gl.getUniformLocation(this.computeProgram, 'u_gravity_sources'), gravitySourcesArray);
        this.gl.uniform1fv(this.gl.getUniformLocation(this.computeProgram, 'u_gravity_masses'), gravityMassesArray);
        this.gl.uniform1i(this.gl.getUniformLocation(this.computeProgram, 'u_num_sources'), Math.min(bodies.length, 10));
        
        // コンピュートシェーダー実行
        this.gl.dispatchCompute(Math.ceil(this.maxParticles / 64), 1, 1);
        this.gl.memoryBarrier(this.gl.SHADER_STORAGE_BARRIER_BIT);
    }
}
```

### 2.3 宇宙環境の追加

#### 星雲・星野背景
```javascript
class CosmicEnvironment {
    constructor() {
        this.nebulae = this.generateNebulae();
        this.starField = this.generateStarField(5000);
        this.galaxySpiral = this.generateGalaxySpiral();
    }
    
    generateNebulae() {
        const nebulae = [];
        for (let i = 0; i < 3; i++) {
            nebulae.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 200 + Math.random() * 300,
                color: this.randomNebulaColor(),
                density: 0.1 + Math.random() * 0.3,
                turbulence: Math.random() * 0.5
            });
        }
        return nebulae;
    }
    
    generateStarField(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                brightness: Math.random(),
                color: this.randomStarColor(),
                parallax: Math.random() * 0.1
            });
        }
        return stars;
    }
    
    renderNebula(ctx, nebula) {
        // パーリンノイズを使用した星雲の描画
        const gradient = ctx.createRadialGradient(
            nebula.x, nebula.y, 0,
            nebula.x, nebula.y, nebula.size
        );
        
        gradient.addColorStop(0, `hsla(${nebula.color.h}, 80%, 60%, ${nebula.density})`);
        gradient.addColorStop(0.5, `hsla(${nebula.color.h + 30}, 70%, 40%, ${nebula.density * 0.5})`);
        gradient.addColorStop(1, `hsla(${nebula.color.h + 60}, 60%, 20%, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            nebula.x - nebula.size,
            nebula.y - nebula.size,
            nebula.size * 2,
            nebula.size * 2
        );
    }
}
```

---

## ⚡ Phase 3: パフォーマンス最適化 (優先度: 中)

### 3.1 WebWorkers による並列処理

#### 物理計算の分離
```javascript
// main.js
class ParallelPhysicsEngine {
    constructor() {
        this.workers = [];
        this.numWorkers = navigator.hardwareConcurrency || 4;
        
        for (let i = 0; i < this.numWorkers; i++) {
            const worker = new Worker('js/physics-worker.js');
            worker.onmessage = this.handleWorkerMessage.bind(this);
            this.workers.push(worker);
        }
    }
    
    updateBodies(bodies) {
        const bodiesPerWorker = Math.ceil(bodies.length / this.numWorkers);
        
        for (let i = 0; i < this.numWorkers; i++) {
            const start = i * bodiesPerWorker;
            const end = Math.min(start + bodiesPerWorker, bodies.length);
            const workerBodies = bodies.slice(start, end);
            
            this.workers[i].postMessage({
                type: 'UPDATE_PHYSICS',
                bodies: workerBodies,
                allBodies: bodies,
                deltaTime: PHYSICS.TIME_STEP
            });
        }
    }
    
    handleWorkerMessage(event) {
        const { type, results } = event.data;
        
        if (type === 'PHYSICS_COMPLETE') {
            this.mergeResults(results);
        }
    }
}

// physics-worker.js
self.onmessage = function(event) {
    const { type, bodies, allBodies, deltaTime } = event.data;
    
    if (type === 'UPDATE_PHYSICS') {
        const results = [];
        
        for (const body of bodies) {
            const acceleration = calculateAcceleration(body, allBodies);
            const newState = rungeKutta4(body, acceleration, deltaTime);
            results.push(newState);
        }
        
        self.postMessage({
            type: 'PHYSICS_COMPLETE',
            results: results
        });
    }
};
```

### 3.2 レベル・オブ・ディテール（LOD）

#### 距離に応じた描画品質調整
```javascript
class LODRenderer {
    constructor() {
        this.lodLevels = [
            { distance: 0, detail: 'ultra' },     // 0-100px
            { distance: 100, detail: 'high' },    // 100-300px
            { distance: 300, detail: 'medium' },  // 300-600px
            { distance: 600, detail: 'low' },     // 600px+
            { distance: 1000, detail: 'minimal' } // 1000px+
        ];
    }
    
    getLODLevel(body, cameraPosition) {
        const distance = Math.sqrt(
            Math.pow(body.x - cameraPosition.x, 2) + 
            Math.pow(body.y - cameraPosition.y, 2)
        );
        
        for (let i = this.lodLevels.length - 1; i >= 0; i--) {
            if (distance >= this.lodLevels[i].distance) {
                return this.lodLevels[i].detail;
            }
        }
        return 'ultra';
    }
    
    renderBodyWithLOD(ctx, body, lodLevel) {
        switch (lodLevel) {
            case 'ultra':
                this.renderUltraDetail(ctx, body);
                break;
            case 'high':
                this.renderHighDetail(ctx, body);
                break;
            case 'medium':
                this.renderMediumDetail(ctx, body);
                break;
            case 'low':
                this.renderLowDetail(ctx, body);
                break;
            case 'minimal':
                this.renderMinimalDetail(ctx, body);
                break;
        }
    }
    
    renderUltraDetail(ctx, body) {
        // 完全な詳細描画（パーティクル、グラデーション、特殊効果すべて）
        drawBodyDetailed(ctx, body);
        drawParticles(ctx, body);
        drawSpecialEffects(ctx, body);
    }
    
    renderMinimalDetail(ctx, body) {
        // 最低限の描画（単色円のみ）
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
    }
}
```

### 3.3 メモリ最適化

#### オブジェクトプーリング
```javascript
class ObjectPool {
    constructor() {
        this.particles = [];
        this.bodies = [];
        this.trailPoints = [];
        this.effects = [];
        
        this.maxPoolSize = {
            particles: 10000,
            bodies: 100,
            trailPoints: 50000,
            effects: 1000
        };
    }
    
    getParticle() {
        return this.particles.pop() || new Particle();
    }
    
    returnParticle(particle) {
        if (this.particles.length < this.maxPoolSize.particles) {
            particle.reset();
            this.particles.push(particle);
        }
    }
    
    getBody() {
        return this.bodies.pop() || new Body(0, 0, 1);
    }
    
    returnBody(body) {
        if (this.bodies.length < this.maxPoolSize.bodies) {
            body.reset();
            this.bodies.push(body);
        }
    }
    
    // ガベージコレクション最適化
    optimizeMemory() {
        // 使用されていないオブジェクトを定期的にクリーンアップ
        const now = Date.now();
        
        this.particles = this.particles.filter(p => now - p.lastUsed < 60000);
        this.bodies = this.bodies.filter(b => now - b.lastUsed < 60000);
        this.trailPoints = this.trailPoints.filter(t => now - t.lastUsed < 30000);
        this.effects = this.effects.filter(e => now - e.lastUsed < 10000);
    }
}
```

---

## 📱 Phase 4: 機能拡張・ユーザー体験向上 (優先度: 中)

### 4.1 軌道予測システム

#### 将来軌道の可視化
```javascript
class OrbitPredictor {
    constructor() {
        this.predictionSteps = 1000;
        this.predictionTime = 10; // 10秒先まで予測
        this.cachedPredictions = new Map();
    }
    
    predictOrbit(bodies, targetBody, steps = this.predictionSteps) {
        const cacheKey = this.generateCacheKey(bodies, targetBody);
        
        if (this.cachedPredictions.has(cacheKey)) {
            return this.cachedPredictions.get(cacheKey);
        }
        
        // 現在の状態をコピー
        const bodiesCopy = bodies.map(body => body.clone());
        const targetIndex = bodies.indexOf(targetBody);
        
        const prediction = [];
        const dt = this.predictionTime / steps;
        
        for (let i = 0; i < steps; i++) {
            // 物理計算を実行
            PhysicsEngine.updateBodies(bodiesCopy, dt);
            
            // 対象天体の位置を記録
            prediction.push({
                x: bodiesCopy[targetIndex].x,
                y: bodiesCopy[targetIndex].y,
                time: i * dt
            });
            
            // 不安定な軌道の検出
            if (this.isOrbitUnstable(bodiesCopy[targetIndex], prediction)) {
                break;
            }
        }
        
        this.cachedPredictions.set(cacheKey, prediction);
        return prediction;
    }
    
    renderPrediction(ctx, prediction) {
        if (prediction.length < 2) return;
        
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(prediction[0].x, prediction[0].y);
        
        for (let i = 1; i < prediction.length; i++) {
            const alpha = 1 - (i / prediction.length);
            ctx.globalAlpha = alpha;
            ctx.lineTo(prediction[i].x, prediction[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }
    
    isOrbitUnstable(body, history) {
        if (history.length < 10) return false;
        
        // 急激な軌道変化を検出
        const recent = history.slice(-10);
        let totalAcceleration = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const dx = recent[i].x - recent[i-1].x;
            const dy = recent[i].y - recent[i-1].y;
            const acceleration = Math.sqrt(dx*dx + dy*dy);
            totalAcceleration += acceleration;
        }
        
        return totalAcceleration > 1000; // 閾値は調整可能
    }
}
```

### 4.2 データ分析・可視化

#### 軌道データの詳細分析
```javascript
class OrbitAnalyzer {
    constructor() {
        this.analysisHistory = [];
        this.maxHistorySize = 10000;
    }
    
    analyzeOrbit(body, timeStep) {
        const analysis = {
            timestamp: Date.now(),
            bodyId: body.id,
            position: { x: body.x, y: body.y },
            velocity: { x: body.vx, y: body.vy },
            speed: Math.sqrt(body.vx * body.vx + body.vy * body.vy),
            kineticEnergy: 0.5 * body.mass * (body.vx * body.vx + body.vy * body.vy),
            potentialEnergy: this.calculatePotentialEnergy(body),
            angularMomentum: this.calculateAngularMomentum(body),
            eccentricity: this.calculateEccentricity(body),
            period: this.estimatePeriod(body)
        };
        
        this.analysisHistory.push(analysis);
        
        if (this.analysisHistory.length > this.maxHistorySize) {
            this.analysisHistory.shift();
        }
        
        return analysis;
    }
    
    calculateEccentricity(body) {
        // 軌道離心率の計算
        const history = this.getBodyHistory(body.id, 100);
        if (history.length < 50) return null;
        
        // 重心を計算
        const centerOfMass = this.calculateCenterOfMass();
        
        // 最大・最小距離を計算
        let maxDistance = 0;
        let minDistance = Infinity;
        
        history.forEach(point => {
            const distance = Math.sqrt(
                Math.pow(point.position.x - centerOfMass.x, 2) +
                Math.pow(point.position.y - centerOfMass.y, 2)
            );
            maxDistance = Math.max(maxDistance, distance);
            minDistance = Math.min(minDistance, distance);
        });
        
        return (maxDistance - minDistance) / (maxDistance + minDistance);
    }
    
    generateReport(bodyId) {
        const history = this.getBodyHistory(bodyId);
        if (history.length === 0) return null;
        
        return {
            bodyId: bodyId,
            totalTime: (history[history.length - 1].timestamp - history[0].timestamp) / 1000,
            dataPoints: history.length,
            averageSpeed: this.calculateAverage(history.map(h => h.speed)),
            maxSpeed: Math.max(...history.map(h => h.speed)),
            minSpeed: Math.min(...history.map(h => h.speed)),
            totalDistance: this.calculateTotalDistance(history),
            averageEccentricity: this.calculateAverage(
                history.map(h => h.eccentricity).filter(e => e !== null)
            ),
            energyConservation: this.checkEnergyConservation(history),
            orbitStability: this.assessOrbitStability(history)
        };
    }
    
    exportData(format = 'json') {
        const data = {
            metadata: {
                exportTime: new Date().toISOString(),
                totalDataPoints: this.analysisHistory.length,
                timeRange: {
                    start: this.analysisHistory[0]?.timestamp,
                    end: this.analysisHistory[this.analysisHistory.length - 1]?.timestamp
                }
            },
            data: this.analysisHistory
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            default:
                return data;
        }
    }
}
```

### 4.3 シミュレーション状態の保存・読込

#### セーブ・ロード機能
```javascript
class SimulationStateManager {
    constructor() {
        this.savedStates = this.loadFromLocalStorage();
        this.maxSavedStates = 10;
    }
    
    saveState(name = null) {
        const timestamp = new Date().toISOString();
        const stateName = name || `Simulation_${timestamp}`;
        
        const state = {
            name: stateName,
            timestamp: timestamp,
            bodies: bodies.map(body => body.serialize()),
            physics: {
                timeStep: PHYSICS.TIME_STEP,
                gravitationalConstant: PHYSICS.G,
                collisionSensitivity: PHYSICS.COLLISION_SENSITIVITY
            },
            ui: {
                showTrails: UI.showTrails,
                trailLength: UI.trailLength,
                showInfo: UI.showInfo,
                performanceMode: PERFORMANCE.currentLevel
            },
            camera: {
                zoom: camera.zoom,
                centerX: camera.centerX,
                centerY: camera.centerY
            },
            statistics: {
                totalTime: getTotalSimulationTime(),
                specialEvents: specialEventsManager.getEventHistory()
            }
        };
        
        this.savedStates[stateName] = state;
        this.saveToLocalStorage();
        
        return stateName;
    }
    
    loadState(stateName) {
        const state = this.savedStates[stateName];
        if (!state) {
            throw new Error(`State "${stateName}" not found`);
        }
        
        // シミュレーションリセット
        this.resetSimulation();
        
        // 天体の復元
        bodies.length = 0;
        state.bodies.forEach(bodyData => {
            const body = Body.deserialize(bodyData);
            bodies.push(body);
        });
        
        // 物理パラメータの復元
        PHYSICS.TIME_STEP = state.physics.timeStep;
        PHYSICS.G = state.physics.gravitationalConstant;
        PHYSICS.COLLISION_SENSITIVITY = state.physics.collisionSensitivity;
        
        // UIの復元
        UI.showTrails = state.ui.showTrails;
        UI.trailLength = state.ui.trailLength;
        UI.showInfo = state.ui.showInfo;
        PERFORMANCE.currentLevel = state.ui.performanceMode;
        
        // カメラの復元
        camera.zoom = state.camera.zoom;
        camera.centerX = state.camera.centerX;
        camera.centerY = state.camera.centerY;
        
        // 統計データの復元
        if (state.statistics.specialEvents) {
            specialEventsManager.loadEventHistory(state.statistics.specialEvents);
        }
        
        console.log(`State "${stateName}" loaded successfully`);
    }
    
    exportState(stateName, format = 'json') {
        const state = this.savedStates[stateName];
        if (!state) return null;
        
        switch (format) {
            case 'json':
                return JSON.stringify(state, null, 2);
            case 'compact':
                return JSON.stringify(state);
            case 'url':
                return this.generateShareableURL(state);
            default:
                return state;
        }
    }
    
    generateShareableURL(state) {
        // 状態を圧縮してURLに埋め込み
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(state));
        return `${window.location.origin}${window.location.pathname}?state=${compressed}`;
    }
    
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const stateParam = urlParams.get('state');
        
        if (stateParam) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(stateParam);
                const state = JSON.parse(decompressed);
                this.loadStateFromObject(state);
                return true;
            } catch (error) {
                console.error('Failed to load state from URL:', error);
                return false;
            }
        }
        return false;
    }
}
```

### 4.4 時間制御機能

#### 時間の早送り・巻戻し
```javascript
class TimeController {
    constructor() {
        this.timeScale = 1.0;
        this.maxTimeScale = 10.0;
        this.minTimeScale = 0.1;
        this.isPaused = false;
        
        this.history = [];
        this.maxHistorySize = 1000;
        this.currentHistoryIndex = -1;
        
        this.recordingInterval = 100; // 100msごとに状態を記録
        this.lastRecordTime = 0;
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(
            this.minTimeScale,
            Math.min(this.maxTimeScale, scale)
        );
        
        // フレームレートを調整
        PHYSICS.TIME_STEP = PHYSICS.BASE_TIME_STEP * this.timeScale;
    }
    
    pause() {
        this.isPaused = true;
    }
    
    resume() {
        this.isPaused = false;
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    recordState() {
        const now = Date.now();
        if (now - this.lastRecordTime < this.recordingInterval) {
            return;
        }
        
        const state = {
            timestamp: now,
            bodies: bodies.map(body => ({
                x: body.x,
                y: body.y,
                vx: body.vx,
                vy: body.vy,
                mass: body.mass,
                type: body.type,
                id: body.id
            })),
            specialEvents: specialEventsManager.getActiveEvents()
        };
        
        // 現在位置以降の履歴を削除（新しいタイムライン作成）
        if (this.currentHistoryIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentHistoryIndex + 1);
        }
        
        this.history.push(state);
        this.currentHistoryIndex = this.history.length - 1;
        
        // 履歴サイズ制限
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentHistoryIndex--;
        }
        
        this.lastRecordTime = now;
    }
    
    rewind(steps = 1) {
        if (this.currentHistoryIndex - steps >= 0) {
            this.currentHistoryIndex -= steps;
            this.restoreState(this.history[this.currentHistoryIndex]);
        }
    }
    
    fastForward(steps = 1) {
        if (this.currentHistoryIndex + steps < this.history.length) {
            this.currentHistoryIndex += steps;
            this.restoreState(this.history[this.currentHistoryIndex]);
        }
    }
    
    restoreState(state) {
        // 天体状態の復元
        bodies.length = 0;
        state.bodies.forEach(bodyData => {
            const body = new Body(bodyData.x, bodyData.y, bodyData.mass);
            body.vx = bodyData.vx;
            body.vy = bodyData.vy;
            body.type = bodyData.type;
            body.id = bodyData.id;
            bodies.push(body);
        });
        
        // 特殊イベントの復元
        specialEventsManager.restoreEvents(state.specialEvents);
        
        // 軌跡をクリア（過去の状態なので）
        bodies.forEach(body => {
            body.trail = [];
        });
    }
    
    seekToTime(targetTime) {
        // 指定時間に最も近い状態を検索
        let closestIndex = 0;
        let minDiff = Math.abs(this.history[0].timestamp - targetTime);
        
        for (let i = 1; i < this.history.length; i++) {
            const diff = Math.abs(this.history[i].timestamp - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
        
        this.currentHistoryIndex = closestIndex;
        this.restoreState(this.history[closestIndex]);
    }
}
```

---

## 🔬 Phase 5: 科学的・教育的価値向上 (優先度: 低-中)

### 5.1 科学計算の実装

#### ケプラー軌道要素の計算
```javascript
class OrbitalMechanics {
    static calculateOrbitalElements(body1, body2) {
        // 相対位置と速度
        const r = {
            x: body2.x - body1.x,
            y: body2.y - body1.y
        };
        const v = {
            x: body2.vx - body1.vx,
            y: body2.vy - body1.vy
        };
        
        const r_mag = Math.sqrt(r.x * r.x + r.y * r.y);
        const v_mag = Math.sqrt(v.x * v.x + v.y * v.y);
        
        // 標準重力パラメータ
        const mu = PHYSICS.G * (body1.mass + body2.mass);
        
        // 比エネルギー
        const specificEnergy = (v_mag * v_mag) / 2 - mu / r_mag;
        
        // 軌道長半径
        const semiMajorAxis = -mu / (2 * specificEnergy);
        
        // 角運動量ベクトル
        const h = r.x * v.y - r.y * v.x;
        const h_mag = Math.abs(h);
        
        // 離心率
        const eccentricity = Math.sqrt(1 + (2 * specificEnergy * h_mag * h_mag) / (mu * mu));
        
        // 軌道傾斜角（2Dなので常に0）
        const inclination = 0;
        
        // 昇交点経度（2Dなので定義されない）
        const longitudeOfAscendingNode = 0;
        
        // 近点引数
        const argumentOfPeriapsis = Math.atan2(r.y, r.x);
        
        // 真近点角
        const trueAnomaly = this.calculateTrueAnomaly(r, v, mu, eccentricity);
        
        // 軌道周期
        const period = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu);
        
        return {
            semiMajorAxis,
            eccentricity,
            inclination,
            longitudeOfAscendingNode,
            argumentOfPeriapsis,
            trueAnomaly,
            period,
            specificEnergy
        };
    }
    
    static predictPosition(elements, timeFromPeriapsis) {
        // ケプラー方程式の数値解法
        let E = timeFromPeriapsis; // 平均近点角の初期推定
        
        for (let i = 0; i < 10; i++) {
            const f = E - elements.eccentricity * Math.sin(E) - timeFromPeriapsis;
            const df = 1 - elements.eccentricity * Math.cos(E);
            E = E - f / df;
        }
        
        // 真近点角の計算
        const nu = 2 * Math.atan(
            Math.sqrt((1 + elements.eccentricity) / (1 - elements.eccentricity)) *
            Math.tan(E / 2)
        );
        
        // 軌道半径
        const r = elements.semiMajorAxis * (1 - elements.eccentricity * Math.cos(E));
        
        // 軌道面での位置
        const x_orbital = r * Math.cos(nu);
        const y_orbital = r * Math.sin(nu);
        
        // 実際の座標系に変換
        const cos_w = Math.cos(elements.argumentOfPeriapsis);
        const sin_w = Math.sin(elements.argumentOfPeriapsis);
        
        return {
            x: x_orbital * cos_w - y_orbital * sin_w,
            y: x_orbital * sin_w + y_orbital * cos_w
        };
    }
}
```

### 5.2 教育コンテンツ

#### インタラクティブチュートリアル
```javascript
class EducationalTutorial {
    constructor() {
        this.tutorials = [
            {
                id: 'basic_gravity',
                title: '重力の基本',
                steps: [
                    {
                        instruction: '2つの天体を配置してください',
                        validation: () => bodies.length >= 2,
                        hints: ['画面をクリックして天体を配置']
                    },
                    {
                        instruction: '天体の軌道を観察してください',
                        validation: () => this.hasOrbitStarted(),
                        hints: ['重力により天体が引き合います']
                    }
                ]
            },
            {
                id: 'three_body_problem',
                title: '三体問題',
                steps: [
                    {
                        instruction: '3つの同質量天体を三角形に配置',
                        validation: () => this.checkTriangleConfiguration(),
                        hints: ['等間隔に配置すると安定した軌道ができます']
                    }
                ]
            }
        ];
        
        this.currentTutorial = null;
        this.currentStep = 0;
    }
    
    startTutorial(tutorialId) {
        this.currentTutorial = this.tutorials.find(t => t.id === tutorialId);
        this.currentStep = 0;
        this.showTutorialUI();
    }
    
    checkStepCompletion() {
        if (!this.currentTutorial) return;
        
        const step = this.currentTutorial.steps[this.currentStep];
        if (step.validation()) {
            this.nextStep();
        }
    }
    
    showHint() {
        const step = this.currentTutorial.steps[this.currentStep];
        this.displayMessage(step.hints[Math.floor(Math.random() * step.hints.length)]);
    }
}
```

### 5.3 科学データ可視化

#### リアルタイムグラフ表示
```javascript
class ScientificVisualization {
    constructor() {
        this.graphs = {
            energy: new EnergyGraph(),
            momentum: new MomentumGraph(),
            distance: new DistanceGraph(),
            velocity: new VelocityGraph()
        };
        
        this.isVisible = false;
        this.updateInterval = 100; // 100msごとに更新
    }
    
    update() {
        if (!this.isVisible) return;
        
        const totalEnergy = this.calculateTotalEnergy();
        const totalMomentum = this.calculateTotalMomentum();
        const bodyDistances = this.calculateAllDistances();
        const bodyVelocities = this.calculateAllVelocities();
        
        this.graphs.energy.addDataPoint(totalEnergy);
        this.graphs.momentum.addDataPoint(totalMomentum);
        this.graphs.distance.addDataPoints(bodyDistances);
        this.graphs.velocity.addDataPoints(bodyVelocities);
    }
    
    render(ctx) {
        if (!this.isVisible) return;
        
        const graphWidth = 300;
        const graphHeight = 200;
        const startX = canvas.width - graphWidth - 20;
        let startY = 20;
        
        Object.values(this.graphs).forEach(graph => {
            graph.render(ctx, startX, startY, graphWidth, graphHeight);
            startY += graphHeight + 20;
        });
    }
}

class EnergyGraph {
    constructor() {
        this.data = [];
        this.maxDataPoints = 500;
    }
    
    addDataPoint(energy) {
        this.data.push({
            time: Date.now(),
            kinetic: energy.kinetic,
            potential: energy.potential,
            total: energy.total
        });
        
        if (this.data.length > this.maxDataPoints) {
            this.data.shift();
        }
    }
    
    render(ctx, x, y, width, height) {
        // グラフの枠
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(x, y, width, height);
        
        // タイトル
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText('Energy Conservation', x + 5, y + 15);
        
        if (this.data.length < 2) return;
        
        // データの正規化
        const minTotal = Math.min(...this.data.map(d => d.total));
        const maxTotal = Math.max(...this.data.map(d => d.total));
        const range = maxTotal - minTotal || 1;
        
        // グラフの描画
        this.renderEnergyLine(ctx, x, y, width, height, 'kinetic', '#ff6b6b', minTotal, range);
        this.renderEnergyLine(ctx, x, y, width, height, 'potential', '#4ecdc4', minTotal, range);
        this.renderEnergyLine(ctx, x, y, width, height, 'total', '#ffe66d', minTotal, range);
        
        // 凡例
        this.renderLegend(ctx, x, y + height - 40);
    }
    
    renderEnergyLine(ctx, x, y, width, height, type, color, minValue, range) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        this.data.forEach((point, index) => {
            const plotX = x + (index / (this.data.length - 1)) * width;
            const normalizedValue = (point[type] - minValue) / range;
            const plotY = y + height - (normalizedValue * height * 0.8) - 20;
            
            if (index === 0) {
                ctx.moveTo(plotX, plotY);
            } else {
                ctx.lineTo(plotX, plotY);
            }
        });
        
        ctx.stroke();
    }
}
```

---

## 📋 実装スケジュール

### Week 1-2: Phase 1 (物理エンジン高度化)
- [ ] ルンゲ・クッタ法の実装
- [ ] 基本的な相対論効果の追加
- [ ] 潮汐効果の基本実装

### Week 3-4: Phase 2.1 (WebGL基盤)
- [ ] WebGLレンダラーの基本実装
- [ ] シェーダーシステムの構築
- [ ] 基本的な3D描画

### Week 5-6: Phase 2.2 (高度視覚効果)
- [ ] GPUパーティクルシステム
- [ ] 宇宙環境の追加
- [ ] 高品質な天体描画

### Week 7-8: Phase 3 (パフォーマンス最適化)
- [ ] WebWorkers実装
- [ ] LODシステム
- [ ] メモリ最適化

### Week 9-12: Phase 4 (機能拡張)
- [ ] 軌道予測システム
- [ ] データ分析機能
- [ ] セーブ・ロード機能
- [ ] 時間制御機能

### Month 4-6: Phase 5 (科学的価値向上)
- [ ] 科学計算の実装
- [ ] 教育コンテンツ
- [ ] データ可視化

---

## 🎯 期待される効果

### パフォーマンス向上
- **フレームレート**: 30-60 FPS → 60-120 FPS
- **同時天体数**: 10個 → 50個以上
- **物理精度**: ±5% → ±0.1%

### ユーザー体験向上
- **学習効果**: 直感的理解の促進
- **没入感**: 3D描画による臨場感
- **分析機能**: 科学的洞察の提供

### 技術的価値
- **WebGL活用**: 最新技術のデモンストレーション
- **物理シミュレーション**: 高精度計算の実現
- **教育ツール**: 科学教育への貢献

この改善計画により、三体問題シミュレータは世界クラスの科学教育ツールとして発展することができます。