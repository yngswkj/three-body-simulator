
export class BodyRenderer {
    constructor() {
        // 描画設定
        this.glowEnabled = true;
    }

    /**
     * 天体の描画
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Body} body 
     * @param {boolean} showTrails 
     */
    draw(ctx, body, showTrails = true) {
        if (!body.isValid) return;

        // ★ 全体を加算合成で描画して発光感を出す
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        try {
            // 軌道描画
            if (showTrails && body.trail.length > 3) {
                this.drawTrail(ctx, body);
            }

            // タイプ別描画
            switch (body.type) {
                case 'blackHole':
                    // ブラックホールは別途描画されるためスキップ
                    break;
                case 'neutronStar':
                    this.drawNeutronStar(ctx, body);
                    break;
                case 'whiteDwarf':
                    this.drawWhiteDwarf(ctx, body);
                    break;
                case 'pulsar':
                    this.drawPulsar(ctx, body);
                    break;
                case 'planetSystem':
                    this.drawPlanetSystem(ctx, body);
                    break;
                default:
                    this.drawNormalBody(ctx, body);
                    break;
            }

        } catch (error) {
            console.warn('Body draw error:', error);
        } finally {
            ctx.restore();
        }
    }

    drawTrail(ctx, body) {
        ctx.save();
        // 加算合成で軌跡を光らせる
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'butt'; // roundだと重なり部分が光って節に見えるためbuttに変更
        ctx.lineJoin = 'round';

        for (let i = 2; i < body.trail.length - 1; i++) {
            const alpha = (i / body.trail.length) * 0.8;
            const width = (i / body.trail.length) * 4 + 0.5;

            const p0 = body.trail[i - 2];
            const p1 = body.trail[i - 1];
            const p2 = body.trail[i];
            const p3 = body.trail[i + 1] || body.trail[i];

            const gradient = ctx.createLinearGradient(
                p1.x, p1.y, p2.x, p2.y
            );

            const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            const prevAlphaHex = Math.floor(((i - 1) / body.trail.length) * 255).toString(16).padStart(2, '0');

            gradient.addColorStop(0, body.color + prevAlphaHex);
            gradient.addColorStop(1, body.color + alphaHex);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = width;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);

            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
            ctx.stroke();
        }

        ctx.restore();

