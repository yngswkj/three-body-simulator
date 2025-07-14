'use strict';

// ★ 物理定数
export const PHYSICS_CONSTANTS = {
    GRAVITY_MULTIPLIER: 50,
    BLACK_HOLE_GRAVITY_MULTIPLIER: 3,
    MAX_SPEED: 300,
    SOFTENING: 100,
    BOUNDARY_MARGIN: 30,
    BOUNDARY_DAMPING: 0.8
};

// ★ 天体タイプ閾値
export const BODY_TYPE_THRESHOLDS = {
    WHITE_DWARF: 80,
    PULSAR: 160,
    NEUTRON_STAR: 190,
    PLANET_SYSTEM: 250,
    BLACK_HOLE: 400
};

// ★ パフォーマンス設定
export const PERFORMANCE_CONFIG = {
    TARGET_FPS: 55,
    CRITICAL_FPS: 50,
    EMERGENCY_FPS: 45,
    INITIALIZATION_PERIOD: 3000, // 3秒に短縮
    MIN_HISTORY_LENGTH: 3,
    MEMORY_LIMIT_MB: 100, // モバイル用にメモリ制限を厳格に
    MAX_PARTICLES: 300, // モバイル用にパーティクル数削減
    OPTIMIZATION_LEVELS: [300, 200, 120, 80, 40], // パーティクル制限を調整
    MOBILE_OPTIMIZATION: {
        MAX_PARTICLES: 150,
        TRAIL_LIMIT: 15,
        UPDATE_INTERVAL: 2,
        GRAVITY_FIELD_SKIP: 2
    },
    DESKTOP_OPTIMIZATION: {
        MAX_PARTICLES: 500,
        TRAIL_LIMIT: 30,
        UPDATE_INTERVAL: 1,
        GRAVITY_FIELD_SKIP: 1
    }
};

// ★ 描画設定
export const GRAPHICS_CONFIG = {
    GRAVITY_FIELD_RESOLUTION: 60,
    STAR_COUNT_FACTOR: 8000,
    MAX_STARS: 150,
    TRAIL_UPDATE_INTERVAL: 3,
    PARTICLE_GENERATION_INTERVALS: {
        blackHole: 8,
        neutronStar: 25,
        pulsar: 10,
        planetSystem: 40,
        default: 15
    }
};

// ★ UI設定
export const UI_CONFIG = {
    MAX_BODIES: 20,
    TOOLTIP_OFFSET: 15,
    ERROR_DISPLAY_DURATION: 3000
};

// ★ 色定義
export const COLORS = {
    BODY_COLORS: [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24',
        '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe',
        '#fd79a8', '#fdcb6e', '#00b894', '#e17055',
        '#74b9ff', '#0984e3', '#00cec9', '#e84393'
    ],
    PLANET_COLORS: [
        '#8B4513', '#CD853F', '#DEB887', '#F4A460',
        '#4169E1', '#1E90FF', '#87CEEB', '#B0E0E6',
        '#FF6347', '#FF4500', '#DC143C', '#B22222'
    ],
    BODY_TYPE_COLORS: {
        normal: null, // 動的生成
        whiteDwarf: '#F0F8FF',
        neutronStar: '#E6E6FA',
        pulsar: '#00FFFF',
        planetSystem: '#FFD700',
        blackHole: '#000000'
    }
};

// ★ 日本語名定義
export const TYPE_NAMES_JP = {
    normal: '通常星',
    whiteDwarf: '白色矮星',
    neutronStar: '中性子星',
    pulsar: 'パルサー',
    planetSystem: '惑星系',
    blackHole: 'ブラックホール'
};
