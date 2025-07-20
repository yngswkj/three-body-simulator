'use strict';

/**
 * 恒星分類システム
 * VISUAL_ANALYSIS_REPORT.md Phase 1の実装
 * ハーツシュプルング・ラッセル図に基づく恒星分類
 */

/**
 * 恒星分類定義（モーガン・キーナン分類）
 */
export const STELLAR_CLASSES = {
    'O': {
        name: 'O型星',
        temp: 30000,
        color: '#9BB0FF',
        features: ['strongWind', 'shortLife', 'blue'],
        mass: { min: 15, max: 90 },
        lifetime: 1e6, // 100万年
        characteristics: {
            luminosity: 'extreme',
            size: 'large',
            wind: 'extreme',
            radiation: 'UV_strong'
        }
    },
    'B': {
        name: 'B型星',
        temp: 10000,
        color: '#AABFFF',
        features: ['blueGiant', 'highMass', 'strong_lines'],
        mass: { min: 2.1, max: 16 },
        lifetime: 1e7, // 1000万年
        characteristics: {
            luminosity: 'high',
            size: 'large',
            wind: 'strong',
            radiation: 'blue_white'
        }
    },
    'A': {
        name: 'A型星',
        temp: 7500,
        color: '#CAD7FF',
        features: ['fastRotation', 'metalLines', 'white'],
        mass: { min: 1.4, max: 2.1 },
        lifetime: 1e9, // 10億年
        characteristics: {
            luminosity: 'medium_high',
            size: 'medium',
            wind: 'moderate',
            radiation: 'white'
        }
    },
    'F': {
        name: 'F型星',
        temp: 6000,
        color: '#F8F7FF',
        features: ['stable', 'longLife', 'yellow_white'],
        mass: { min: 1.04, max: 1.4 },
        lifetime: 4e9, // 40億年
        characteristics: {
            luminosity: 'medium',
            size: 'medium',
            wind: 'moderate',
            radiation: 'yellow_white'
        }
    },
    'G': {
        name: 'G型星（太陽型）',
        temp: 5800,
        color: '#FFF4EA',
        features: ['solarType', 'habitable', 'stable'],
        mass: { min: 0.8, max: 1.04 },
        lifetime: 1e10, // 100億年
        characteristics: {
            luminosity: 'solar',
            size: 'solar',
            wind: 'solar',
            radiation: 'visible_peak'
        }
    },
    'K': {
        name: 'K型星',
        temp: 5200,
        color: '#FFE4B5',
        features: ['orange', 'stable', 'long_lived'],
        mass: { min: 0.45, max: 0.8 },
        lifetime: 2e10, // 200億年
        characteristics: {
            luminosity: 'low_medium',
            size: 'small_medium',
            wind: 'weak',
            radiation: 'orange'
        }
    },
    'M': {
        name: 'M型星（赤色矮星）',
        temp: 3700,
        color: '#FFCC6F',
        features: ['redDwarf', 'flares', 'very_long_lived'],
        mass: { min: 0.08, max: 0.45 },
        lifetime: 1e12, // 1兆年
        characteristics: {
            luminosity: 'low',
            size: 'small',
            wind: 'very_weak',
            radiation: 'red_infrared'
        }
    }
};

/**
 * 恒星進化段階定義
 */
export const EVOLUTION_STAGES = {
    protostar: {
        name: '原始星',
        radiusMult: 5.0,
        tempMult: 0.3,
        features: ['accretion', 'infrared_excess', 'variable']
    },
    mainSequence: {
        name: '主系列星',
        radiusMult: 1.0,
        tempMult: 1.0,
        features: ['stable', 'hydrogen_burning']
    },
    subGiant: {
        name: '準巨星',
        radiusMult: 1.2,
        tempMult: 0.9,
        features: ['hydrogen_shell_burning', 'expanding']
    },
    redGiant: {
        name: '赤色巨星',
        radiusMult: 10.0,
        tempMult: 0.6,
        features: ['pulsation', 'massLoss', 'helium_burning', 'convective']
    },
    asymptotic: {
        name: '漸近巨星分枝',
        radiusMult: 100.0,
        tempMult: 0.5,
        features: ['thermal_pulses', 'heavy_mass_loss', 'carbon_production']
    },
    planetaryNebula: {
        name: '惑星状星雲',
        radiusMult: 1000.0,
        tempMult: 2.0,
        features: ['nebula', 'centralStar', 'ionization']
    },
    whiteDwarf: {
        name: '白色矮星',
        radiusMult: 0.01,
        tempMult: 5.0,
        features: ['cooling', 'degenerate', 'crystallization']
    }
};

