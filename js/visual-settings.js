'use strict';

/**
 * ビジュアル設定システム
 * VISUAL_ANALYSIS_REPORT.md Phase 1の実装
 * ユーザーによる視覚効果のカスタマイズ機能
 */

/**
 * デフォルト設定
 */
export const DEFAULT_VISUAL_SETTINGS = {
    // 天体表示設定
    celestialBodies: {
        showCoronas: true,
        showMagneticFields: true,
        showStellarWind: true,
        showStellarClassification: true,
        particleDensity: 0.8,
        trailLength: 30,
        showTrails: true
    },

    // 特殊イベント設定
    specialEvents: {
        frequency: 'normal', // low/normal/high
        showPredictions: false,
        eventHistory: true,
        autoEvents: true,
        eventIntensity: 1.0
    },

    // パーティクルシステム設定
    particles: {
        enabled: true,
        maxCount: 1000,
        quality: 0.8,
        physics: true,
        collisions: false
    },

    // 重力場設定
    gravityField: {
        enabled: false,
        resolution: 0.5,
        intensity: 0.3,
        heatmapMode: true
    },

    // 背景設定
    background: {
        stars: true,
        nebulae: true,
        galaxies: true,
        meteors: true,
        quality: 1.0
    },

    // パフォーマンス設定
    performance: {
        autoLOD: true,
        targetFPS: 55,
        qualityLevel: 'high', // minimal/low/medium/high/ultra
        vsync: false
    },

    // 科学的精度設定
    accuracy: {
        mode: 'artistic', // educational/realistic/artistic
        physicsAccuracy: 0.8,
        visualAccuracy: 0.7,
        showRealColors: true
    },

    // UI設定
    ui: {
        showFPS: true,
        showStats: true,
        showTooltips: true,
        theme: 'dark' // dark/light
    }
};

/**
 * ビジュアル設定管理クラス
 */
export class VisualSettings {
    constructor() {
        this.settings = this.loadSettings();
        this.listeners = new Map();
        this.validationRules = this.initializeValidationRules();

        console.log('⚙️ ビジュアル設定システム初期化完了');
    }

    /**
     * バリデーションルールの初期化
     */
    initializeValidationRules() {
        return {
            'specialEvents.frequency': (value) => ['low', 'normal', 'high'].includes(value),
            'particles.maxCount': (value) => value >= 0 && value <= 5000,
            'particles.quality': (value) => value >= 0 && value <= 1,
            'performance.targetFPS': (value) => value >= 30 && value <= 120,
            'performance.qualityLevel': (value) => ['minimal', 'low', 'medium', 'high', 'ultra'].includes(value),
            'accuracy.mode': (value) => ['educational', 'realistic', 'artistic'].includes(value),
            'ui.theme': (value) => ['dark', 'light'].includes(value)
        };
    }

