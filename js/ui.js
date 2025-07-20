'use strict';

// ツールチップ関連変数
let hoveredBody = null;
let tooltip = null;
let mousePos = { x: 0, y: 0 };

// ドラッグ関連変数
let selectedBody = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

/**
 * ツールチップの初期化
 */
export function initializeTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);
}

/**
 * 天体の詳細情報を取得
 */
export function getBodyInfo(body, gravity, bodies) {
    const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy);
    const kineticEnergy = 0.5 * body.mass * speed * speed;

    // 他の天体との相互作用エネルギーを計算
    let potentialEnergy = 0;
    const G = gravity * 50;

    bodies.forEach(otherBody => {
        if (otherBody !== body && otherBody.isValid) {
            const dx = otherBody.x - body.x;
            const dy = otherBody.y - body.y;
            const distance = Math.sqrt(dx * dx + dy * dy) + 10;
            potentialEnergy -= G * body.mass * otherBody.mass / distance;
        }
    });

    const totalEnergy = (kineticEnergy + potentialEnergy / 2) / 1000;

    return {
        type: body.getTypeNameJapanese(),
        mass: body.mass.toFixed(1),
        speed: speed.toFixed(1),
        kineticEnergy: (kineticEnergy / 1000).toFixed(1),
        potentialEnergy: (potentialEnergy / 2000).toFixed(1),
        totalEnergy: totalEnergy.toFixed(1),
        magneticField: body.magneticField ? body.magneticField.toFixed(2) : null,
        temperature: body.temperature ? body.temperature.toFixed(2) : null,
        rotationPeriod: body.rotationPeriod ? body.rotationPeriod.toFixed(3) : null,
        age: body.pulsarAge ? Math.floor(body.pulsarAge) : null,
        planets: body.planets ? body.planets.length : null
    };
}

/**
 * ツールチップの更新
 */
