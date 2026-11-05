/**
 * effects.js - Pipeline de Efeitos Gráficos de Distorção Alcoólica
 * 
 * Implementa em Canvas 2D os efeitos visuais descritos na especificação:
 * - Visão dupla oscilante (diplopia alcoólica / ghosting)
 * - Aberração cromática (separação de canais RGB)
 * - Desfoque progressivo (blur)
 * - Oscilação e inclinação de câmera / horizonte (perda de equilíbrio vestibular)
 * - Efeito de visão tubular / vignette escura
 * - Efeito de impacto/pulso ao beber (flash e ondulação)
 */

export class VisualEffectsPipeline {
    constructor() {
        this.flashIntensity = 0;
        this.flashColor = '#ff5252';
        this.pulseTime = 0;
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Disparado quando o jogador consome uma dose no bar
     */
    triggerDrinkPulse(isAlcoholic = true, intensity = 1.0) {
        this.flashIntensity = isAlcoholic ? Math.min(1.0, 0.4 + intensity * 0.5) : 0.25;
        this.flashColor = isAlcoholic ? '#ff1744' : '#4fc3f7';
        this.pulseTime = 1.0;
    }

    update(dt) {
        if (this.flashIntensity > 0) {
            this.flashIntensity = Math.max(0, this.flashIntensity - dt * 1.8);
        }
        if (this.pulseTime > 0) {
            this.pulseTime = Math.max(0, this.pulseTime - dt * 2.0);
        }
    }

    /**
     * Aplica distorções pré-renderização na matriz de visualização da câmera
     */
    applyCameraTransform(ctx, distortion, width, height) {
        const cx = width / 2;
        const cy = height / 2;

        ctx.translate(cx, cy);

        // Oscilação de rotação (cabeça pendendo)
        if (distortion.horizonTiltRad !== 0) {
            ctx.rotate(distortion.horizonTiltRad);
        }

        // Oscilação vertical (cabeça assentindo / caindo)
        if (distortion.horizonPitchPx !== 0) {
            ctx.translate(0, distortion.horizonPitchPx);
        }

        ctx.translate(-cx, -cy);
    }

    /**
     * Aplica o pós-processamento óptico sobre a tela
     * @param {CanvasRenderingContext2D} ctx Contexto do canvas principal
     * @param {HTMLCanvasElement} canvas Canvas principal
     * @param {Object} distortion Valores retornados por globalState.getVisualDistortion()
     */
    applyPostProcessing(ctx, canvas, distortion) {
        const w = canvas.width;
        const h = canvas.height;

        // 1. Visão Dupla / Ghosting (Diplopia Alcoólica)
        if (distortion.ghostingOffsetPx > 1.0 && distortion.ghostingAlpha > 0.05) {
            ctx.save();
            ctx.globalAlpha = distortion.ghostingAlpha;
            ctx.globalCompositeOperation = 'screen';
            // Desenha imagem clonada levemente deslocada na horizontal e vertical
            ctx.drawImage(
                canvas,
                distortion.ghostingOffsetPx,
                distortion.ghostingOffsetPx * 0.35,
                w,
                h
            );
            ctx.restore();
        }

        // 2. Aberração Cromática / Prisma alcoólico
        if (distortion.chromaticAberrationPx > 1.5) {
            const shift = distortion.chromaticAberrationPx;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.32;
            // Deslocamento avermelhado para a esquerda
            ctx.drawImage(canvas, -shift, 0, w, h);
            // Deslocamento azulado para a direita
            ctx.drawImage(canvas, shift, 0, w, h);
            ctx.restore();
        }

        // 3. Visão Tubular / Perda de Visão Periférica (Vignette)
        if (distortion.tunnelDarkness > 0.05) {
            ctx.save();
            const radius = Math.max(w, h) * 0.65;
            const grad = ctx.createRadialGradient(
                w / 2, h / 2, radius * 0.35,
                w / 2, h / 2, radius
            );
            grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            grad.addColorStop(0.7, `rgba(15, 5, 20, ${distortion.tunnelDarkness * 0.55})`);
            grad.addColorStop(1, `rgba(0, 0, 0, ${distortion.tunnelDarkness * 0.92})`);

            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // 4. Flash / Pulso de ingestão ou choque
        if (this.flashIntensity > 0.01) {
            ctx.save();
            ctx.globalAlpha = this.flashIntensity * 0.45;
            ctx.fillStyle = this.flashColor;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }
    }
}

export const visualEffects = new VisualEffectsPipeline();