/**
 * 恒星分類器クラス
 */
export class StellarClassifier {
    constructor() {
        this.temperatureColorMap = this.initializeTemperatureColorMap();
    }

    /**
     * 温度-色マッピングの初期化
     */
    initializeTemperatureColorMap() {
        return {
            50000: [100, 150, 255],    // 極高温（鮮やかな青）
            30000: [130, 170, 255],    // O型（青白）
            10000: [170, 200, 255],    // B型（青）
            7500:  [240, 240, 255],    // A型（白）
            6000:  [255, 230, 200],    // F型（黄白）
            5800:  [255, 220, 180],    // G型（太陽・黄色）
            5200:  [255, 180, 120],    // K型（オレンジ）
            3700:  [255, 120, 80],     // M型（赤）
            3000:  [255, 100, 60],     // M型（深い赤）
            1000:  [255, 60, 60],      // 極低温（深紅）
        };
    }

    /**
     * 質量から恒星分類を決定
     */
    classifyByMass(mass) {
        // 恒星分類は通常星の範囲（質量10-80未満）のみ対応
        // 80以上は白色矮星などの特殊天体なので恒星分類対象外
        if (mass < 10 || mass >= 80) {
            console.log(`⚠️ 恒星分類範囲外: 質量=${mass} → 分類なし`);
            return null; // 恒星分類なし
        }
        
        // 質量10-80の範囲内で恒星分類を実行
        let solarMasses;
        let stellarType;
        
        if (mass <= 25) {
            // 質量10-25 → M型星（0.08-0.45太陽質量）
            solarMasses = 0.08 + (mass - 10) * (0.45 - 0.08) / (25 - 10);
            stellarType = 'M';
        } else if (mass <= 35) {
            // 質量25-35 → K型星（0.45-0.8太陽質量）
            solarMasses = 0.45 + (mass - 25) * (0.8 - 0.45) / (35 - 25);
            stellarType = 'K';
        } else if (mass <= 45) {
            // 質量35-45 → G型星（0.8-1.04太陽質量）
            solarMasses = 0.8 + (mass - 35) * (1.04 - 0.8) / (45 - 35);
            stellarType = 'G';
        } else if (mass <= 55) {
            // 質量45-55 → F型星（1.04-1.4太陽質量）
            solarMasses = 1.04 + (mass - 45) * (1.4 - 1.04) / (55 - 45);
            stellarType = 'F';
        } else if (mass <= 65) {
            // 質量55-65 → A型星（1.4-2.1太陽質量）
            solarMasses = 1.4 + (mass - 55) * (2.1 - 1.4) / (65 - 55);
            stellarType = 'A';
        } else if (mass <= 75) {
            // 質量65-75 → B型星（2.1-16太陽質量）
            solarMasses = 2.1 + (mass - 65) * (16 - 2.1) / (75 - 65);
            stellarType = 'B';
        } else {
            // 質量75-80 → O型星（15-90太陽質量）
            solarMasses = 15 + (mass - 75) * (90 - 15) / (80 - 75);
            stellarType = 'O';
        }
        
        console.log(`📊 質量変換: シミュレーター質量=${mass} → ${stellarType}型, 太陽質量=${solarMasses.toFixed(2)}`);
        
        const data = STELLAR_CLASSES[stellarType];
        if (data) {
            console.log(`✅ 分類成功: ${stellarType}型 (温度=${data.temp}K, 色=${data.color})`);
            return {
                type: stellarType,
                data: data,
                solarMass: solarMasses
            };
        }
        
        // エラーケース（通常は発生しない）
        console.warn(`🌞 恒星分類エラー: ${stellarType}型が見つかりません`);
        return null;
    }