export function updateTooltip(body, x, y, gravity, bodies, canvas) {
    if (!tooltip || !body) return;

    const info = getBodyInfo(body, gravity, bodies);

    tooltip.className = `tooltip ${body.type}`;

    let content = `<div class="tooltip-title">${info.type}</div>`;

    // 基本情報
    content += `<div class="tooltip-row">
                <span class="tooltip-label">質量:</span>
                <span class="tooltip-value">${info.mass}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">速度:</span>
                <span class="tooltip-value">${info.speed}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">運動エネルギー:</span>
                <span class="tooltip-value">${info.kineticEnergy}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">位置エネルギー:</span>
                <span class="tooltip-value">${info.potentialEnergy}</span>
            </div>`;

    content += `<div class="tooltip-row">
                <span class="tooltip-label">総エネルギー:</span>
                <span class="tooltip-value">${info.totalEnergy}</span>
            </div>`;

    // 天体タイプ別の追加情報
    switch (body.type) {
        case 'pulsar':
            if (info.magneticField) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">磁場強度:</span>
                            <span class="tooltip-value">${info.magneticField}</span>
                        </div>`;
            }
            if (info.rotationPeriod) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">回転周期:</span>
                            <span class="tooltip-value">${info.rotationPeriod}s</span>
                        </div>`;
            }
            if (info.age !== null) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">年齢:</span>
                            <span class="tooltip-value">${info.age}</span>
                        </div>`;
            }
            break;

        case 'neutronStar':
            if (info.magneticField) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">磁場強度:</span>
                            <span class="tooltip-value">${info.magneticField}</span>
                        </div>`;
            }
            break;

        case 'whiteDwarf':
            if (info.temperature) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">温度係数:</span>
                            <span class="tooltip-value">${info.temperature}</span>
                        </div>`;
            }
            break;

        case 'blackHole':
            const eventHorizonRadius = body.eventHorizonRadius ? body.eventHorizonRadius.toFixed(1) : 'N/A';
            content += `<div class="tooltip-row">
                        <span class="tooltip-label">事象地平線:</span>
                        <span class="tooltip-value">${eventHorizonRadius}</span>
                    </div>`;
            break;

        case 'planetSystem':
            if (info.planets !== null) {
                content += `<div class="tooltip-row">
                            <span class="tooltip-label">惑星数:</span>
                            <span class="tooltip-value">${info.planets}個</span>
                        </div>`;
            }
            break;
    }

    tooltip.innerHTML = content;

    // 位置調整
    const rect = canvas.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + x + 15;
    let top = rect.top + y - 10;

    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = rect.left + x - tooltipRect.width - 15;
    }

    if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top + y - tooltipRect.height - 15;
    }

    if (top < 10) {
        top = rect.top + y + 15;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
}

/**
 * ツールチップの非表示
 */
export function hideTooltip() {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
    hoveredBody = null;
}

/**
 * 指定座標の天体を検索
 */
export function findBodyAt(x, y, bodies, isRunning = true) {
    // ★ 修正：停止中とモバイルでの当たり判定拡大
    const isMobile = window.innerWidth <= 767;
    let touchRadius = 1.5; // 基本値
    
    if (!isRunning) {
        // 停止中は大きく拡大（ドラッグしやすく）
        touchRadius = isMobile ? 3.5 : 3.0;
    } else if (isMobile) {
        // 実行中のモバイルは適度に拡大
        touchRadius = 2.5;
    }
    
    for (let body of bodies) {
        if (!body.isValid) continue;
        const dx = x - body.x;
        const dy = y - body.y;
        const radius = Math.sqrt(body.mass) * touchRadius;
        if (dx * dx + dy * dy <= radius * radius) {
            return body;
        }
    }
    return null;
}

/**
 * マウス/タッチイベントの座標取得
 */
export function getEventPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

/**
 * マウス移動時の処理
 */
export function handleMouseMove(e, canvas, bodies, gravity, drawBackground, findBodyAt, isRunning) {
    // ★ 修正：ドラッグ中は常に移動処理を実行（射出モードでない場合のみ）
    if (uiState.isDragging && !uiState.isLaunching) {
        handleMove(e, canvas, drawBackground, bodies, isRunning);
        return;
    }

    // ツールチップ処理
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const body = findBodyAt(x, y, bodies);

    if (body && body.isValid) {
        showTooltip(e, body, gravity);
    } else {
        hideTooltip();
    }
}

/**
 * ツールチップを表示
 */
function showTooltip(event, body, gravity) {
    if (!tooltip) return;

    const info = getBodyInfo(body, gravity, []);

    tooltip.className = `tooltip ${body.type}`;

    let content = `<div class="tooltip-title">${info.type}</div>`;
    content += `<div class="tooltip-row">
                <span class="tooltip-label">質量:</span>
                <span class="tooltip-value">${info.mass}</span>
            </div>`;
    content += `<div class="tooltip-row">
                <span class="tooltip-label">速度:</span>
                <span class="tooltip-value">${info.speed}</span>
            </div>`;

    tooltip.innerHTML = content;

    // 位置調整
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY - 10}px`;
    tooltip.style.display = 'block';
}

/**
 * エラーメッセージの表示
 */