        if (body.trail.length > 0) {
            const lastPoint = body.trail[body.trail.length - 1];
            const glowRadius = 3;

            const glowGradient = ctx.createRadialGradient(
                lastPoint.x, lastPoint.y, 0,
                lastPoint.x, lastPoint.y, glowRadius
            );
            glowGradient.addColorStop(0, body.color + 'AA');
            glowGradient.addColorStop(0.5, body.color + '66');
            glowGradient.addColorStop(1, body.color + '00');

            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawNeutronStar(ctx, body) {
        const radius = Math.sqrt(body.mass) * 0.8;

        for (let field = 0; field < 4; field++) {
            const fieldAngle = body.rotation + (field * Math.PI / 2);
            const fieldRadius = radius * (2 + field * 0.5);

            ctx.strokeStyle = `rgba(147, 112, 219, ${0.3 - field * 0.05})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(body.x, body.y, fieldRadius, fieldAngle - 0.3, fieldAngle + 0.3);
            ctx.stroke();
        }

        const coreGradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, radius);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.3, '#E6E6FA');
        coreGradient.addColorStop(0.7, '#9370DB');
        coreGradient.addColorStop(1, '#4B0082');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawWhiteDwarf(ctx, body) {
        const radius = Math.sqrt(body.mass) * 1.2;
        const tempFactor = body.temperature || 0.5;
        const r = Math.floor(255 * tempFactor);
        const g = Math.floor(255 * tempFactor * 0.9);
        const b = Math.floor(255 * (0.8 + tempFactor * 0.2));

        const coolGradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, radius * 2);
        coolGradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
        coolGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.7)`);
        coolGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.1)`);

        ctx.fillStyle = coolGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        const coreGradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, radius);
        coreGradient.addColorStop(0, '#FFFFFF');
        coreGradient.addColorStop(0.6, body.color);
        coreGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.8)`);

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    drawPulsar(ctx, body) {
        const radius = Math.sqrt(body.mass) * 0.7;
        const beamIntensity = Math.min((body.magneticField || 0) / 1.5, 1.0);

        for (let beam = 0; beam < 2; beam++) {
            const beamAngle = (body.beamRotation || 0) + beam * Math.PI;
            const beamLength = radius * (8 + (body.magneticField || 0) * 4) * (0.1 / (body.rotationPeriod || 1));
            const beamWidth = 2 + Math.sin((body.beamRotation || 0) * 12) * 1 * beamIntensity;

            const beamGradient = ctx.createLinearGradient(
                body.x, body.y,
                body.x + Math.cos(beamAngle) * beamLength,
                body.y + Math.sin(beamAngle) * beamLength
            );

            const alpha = 0.7 * beamIntensity;
            beamGradient.addColorStop(0, `rgba(0, 255, 255, ${alpha})`);
            beamGradient.addColorStop(0.3, `rgba(0, 255, 255, ${alpha * 0.7})`);
            beamGradient.addColorStop(0.7, `rgba(0, 255, 255, ${alpha * 0.4})`);
            beamGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

            ctx.strokeStyle = beamGradient;
            ctx.lineWidth = beamWidth;
            ctx.beginPath();
            ctx.moveTo(body.x, body.y);
            ctx.lineTo(
                body.x + Math.cos(beamAngle) * beamLength,
                body.y + Math.sin(beamAngle) * beamLength
            );
            ctx.stroke();
        }

        this.drawNeutronStar(ctx, body);

        const pulseFrequency = 1.0 / (body.rotationPeriod || 1);
        const pulseIntensity = 0.5 + 0.5 * Math.sin((body.beamRotation || 0) * pulseFrequency) * beamIntensity;
        const pulseRadius = radius * (1.5 + pulseIntensity * 0.8);

        ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + pulseIntensity * 0.5})`;
        ctx.lineWidth = 1 + pulseIntensity;
        ctx.beginPath();
        ctx.arc(body.x, body.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (body.magneticField > 0.8) {
            ctx.strokeStyle = `rgba(0, 255, 255, 0.2)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(body.x, body.y, radius * body.magneticField * 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    drawPlanetSystem(ctx, body) {
        this.drawSolarStar(ctx, body);

        if (body.planets) {
            body.planets.forEach(planet => {
                const px = body.x + Math.cos(planet.angle) * planet.distance;
                const py = body.y + Math.sin(planet.angle) * planet.distance;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(body.x, body.y, planet.distance, 0, Math.PI * 2);
                ctx.stroke();

                const planetGradient = ctx.createRadialGradient(px, py, 0, px, py, planet.size);
                planetGradient.addColorStop(0, '#FFFFFF');
                planetGradient.addColorStop(0.7, planet.color);
                planetGradient.addColorStop(1, planet.color + '88');

                ctx.fillStyle = planetGradient;
                ctx.beginPath();
                ctx.arc(px, py, planet.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }

    drawSolarStar(ctx, body) {
        const baseRadius = Math.sqrt(body.mass) * 1;
        const pulseMultiplier = 1 + Math.sin(body.pulsePhase || 0) * 0.15;
        const radius = baseRadius * pulseMultiplier;

        for (let layer = 4; layer >= 1; layer--) {
            const coronaRadius = radius * (3 + layer * 0.8);
            const coronaGradient = ctx.createRadialGradient(body.x, body.y, radius, body.x, body.y, coronaRadius);

            const intensity = 0.08 / layer;
            const coronaAlpha = Math.floor(intensity * 255).toString(16).padStart(2, '0');

            coronaGradient.addColorStop(0, '#FFD700' + coronaAlpha);
            coronaGradient.addColorStop(0.3, '#FFA500' + Math.floor(intensity * 128).toString(16).padStart(2, '0'));
            coronaGradient.addColorStop(0.7, '#FF6B47' + Math.floor(intensity * 64).toString(16).padStart(2, '0'));
            coronaGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = coronaGradient;
            ctx.beginPath();
            ctx.arc(body.x, body.y, coronaRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        const flareCount = 8;
        for (let i = 0; i < flareCount; i++) {
            const flareAngle = (Math.PI * 2 * i) / flareCount + (body.rotation || 0) * 0.1;
            const flareLength = radius * (1.5 + Math.sin((body.pulsePhase || 0) + i) * 0.8);
            const flareWidth = 3 + Math.sin((body.pulsePhase || 0) * 1.5 + i) * 2;

            const flareGradient = ctx.createLinearGradient(
                body.x, body.y,
                body.x + Math.cos(flareAngle) * flareLength,
                body.y + Math.sin(flareAngle) * flareLength
            );

            flareGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            flareGradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.4)');
            flareGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

            ctx.strokeStyle = flareGradient;
            ctx.lineWidth = flareWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(body.x + Math.cos(flareAngle) * radius * 0.8,
                body.y + Math.sin(flareAngle) * radius * 0.8);
            ctx.lineTo(body.x + Math.cos(flareAngle) * flareLength,
                body.y + Math.sin(flareAngle) * flareLength);
            ctx.stroke();
        }

        const chromosphereGradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, radius * 1.3);
        chromosphereGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        chromosphereGradient.addColorStop(0.7, 'rgba(255, 140, 0, 0.6)');
        chromosphereGradient.addColorStop(0.9, 'rgba(255, 69, 0, 0.8)');
        chromosphereGradient.addColorStop(1, 'rgba(255, 0, 0, 0.9)');

        ctx.fillStyle = chromosphereGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius * 1.3, 0, Math.PI * 2);
        ctx.fill();

        const photosphereGradient = ctx.createRadialGradient(
            body.x - radius * 0.3, body.y - radius * 0.3, 0,
            body.x, body.y, radius
        );
        photosphereGradient.addColorStop(0, '#FFFFFF');
        photosphereGradient.addColorStop(0.1, '#FFFACD');
        photosphereGradient.addColorStop(0.3, '#FFD700');
        photosphereGradient.addColorStop(0.6, '#FFA500');
        photosphereGradient.addColorStop(0.8, '#FF8C00');
        photosphereGradient.addColorStop(1, '#FF6347');

        ctx.fillStyle = photosphereGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
        ctx.fill();

        this.drawSunspots(ctx, body, radius);
        this.drawSolarSwirls(ctx, body, radius);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawSolarSwirls(ctx, body, radius) {
        const timeOffset = (body.pulsePhase || 0) * 0.02;

        for (let i = 0; i < 5; i++) {
            const centerAngle = (Math.PI * 2 * i) / 5 + timeOffset;
            const centerDistance = radius * (0.3 + (i % 3) * 0.2);
            const centerX = body.x + Math.cos(centerAngle) * centerDistance;
            const centerY = body.y + Math.sin(centerAngle) * centerDistance;

            const swirlRadius = radius * 0.2;
            const swirlIntensity = 0.4;
            const clockwise = (i % 2 === 0) ? 1 : -1;

            for (let arm = 0; arm < 3; arm++) {
                const armAngle = (Math.PI * 2 * arm) / 3;

                ctx.strokeStyle = `rgba(255, 255, 100, ${0.2 + swirlIntensity * 0.2})`;
                ctx.lineWidth = 1 + swirlIntensity * 0.5;
                ctx.lineCap = 'round';
                ctx.beginPath();

                for (let p = 0; p < 12; p++) {
                    const t = p / 12;
                    const spiralDistance = swirlRadius * t;
                    const spiralAngle = armAngle + clockwise * t * Math.PI * 2 + timeOffset;

                    const px = centerX + Math.cos(spiralAngle) * spiralDistance;
                    const py = centerY + Math.sin(spiralAngle) * spiralDistance;

                    if (p === 0) {
                        ctx.moveTo(px, py);
                    } else {
                        ctx.lineTo(px, py);
                    }
                }

                ctx.stroke();

                if (arm === 0) {
                    const centerGradient = ctx.createRadialGradient(
                        centerX, centerY, 0,
                        centerX, centerY, swirlRadius * 0.25
                    );
                    centerGradient.addColorStop(0, `rgba(255, 255, 255, ${swirlIntensity * 0.6})`);
                    centerGradient.addColorStop(0.5, `rgba(255, 220, 100, ${swirlIntensity * 0.3})`);
                    centerGradient.addColorStop(1, 'transparent');

                    ctx.fillStyle = centerGradient;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, swirlRadius * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            for (let flow = 0; flow < 6; flow++) {
                const flowAngle = (Math.PI * 2 * flow) / 6 + timeOffset * 0.5;
                const flowDistance = swirlRadius * 0.8;
                const flowLength = swirlRadius * 0.3;

                const startX = centerX + Math.cos(flowAngle) * flowDistance;
                const startY = centerY + Math.sin(flowAngle) * flowDistance;

                const flowDirection = flowAngle + clockwise * Math.PI * 0.4;
                const endX = startX + Math.cos(flowDirection) * flowLength;
                const endY = startY + Math.sin(flowDirection) * flowLength;

                ctx.strokeStyle = `rgba(255, 180, 0, ${swirlIntensity * 0.4})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }

        for (let cell = 0; cell < 2; cell++) {
            const cellAngle = (Math.PI * cell) + timeOffset * 0.1;
            const cellDistance = radius * 0.5;
            const cellX = body.x + Math.cos(cellAngle) * cellDistance;
            const cellY = body.y + Math.sin(cellAngle) * cellDistance;
            const cellSize = radius * 0.25;

            ctx.strokeStyle = `rgba(255, 200, 0, 0.08)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(cellX, cellY, cellSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            for (let f = 0; f < 4; f++) {
                const fAngle = (Math.PI * 2 * f) / 4 + timeOffset * 0.3;
                const fRadius = cellSize * 0.6;
                const fStartX = cellX + Math.cos(fAngle) * fRadius;
                const fStartY = cellY + Math.sin(fAngle) * fRadius;

                const flowLength = cellSize * 0.3;
                const fEndX = fStartX + Math.cos(fAngle + Math.PI * 0.2) * flowLength;
                const fEndY = fStartY + Math.sin(fAngle + Math.PI * 0.2) * flowLength;

                ctx.strokeStyle = `rgba(255, 160, 0, 0.15)`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(fStartX, fStartY);
                ctx.lineTo(fEndX, fEndY);
                ctx.stroke();
            }
        }
    }

    drawSunspots(ctx, body, radius) {
        if (!body.sunspots) return;

        body.sunspots.forEach(sunspot => {
            const currentTime = Date.now();
            const age = currentTime - sunspot.birthTime;
            const normalizedAge = age / sunspot.lifespan;

            let alpha = 1.0;
            if (normalizedAge < 0.1) {
                alpha = normalizedAge * 10;
            } else if (normalizedAge > 0.8) {
                alpha = (1.0 - normalizedAge) * 5;
            }

            const spotX = body.x + Math.cos(sunspot.angle) * sunspot.distance;
            const spotY = body.y + Math.sin(sunspot.angle) * sunspot.distance;

            const sunspotGradient = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, sunspot.size);
            sunspotGradient.addColorStop(0, `rgba(50, 25, 0, ${0.9 * alpha})`);
            sunspotGradient.addColorStop(0.6, `rgba(100, 50, 0, ${0.7 * alpha})`);
            sunspotGradient.addColorStop(1, `rgba(255, 140, 0, ${0.3 * alpha})`);

            ctx.fillStyle = sunspotGradient;
            ctx.beginPath();
            ctx.arc(spotX, spotY, sunspot.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawNormalBody(ctx, body) {
        ctx.save();
        // 加算合成で本体も光らせる
        ctx.globalCompositeOperation = 'lighter';

        const baseRadius = Math.sqrt(body.mass) * 1.5;
        const pulseMultiplier = 1 + Math.sin(body.pulsePhase || 0) * 0.1;
        const radius = baseRadius * pulseMultiplier;

        for (let layer = 3; layer >= 1; layer--) {
            const auraRadius = radius * (2 + layer * 0.8);
            const auraGradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, auraRadius);
            const intensity = 0.1 / layer;
            auraGradient.addColorStop(0, body.color + Math.floor(intensity * 255).toString(16).padStart(2, '0'));
            auraGradient.addColorStop(0.5, body.color + Math.floor(intensity * 128).toString(16).padStart(2, '0'));
            auraGradient.addColorStop(1, 'transparent');

            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(body.x, body.y, auraRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        const glowGradient = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, radius * 2);
        glowGradient.addColorStop(0, body.color + 'AA');
        glowGradient.addColorStop(0.6, body.color + '44');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        const coreGradient = ctx.createRadialGradient(
            body.x - radius * 0.3, body.y - radius * 0.3, 0,
            body.x, body.y, radius
        );
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.2, '#ffffff');
        coreGradient.addColorStop(0.4, body.color);
        coreGradient.addColorStop(0.7, body.color + 'CC');
        coreGradient.addColorStop(1, body.color + '88');

        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius, 0, Math.PI * 2);
        ctx.fill();

        const energyGradient = ctx.createRadialGradient(
            body.x - radius * 0.2, body.y - radius * 0.2, 0,
            body.x, body.y, radius * 0.6
        );
        energyGradient.addColorStop(0, '#ffffff');
        energyGradient.addColorStop(0.5, body.color + 'DD');
        energyGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = energyGradient;
        ctx.beginPath();
        ctx.arc(body.x, body.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(body.x - radius * 0.4, body.y - radius * 0.4, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