    /**
     * 設定の読み込み
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('three-body-visual-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return this.mergeSettings(DEFAULT_VISUAL_SETTINGS, parsed);
            }
        } catch (error) {
            console.warn('設定の読み込みに失敗しました:', error);
        }

        return JSON.parse(JSON.stringify(DEFAULT_VISUAL_SETTINGS));
    }

    /**
     * 設定の保存
     */
    saveSettings() {
        try {
            localStorage.setItem('three-body-visual-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('設定の保存に失敗しました:', error);
        }
    }

    /**
     * 設定のマージ
     */
    mergeSettings(defaults, overrides) {
        const result = JSON.parse(JSON.stringify(defaults));

        const merge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key]) target[key] = {};
                    merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };

        merge(result, overrides);
        return result;
    }

    /**
     * 設定値の取得
     */
    get(path) {
        const keys = path.split('.');
        let current = this.settings;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * 設定値の設定
     */
    set(path, value) {
        // バリデーション
        if (this.validationRules[path] && !this.validationRules[path](value)) {
            console.warn(`無効な設定値: ${path} = ${value}`);
            return false;
        }

        const keys = path.split('.');
        let current = this.settings;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;

        // リスナーに通知
        this.notifyListeners(path, value, oldValue);

        // 自動保存
        this.saveSettings();

        return true;
    }

    /**
     * 複数設定の一括更新
     */
    update(updates) {
        const changes = [];

        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.get(path);
            if (this.set(path, value)) {
                changes.push({ path, value, oldValue });
            }
        }

        return changes;
    }

    /**
     * 設定変更リスナーの追加
     */
    addListener(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);

        return () => this.removeListener(path, callback);
    }

    /**
     * 設定変更リスナーの削除
     */
    removeListener(path, callback) {
        if (this.listeners.has(path)) {
            this.listeners.get(path).delete(callback);
        }
    }

    /**
     * リスナーへの通知
     */
    notifyListeners(path, newValue, oldValue) {
        // 完全パスマッチ
        if (this.listeners.has(path)) {
            for (const callback of this.listeners.get(path)) {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('設定変更リスナーエラー:', error);
                }
            }
        }

        // 上位パスマッチ（例：'particles'のリスナーが'particles.quality'の変更を受け取る）
        const pathParts = path.split('.');
        for (let i = 1; i < pathParts.length; i++) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.listeners.has(parentPath)) {
                for (const callback of this.listeners.get(parentPath)) {
                    try {
                        callback(this.get(parentPath), undefined, parentPath);
                    } catch (error) {
                        console.error('設定変更リスナーエラー:', error);
                    }
                }
            }
        }
    }

    /**
     * 設定のリセット
     */
    reset(section = null) {
        if (section) {
            this.settings[section] = JSON.parse(JSON.stringify(DEFAULT_VISUAL_SETTINGS[section]));
            this.notifyListeners(section, this.settings[section], undefined);
        } else {
            this.settings = JSON.parse(JSON.stringify(DEFAULT_VISUAL_SETTINGS));

            // すべてのリスナーに通知
            for (const path of this.listeners.keys()) {
                this.notifyListeners(path, this.get(path), undefined);
            }
        }

        this.saveSettings();
    }

    /**
     * プリセット設定の適用
     */
    applyPreset(presetName) {
        const presets = {
            performance: {
                'particles.quality': 0.5,
                'particles.maxCount': 500,
                'background.quality': 0.6,
                'performance.qualityLevel': 'medium',
                'celestialBodies.particleDensity': 0.5
            },
            quality: {
                'particles.quality': 1.0,
                'particles.maxCount': 2000,
                'background.quality': 1.0,
                'performance.qualityLevel': 'ultra',
                'celestialBodies.particleDensity': 1.0
            },
            scientific: {
                'accuracy.mode': 'realistic',
                'accuracy.physicsAccuracy': 1.0,
                'accuracy.visualAccuracy': 1.0,
                'celestialBodies.showStellarClassification': true,
                'specialEvents.frequency': 'low'
            },
            artistic: {
                'accuracy.mode': 'artistic',
                'particles.quality': 0.9,
                'background.quality': 1.0,
                'specialEvents.frequency': 'high',
                'specialEvents.eventIntensity': 1.5
            }
        };

        const preset = presets[presetName];
        if (preset) {
            return this.update(preset);
        } else {
            console.warn(`未知のプリセット: ${presetName}`);
            return [];
        }
    }

    /**
     * 設定のエクスポート
     */
    export() {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * 設定のインポート
     */
    import(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            const oldSettings = JSON.parse(JSON.stringify(this.settings));

            this.settings = this.mergeSettings(DEFAULT_VISUAL_SETTINGS, imported);
            this.saveSettings();

            // すべてのリスナーに通知
            for (const path of this.listeners.keys()) {
                this.notifyListeners(path, this.get(path), this.getFromObject(oldSettings, path));
            }

            return true;
        } catch (error) {
            console.error('設定のインポートに失敗しました:', error);
            return false;
        }
    }

    /**
     * オブジェクトから値を取得（ヘルパー）
     */
    getFromObject(obj, path) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * デバッグ情報の取得
     */
    getDebugInfo() {
        return {
            settings: this.settings,
            listeners: Array.from(this.listeners.keys()),
            validationRules: Object.keys(this.validationRules)
        };
    }
}

// グローバルインスタンス
export const visualSettings = new VisualSettings();