export function showError(message) {
    console.error('Error:', message);

    // エラーメッセージ要素を作成または取得
    let errorElement = document.getElementById('errorMessage');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'errorMessage';
        errorElement.className = 'error-message';
        document.body.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // 5秒後に自動で非表示
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

/**
 * タッチ/マウス開始処理（射出システム対応）
 */
export function handleStart(e, canvas, bodies, currentPresetType, updateDisplay, drawBackground, isRunning, showError, Body, bodyLauncher = null) {
    try {
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        
        // ★ 修正：タッチイベントの座標取得を強化
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const selectedBody = findBodyAt(x, y, bodies, isRunning);

        if (selectedBody) {
            // ★ 新機能：停止中は射出モード、実行中は従来のドラッグモード
            if (!isRunning && bodyLauncher) {
                // 停止中：射出システムを使用
                const launchStarted = bodyLauncher.startLaunch(x, y, selectedBody);
                console.log(`🎯 射出モード開始: ${selectedBody.getTypeNameJapanese()} (質量: ${selectedBody.mass.toFixed(1)})`);
                
                // uiStateも更新
                uiState.selectedBody = selectedBody;
                uiState.isLaunching = launchStarted;
                uiState.isDragging = false;
                
                return {
                    selectedBody: selectedBody,
                    isLaunching: launchStarted,
                    isDragging: false,
                    mode: 'launch'
                };
            } else {
                // 実行中：従来のドラッグモード
                console.log(`🖱️ ドラッグモード開始: ${selectedBody.getTypeNameJapanese()} (質量: ${selectedBody.mass.toFixed(1)})`);
                selectedBody.isDragging = true;
                selectedBody.wasDragged = true; // ★ 追加：ドラッグ履歴を記録
                
                // ★ 追加：ドラッグ開始位置を記録
                uiState.dragStartPos = { x: selectedBody.x, y: selectedBody.y };

                return {
                    selectedBody: selectedBody,
                    isDragging: true,
                    isLaunching: false,
                    mode: 'drag',
                    dragOffset: {
                        x: x - selectedBody.x,
                        y: y - selectedBody.y
                    }
                };
            }
        } else {
            // ★ 修正：モバイルでも天体生成を許可（以前の制限を削除）
            const isMobile = window.innerWidth <= 767;
            // if (isMobile && !isRunning) {
            //     // モバイルで停止中は天体生成を無効化（誤タップ防止）
            //     console.log('📱 モバイルでの天体生成を防止しました');
            //     return {};
            // }
            
            // ★ 修正：実行中でも天体作成を許可、パーティクルシステムを取得
            try {
                const ctx = canvas.getContext('2d');
                // ★ 修正：画面クリックでは恒星分類範囲のみ生成
                const stellarRand = Math.random();
                let newMass;
                
                if (stellarRand < 0.4) {
                    // 40%: M型星（質量10-25）
                    newMass = 10 + Math.random() * 15;
                } else if (stellarRand < 0.6) {
                    // 20%: K型星（質量25-35）
                    newMass = 25 + Math.random() * 10;
                } else if (stellarRand < 0.75) {
                    // 15%: G型星（質量35-45）
                    newMass = 35 + Math.random() * 10;
                } else if (stellarRand < 0.85) {
                    // 10%: F型星（質量45-55）
                    newMass = 45 + Math.random() * 10;
                } else if (stellarRand < 0.93) {
                    // 8%: A型星（質量55-65）
                    newMass = 55 + Math.random() * 10;
                } else if (stellarRand < 0.98) {
                    // 5%: B型星（質量65-75）
                    newMass = 65 + Math.random() * 10;
                } else {
                    // 2%: O型星（質量75-80）
                    newMass = 75 + Math.random() * 5;
                }

                // ★ 修正：パーティクルシステムを適切に取得・渡す
                // simulatorからパーティクルシステムを取得する必要がある
                // 一時的にnullで作成し、後でシミュレーター側で設定
                const newBody = new Body(x, y, 0, 0, newMass, null);
                bodies.push(newBody);

                // プリセットタイプをクリア
                const result = {
                    currentPresetType: null,
                    newBody: newBody // ★ 追加：新しく作成した天体を返す
                };

                // 表示更新
                updateDisplay();

                // ★ 修正：停止中のみ手動描画更新
                if (!isRunning) {
                    drawBackground();
                    bodies.forEach(body => {
                        if (body.isValid) {
                            body.draw(ctx, true);
                        }
                    });
                }

                console.log(`新しい天体を作成: 質量 ${newMass.toFixed(1)} (実行中: ${isRunning})`);
                return result;
            } catch (error) {
                console.error('天体作成エラー:', error);
                showError('天体作成に失敗しました');
                return {};
            }
        }
    } catch (error) {
        console.error('UI handleStart error:', error);
        showError('天体操作でエラーが発生しました。');
        return {};
    }
}

/**
 * マウス移動処理（ドラッグ・射出対応）
 */
export function handleMove(event, canvas, drawBackground, bodies, isRunning, bodyLauncher = null) {
    event.preventDefault();

    // 座標の取得
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // ★ 新機能：射出モードとドラッグモードの分岐
    if (bodyLauncher && bodyLauncher.isLaunching) {
        // 射出モード：射出システムで処理
        bodyLauncher.updateDrag(x, y);
        
        // ★ 修正：停止中は即座に描画を更新（スマートフォン対応）
        if (!isRunning) {
            drawBackground();
            bodies.forEach(body => {
                if (body.isValid) {
                    body.draw(canvas.getContext('2d'), true);
                }
            });
            bodyLauncher.render(bodies);
        }
        return;
    }

    // 従来のドラッグモード
    if (!uiState.isDragging || !uiState.selectedBody) return;

    // ドラッグオフセットを適用
    uiState.selectedBody.x = x - uiState.dragOffset.x;
    uiState.selectedBody.y = y - uiState.dragOffset.y;

    // ★ 修正：実行中でも画面を更新（軽量版）
    if (!isRunning) {
        drawBackground();
        bodies.forEach(body => {
            if (body.isValid) {
                body.draw(canvas.getContext('2d'), true);
            }
        });
    }
    // isRunning中は通常のアニメーションループで描画されるため、ここでは何もしない
}

/**
 * マウス/タッチ終了処理（射出システム対応）
 */
export function handleEnd(event, canvas, drawBackground, bodies, isRunning, bodyLauncher = null) {
    event.preventDefault();

    // ★ 新機能：射出モードの処理
    if (bodyLauncher && bodyLauncher.isLaunching) {
        const executed = bodyLauncher.executeLaunch();
        console.log(`🚀 射出${executed ? '実行' : 'キャンセル'}`);
        
        // 射出が実行された場合、uiState もクリア
        if (executed) {
            uiState.isDragging = false;
            uiState.isLaunching = false;
            uiState.selectedBody = null;
        }
        
        return {
            isDragging: false,
            isLaunching: false,
            selectedBody: null,
            mode: 'none',
            launched: executed
        };
    }

    // ★ 従来のドラッグ終了処理（射出モードでない場合のみ）
    if (uiState.isDragging && uiState.selectedBody && !bodyLauncher?.isLaunching) {
        // ★ 追加：停止中の場合は矢印エフェクト情報を保存
        if (!isRunning && uiState.dragStartPos) {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }
            const endX = clientX - rect.left;
            const endY = clientY - rect.top;
            
            // ★ 修正：矢印情報を天体に保存（射出ベクトル方向に修正）
            const dx = uiState.dragStartPos.x - endX;
            const dy = uiState.dragStartPos.y - endY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 20) { // 最小距離以上でのみ保存
                // ★ 修正：進行方向（射出方向）に矢印を向ける
                const arrowLength = Math.min(distance, 200); // 最大200pxに制限
                const normalizedDx = -dx / distance; // 逆方向（進行方向）
                const normalizedDy = -dy / distance; // 逆方向（進行方向）
                
                const arrowEndX = uiState.selectedBody.x + normalizedDx * arrowLength;
                const arrowEndY = uiState.selectedBody.y + normalizedDy * arrowLength;
                
                uiState.selectedBody.dragArrow = {
                    startX: uiState.selectedBody.x,
                    startY: uiState.selectedBody.y,
                    endX: arrowEndX,
                    endY: arrowEndY,
                    power: Math.min(distance / 200 * 50, 50), // 矢印の力を計算
                    distance: distance
                };
                console.log(`矢印エフェクト保存: ${uiState.selectedBody.getTypeNameJapanese()} - 距離=${distance.toFixed(1)}`);
            }
        }
        
        // ドラッグ終了時は速度をゼロにする（射出モードでは実行しない）
        uiState.selectedBody.vx = 0;
        uiState.selectedBody.vy = 0;

        // 軌跡をクリア（新しい位置から開始）
        uiState.selectedBody.trail = [];

        // ★ 追加：ドラッグフラグをクリア
        uiState.selectedBody.isDragging = false;

        console.log(`天体ドラッグ完了: 新位置 (${uiState.selectedBody.x.toFixed(1)}, ${uiState.selectedBody.y.toFixed(1)})`);
    }

    const result = {
        isDragging: false,
        selectedBody: null
    };

    uiState.isDragging = false;
    uiState.selectedBody = null;

    // ★ 修正：実行中でなければ画面を更新
    if (!isRunning) {
        drawBackground();
        bodies.forEach(body => {
            if (body.isValid) {
                body.draw(canvas.getContext('2d'), true);
            }
        });
    }

    return result;
}