    /**
     * 恒星の年齢から進化段階を決定
     */
    determineEvolutionStage(stellarClass, age, solarMass) {
        const lifetime = stellarClass.data.lifetime;
        const ageRatio = age / lifetime;

        if (ageRatio < 0.1) return EVOLUTION_STAGES.mainSequence;
        if (ageRatio < 0.9) return EVOLUTION_STAGES.mainSequence;
        if (ageRatio < 0.95) return EVOLUTION_STAGES.subGiant;
        if (solarMass > 8) {
            // 大質量星は超新星爆発
            return EVOLUTION_STAGES.mainSequence; // 簡略化
        }
        if (ageRatio < 0.98) return EVOLUTION_STAGES.redGiant;
        if (ageRatio < 0.99) return EVOLUTION_STAGES.asymptotic;
        if (ageRatio < 1.0) return EVOLUTION_STAGES.planetaryNebula;
        return EVOLUTION_STAGES.whiteDwarf;
    }

    /**
     * 温度から色を計算
     */
    getColorFromTemperature(temperature) {
        const temps = Object.keys(this.temperatureColorMap).map(Number).sort((a, b) => b - a);
        
        // 範囲外の処理
        if (temperature >= temps[0]) return this.temperatureColorMap[temps[0]];
        if (temperature <= temps[temps.length - 1]) return this.temperatureColorMap[temps[temps.length - 1]];
        
        // 線形補間
        for (let i = 0; i < temps.length - 1; i++) {
            const t1 = temps[i];
            const t2 = temps[i + 1];
            
            if (temperature <= t1 && temperature >= t2) {
                const ratio = (temperature - t2) / (t1 - t2);
                const color1 = this.temperatureColorMap[t1];
                const color2 = this.temperatureColorMap[t2];
                
                return [
                    Math.round(color2[0] + (color1[0] - color2[0]) * ratio),
                    Math.round(color2[1] + (color1[1] - color2[1]) * ratio),
                    Math.round(color2[2] + (color1[2] - color2[2]) * ratio)
                ];
            }
        }
        
        return [255, 255, 255]; // デフォルト白色
    }

    /**
     * RGB配列をHEX文字列に変換
     */
    rgbToHex(rgb) {
        return `#${rgb.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
    }

    /**
     * 恒星の表面活動レベルを計算
     */
    calculateSurfaceActivity(stellarClass, evolutionStage, age) {
        let baseActivity = 0.5;
        
        // 恒星タイプによる活動度
        switch (stellarClass.type) {
            case 'M':
                baseActivity = 0.8; // フレア星
                break;
            case 'K':
                baseActivity = 0.6;
                break;
            case 'G':
                baseActivity = 0.5; // 太陽レベル
                break;
            case 'F':
                baseActivity = 0.4;
                break;
            case 'A':
                baseActivity = 0.2;
                break;
            case 'B':
            case 'O':
                baseActivity = 0.1; // 短寿命で活動は限定的
                break;
        }
        
        // 進化段階による補正
        switch (evolutionStage.name) {
            case '主系列星':
                // 年齢による活動度変化（若い星ほど活発）
                const ageRatio = age / stellarClass.data.lifetime;
                baseActivity *= (1.0 - ageRatio * 0.5);
                break;
            case '赤色巨星':
                baseActivity *= 1.5; // 対流による活動増加
                break;
            case '白色矮星':
                baseActivity = 0.0; // 表面活動なし
                break;
        }
        
        return Math.max(0, Math.min(1, baseActivity));
    }
}

// グローバルインスタンス
export const stellarClassifier = new StellarClassifier();