/**
 * 表示更新
 */
export function updateDisplay(bodies, time, energyCalculator, eventStats = null) {
    const validBodies = bodies.filter(body => body.isValid);

    // ★ 修正：typeCountsを正しく計算
    const typeCounts = {};
    validBodies.forEach(body => {
        const type = body.type || 'normal';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // 既存の表示更新
    const totalMass = validBodies.reduce((sum, body) => sum + body.mass, 0);
    const energy = energyCalculator();

    // ★ 修正：特殊イベント統計の表示を常に更新
    if (eventStats) {
        updateEventDisplay(eventStats);
    }

    // 情報表示の更新
    const infoElement = document.querySelector('.info');
    if (infoElement) {
        const bodyCountText = validBodies.length === 1 ? '1個の天体' : `${validBodies.length}個の天体`;

        let bodyTypesText = '';
        if (Object.keys(typeCounts).length > 1) {
            const typeNames = {
                'normal': '通常',
                'star': '恒星',
                'pulsar': 'パルサー',
                'blackHole': 'ブラックホール',
                'neutronStar': '中性子星',
                'whiteDwarf': '白色矮星',
                'planetSystem': '惑星系'
            };

            const typeList = Object.entries(typeCounts)
                .map(([type, count]) => `${typeNames[type] || type}: ${count}`)
                .join(', ');
            bodyTypesText = `<div class="info-row"><span class="info-label">種類:</span><span class="info-value">${typeList}</span></div>`;
        }

        infoElement.innerHTML = `
            <div class="info-row">
                <span class="info-label">天体数:</span>
                <span class="info-value">${bodyCountText}</span>
            </div>
            ${bodyTypesText}
            <div class="info-row">
                <span class="info-label">総質量:</span>
                <span class="info-value">${totalMass.toFixed(1)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">時間:</span>
                <span class="info-value">${time.toFixed(1)}s</span>
            </div>
            <div class="info-row">
                <span class="info-label">エネルギー:</span>
                <span class="info-value">${energy.toFixed(1)}</span>
            </div>
        `;
    }
}

/**
 * ★ 修正：特殊イベント表示の更新（詳細統計を画面に表示）
 */
function updateEventDisplay(eventStats) {
    const eventStatsElement = document.getElementById('eventStats');
    const eventStatsContent = document.getElementById('eventStatsContent');

    if (!eventStatsElement || !eventStatsContent) return;

    // イベントが発生していない場合は非表示
    if (eventStats.totalEvents === 0) {
        eventStatsElement.style.display = 'none';
        return;
    }

    // イベントが発生している場合は表示
    eventStatsElement.style.display = 'block';

    // イベント名の日本語マッピング
    const eventNames = {
        cosmicStorm: '⚡ 宇宙嵐',
        solarFlare: '☀️ 太陽フレア',
        hawkingRadiation: '🔬 ホーキング輻射',
        gravitationalLensing: '🔍 重力レンズ効果',
        perfectAlignment: '🌈 完璧な整列',
        blackHoleMerger: '💫 ブラックホール合体',
        resonanceHarmony: '🎵 共鳴ハーモニー'
    };

    // レア度の分類
    const rarityTypes = {
        cosmicStorm: 'common',
        solarFlare: 'uncommon',
        hawkingRadiation: 'rare',
        gravitationalLensing: 'rare',
        perfectAlignment: 'legendary',
        blackHoleMerger: 'legendary',
        resonanceHarmony: 'legendary'
    };

    let content = '';

    // 個別イベントの表示
    Object.entries(eventStats.eventTypes).forEach(([eventType, count]) => {
        if (count > 0) {
            const displayName = eventNames[eventType] || eventType;
            const rarity = rarityTypes[eventType] || 'common';
            const rarityClass = rarity === 'rare' ? 'rare' : rarity === 'legendary' ? 'legendary' : '';

            content += `
                <div class="event-stat-row">
                    <span class="event-stat-label">${displayName}</span>
                    <span class="event-stat-value ${rarityClass}">${count}回</span>
                </div>
            `;
        }
    });

    // 合計統計
    content += `
        <div class="event-stat-row event-total">
            <span class="event-stat-label">📊 総イベント数</span>
            <span class="event-stat-value">${eventStats.totalEvents}回</span>
        </div>
    `;

    if (eventStats.rareEvents > 0) {
        content += `
            <div class="event-stat-row">
                <span class="event-stat-label">🔶 レアイベント</span>
                <span class="event-stat-value rare">${eventStats.rareEvents}回</span>
            </div>
        `;
    }

    if (eventStats.legendaryEvents > 0) {
        content += `
            <div class="event-stat-row">
                <span class="event-stat-label">💎 伝説イベント</span>
                <span class="event-stat-value legendary">${eventStats.legendaryEvents}回</span>
            </div>
        `;
    }

    eventStatsContent.innerHTML = content;

    // デバッグログ（頻度を大幅に下げる）
    if (eventStats.totalEvents > 0 && eventStats.totalEvents % 20 === 0) {
        console.log('🎆 特殊イベント統計更新:', {
            総イベント数: eventStats.totalEvents,
            レアイベント: eventStats.rareEvents,
            伝説イベント: eventStats.legendaryEvents,
            イベント種類: eventStats.eventTypes
        });
    }
}

// ★ 射出状態変数の追加
let isLaunching = false;

// ドラッグ開始位置を記録する変数
let dragStartPos = null;

// UI状態をエクスポート
export const uiState = {
    get hoveredBody() { return hoveredBody; },
    get selectedBody() { return selectedBody; },
    get isDragging() { return isDragging; },
    get isLaunching() { return isLaunching; },
    get dragOffset() { return dragOffset; },
    get mousePos() { return mousePos; },
    get dragStartPos() { return dragStartPos; },
    set hoveredBody(value) { hoveredBody = value; },
    set selectedBody(value) { selectedBody = value; },
    set isDragging(value) { isDragging = value; },
    set isLaunching(value) { isLaunching = value; },
    set dragOffset(value) { dragOffset = value; },
    set mousePos(value) { mousePos = value; },
    set dragStartPos(value) { dragStartPos = value; }
};

/**
 * ウェルカムモーダルの初期化
 */
export function initializeWelcomeModal() {
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const startButton = document.getElementById('startSimulation');
    const helpButton = document.getElementById('showDetailedHelp');
    const helpButtonControl = document.getElementById('helpButton');
    const helpButtonMobile = document.getElementById('helpButtonMobile');
    const helpPopup = document.getElementById('helpPopup');
    const helpOverlay = document.getElementById('helpOverlay');
    
    // 初期表示でウェルカムモーダルを表示
    if (welcomeOverlay) {
        welcomeOverlay.style.display = 'flex';
    }
    
    // ヘルプ表示関数
    const showHelp = () => {
        if (welcomeOverlay) {
            welcomeOverlay.style.display = 'none';
        }
        if (helpPopup && helpOverlay) {
            helpPopup.style.display = 'block';
            helpOverlay.style.display = 'block';
        }
    };
    
    // シミュレーション開始ボタン
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (welcomeOverlay) {
                welcomeOverlay.style.display = 'none';
            }
        });
    }
    
    // 詳細ヘルプボタン（ウェルカムモーダル内）
    if (helpButton) {
        helpButton.addEventListener('click', showHelp);
    }
    
    // コントロールパネル内ヘルプボタン
    if (helpButtonControl) {
        helpButtonControl.addEventListener('click', showHelp);
    }
    
    // モバイル用ヘルプボタン
    if (helpButtonMobile) {
        helpButtonMobile.addEventListener('click', showHelp);
    }
    
    console.log('🎉 ウェルカムモーダル初期化完了');
}
