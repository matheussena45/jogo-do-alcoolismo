/**
 * sprites.js - Renderização Procedural de Sprites
 * Projeto: Jogo Educativo – Seminário de Toxicologia
 * 
 * - Protagonista: HOMER SIMPSON (personagem carismático com reações dinâmicas à escala de álcool)
 * - Veículo do Jogador: Sedã civil contemporâneo neutro (visão traseira com iluminação LED e o Homer ao volante)
 * - 4 Tipos de Obstáculos da Pista Reta:
 *   1. Cones de sinalização viária
 *   2. Pedestres atravessando a pista
 *   3. Outros veículos em tráfego
 *   4. Buracos / Deformidades no pavimento asfáltico
 * - Elementos de cenário neutros (árvores das margens)
 */

export class SpriteRenderer {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Desenha o HOMER SIMPSON na Fase de Consumo com reações dinâmicas
     * e progressivas ao nivelAlcool
     */
    desenharPersonagem(ctx, x, y, size, nivelAlcool, tempoSegundos) {
        ctx.save();
        ctx.translate(x, y);

        // Balanço corporal do Homer sob efeito do álcool
        if (nivelAlcool > 15) {
            const anguloSway = Math.sin(tempoSegundos * 2.3) * (nivelAlcool / 100) * 0.16;
            const desvioX = Math.sin(tempoSegundos * 1.9) * (nivelAlcool / 100) * 13;
            ctx.translate(desvioX, 0);
            ctx.rotate(anguloSway);
        }

        const scale = size / 220;
        ctx.scale(scale, scale);

        // Sombra sob os pés
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 100, 68, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Traço de contorno estilo cartoon
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. Calça Azul Clássica do Homer
        ctx.fillStyle = '#2b659c';
        ctx.beginPath();
        ctx.roundRect(-42, 60, 84, 45, [4, 4, 10, 10]);
        ctx.fill();
        ctx.stroke();

        // 2. Barriga e Camisa Branca Polo do Homer
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-46, 62);
        ctx.bezierCurveTo(-54, 15, -45, -5, -28, -8);
        ctx.lineTo(28, -8);
        ctx.bezierCurveTo(45, -5, 54, 15, 46, 62);
        ctx.bezierCurveTo(30, 74, -30, 74, -46, 62);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gola polo aberta da camisa (dois triângulos brancos)
        ctx.fillStyle = '#ffffff';
        // Gola esquerda
        ctx.beginPath();
        ctx.moveTo(-18, -8);
        ctx.lineTo(-28, 12);
        ctx.lineTo(-4, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Gola direita
        ctx.beginPath();
        ctx.moveTo(18, -8);
        ctx.lineTo(28, 12);
        ctx.lineTo(4, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Abertura da gola mostrando o peito amarelo
        ctx.fillStyle = '#ffd900';
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(10, -8);
        ctx.lineTo(0, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3. Braços amarelos do Homer apoiados
        ctx.fillStyle = '#ffd900';
        ctx.beginPath();
        ctx.ellipse(-48, 28, 14, 26, 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(48, 28, 14, 26, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Cabeça do Homer (Formato clássico de domo cilíndrico amarelo)
        ctx.fillStyle = '#ffd900';
        ctx.beginPath();
        ctx.moveTo(-22, -10);
        ctx.lineTo(-24, -45);
        ctx.bezierCurveTo(-24, -90, 24, -90, 24, -45);
        ctx.lineTo(22, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 5. Cabelo do Homer: Dois fiozinhos em arco no topo da cabeça
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(-5, -84, 11, Math.PI * 1.0, Math.PI * 1.95);
        ctx.arc(6, -83, 10, Math.PI * 1.05, Math.PI * 2.0);
        ctx.stroke();

        // Orelha esquerda e ziguezague de cabelo em "M" (Matt Groening)
        ctx.fillStyle = '#ffd900';
        ctx.beginPath();
        ctx.arc(-24, -42, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-26, -45);
        ctx.lineTo(-22, -41);
        ctx.lineTo(-26, -39);
        ctx.stroke();

        // Linha em M acima da orelha
        ctx.beginPath();
        ctx.moveTo(-24, -54);
        ctx.lineTo(-21, -50);
        ctx.lineTo(-18, -55);
        ctx.lineTo(-15, -49);
        ctx.stroke();

        // Orelha direita
        ctx.beginPath();
        ctx.arc(24, -42, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 6. Área da Barba / Focinho do Homer (Muzzle castanho característico)
        ctx.fillStyle = '#d1b271';
        ctx.beginPath();
        ctx.ellipse(0, -28, 28, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 7. Olhos Grandes e Redondos
        const desenharOlho = (cx, cy) => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        };

        desenharOlho(-11, -48);
        desenharOlho(12, -48);

        // 8. Nariz Redondo de batata do Homer
        ctx.fillStyle = '#ffd900';
        ctx.beginPath();
        ctx.arc(1, -42, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 9. Reações Dinâmicas da Face conforme o nivelAlcool
        if (nivelAlcool < 25) {
            // SÓBRIO: Olhos atentos, pupilas vivas, sorriso calmo
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-10, -47, 3.5, 0, Math.PI * 2);
            ctx.arc(13, -47, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // Ponto de brilho
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-11, -48, 1.2, 0, Math.PI * 2);
            ctx.arc(12, -48, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Sorriso focado
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(1, -28, 15, 0.2, Math.PI - 0.2);
            ctx.stroke();

        } else if (nivelAlcool <= 60) {
            // MODERADO: Pálpebras caídas, sorriso relaxado ("Mmm..."), bochechas coradas
            ctx.fillStyle = '#ffd900';
            ctx.beginPath();
            ctx.arc(-11, -48, 15, Math.PI * 1.05, Math.PI * 1.95);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(12, -48, 15, Math.PI * 1.05, Math.PI * 1.95);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Pupilas relaxadas
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-11, -44, 3, 0, Math.PI * 2);
            ctx.arc(12, -44, 3, 0, Math.PI * 2);
            ctx.fill();

            // Bochechas rosadas por vasodilatação
            ctx.fillStyle = 'rgba(239, 83, 80, 0.55)';
            ctx.beginPath();
            ctx.arc(-22, -35, 7, 0, Math.PI * 2);
            ctx.arc(22, -35, 7, 0, Math.PI * 2);
            ctx.fill();

            // Sorriso aberto com língua do Homer
            ctx.fillStyle = '#d32f2f';
            ctx.beginPath();
            ctx.arc(2, -26, 14, 0.1, Math.PI - 0.1);
            ctx.fill();
            ctx.stroke();

            // Língua
            ctx.fillStyle = '#f48fb1';
            ctx.beginPath();
            ctx.arc(3, -20, 8, 0, Math.PI);
            ctx.fill();

            // Gotinha de baba no canto da boca
            ctx.fillStyle = '#81d4fa';
            ctx.beginPath();
            ctx.arc(15, -18, 3.5, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // SEVERO: Diplopia/estrabismo, olhos em espiral, boca aberta babando e donuts de tontura
            const giroEspiral = tempoSegundos * 4.5;
            ctx.strokeStyle = '#c62828';
            ctx.lineWidth = 2.2;

            [-11, 12].forEach((olhoX, idx) => {
                ctx.beginPath();
                ctx.arc(olhoX, -48, 6, giroEspiral + idx * Math.PI, giroEspiral + idx * Math.PI + Math.PI * 1.5);
                ctx.stroke();
            });

            // Bochechas muito vermelhas
            ctx.fillStyle = 'rgba(211, 47, 47, 0.75)';
            ctx.beginPath();
            ctx.arc(-22, -35, 9, 0, Math.PI * 2);
            ctx.arc(22, -35, 9, 0, Math.PI * 2);
            ctx.fill();

            // Boca torta aberta babando
            ctx.fillStyle = '#b71c1c';
            ctx.beginPath();
            ctx.moveTo(-16, -26);
            ctx.bezierCurveTo(-6, -14, 8, -12, 18, -23);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Fio de baba escorrendo
            ctx.fillStyle = '#4fc3f7';
            ctx.beginPath();
            ctx.moveTo(14, -20);
            ctx.lineTo(17, -8);
            ctx.arc(16, -6, 3, 0, Math.PI * 2);
            ctx.lineTo(13, -20);
            ctx.fill();

            // Rosquinhas (Donuts rosas) e estrelas girando em órbita de vertigem
            const anguloVertigem = tempoSegundos * 3.2;
            for (let i = 0; i < 3; i++) {
                const a = anguloVertigem + (i * Math.PI * 2) / 3;
                const dX = Math.cos(a) * 48;
                const dY = -80 + Math.sin(a) * 14;

                ctx.fillStyle = '#ffb74d';
                ctx.beginPath();
                ctx.arc(dX, dY, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#f06292';
                ctx.beginPath();
                ctx.arc(dX, dY, 7.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffd900';
                ctx.beginPath();
                ctx.arc(dX, dY, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Desenha o Veículo Civil Contemporâneo Neutro do Jogador
     * (Sedã moderno azul-marinho metálico, com barra de LED e a cabeça do Homer visível pelo vidro traseiro)
     */
    desenharCarroJogador(ctx, x, y, width, height, esterco = 0) {
        ctx.save();
        ctx.translate(x, y);

        // Inclinação lateral da carroceria ao esterçar
        const anguloInclinacao = esterco * 0.07;
        ctx.rotate(anguloInclinacao);

        const w = width;
        const h = height;

        // Sombra sob o veículo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.52, h * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pneus traseiros
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-w * 0.47, -h * 0.35, w * 0.15, h * 0.35);
        ctx.fillRect(w * 0.32, -h * 0.35, w * 0.15, h * 0.35);

        // Calotas e freios
        ctx.fillStyle = '#424242';
        ctx.fillRect(-w * 0.44, -h * 0.28, w * 0.09, h * 0.2);
        ctx.fillRect(w * 0.35, -h * 0.28, w * 0.09, h * 0.2);

        // Chassi inferior
        ctx.fillStyle = '#121212';
        ctx.fillRect(-w * 0.41, -h * 0.36, w * 0.82, h * 0.22);

        // Carroceria: Sedã civil contemporâneo em azul marinho metálico
        const gradienteCarroceria = ctx.createLinearGradient(0, -h, 0, -h * 0.3);
        gradienteCarroceria.addColorStop(0, '#283593');
        gradienteCarroceria.addColorStop(0.6, '#1a237e');
        gradienteCarroceria.addColorStop(1, '#0d1642');
        ctx.fillStyle = gradienteCarroceria;

        ctx.beginPath();
        ctx.moveTo(-w * 0.43, -h * 0.32);
        ctx.lineTo(-w * 0.40, -h * 0.65);
        ctx.lineTo(-w * 0.32, -h * 0.95);
        ctx.lineTo(w * 0.32, -h * 0.95);
        ctx.lineTo(w * 0.40, -h * 0.65);
        ctx.lineTo(w * 0.43, -h * 0.32);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0d1b2a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Vidro traseiro escurecido
        const gradienteVidro = ctx.createLinearGradient(0, -h * 0.92, 0, -h * 0.66);
        gradienteVidro.addColorStop(0, '#1c3144');
        gradienteVidro.addColorStop(1, '#000814');
        ctx.fillStyle = gradienteVidro;

        ctx.beginPath();
        ctx.moveTo(-w * 0.28, -h * 0.92);
        ctx.lineTo(w * 0.28, -h * 0.92);
        ctx.lineTo(w * 0.35, -h * 0.68);
        ctx.lineTo(-w * 0.35, -h * 0.68);
        ctx.closePath();
        ctx.fill();

        // Cabeça amarela do Homer Simpson visível pelo vidro traseiro!
        ctx.fillStyle = '#ffd900';
        ctx.beginPath();
        ctx.arc(0, -h * 0.77, h * 0.10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Os dois fiozinhos de cabelo do Homer
        ctx.beginPath();
        ctx.arc(-2, -h * 0.85, 3, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Reflexo no vidro traseiro
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = Math.max(1, w * 0.015);
        ctx.beginPath();
        ctx.moveTo(-w * 0.18, -h * 0.9);
        ctx.lineTo(w * 0.14, -h * 0.72);
        ctx.stroke();

        // Lanternas traseiras em barra de LED contínua
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(-w * 0.39, -h * 0.58, w * 0.78, h * 0.08);

        ctx.fillStyle = '#ff1744';
        ctx.fillRect(-w * 0.38, -h * 0.57, w * 0.18, h * 0.06);
        ctx.fillRect(w * 0.20, -h * 0.57, w * 0.18, h * 0.06);

        // Placa padrão Mercosul neutra: "TOX-2026"
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.14, -h * 0.45, w * 0.28, h * 0.11);
        ctx.fillStyle = '#0d47a1';
        ctx.fillRect(-w * 0.14, -h * 0.45, w * 0.28, h * 0.035);

        ctx.fillStyle = '#111111';
        ctx.font = `bold ${Math.max(9, Math.round(h * 0.065))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TOX-2026', 0, -h * 0.39);

        ctx.restore();
    }

    // =========================================================================
    // 4 TIPOS DE OBSTÁCULOS DA PISTA RETA
    // =========================================================================

    /**
     * Obstáculo 1: Cones de Sinalização de Trânsito
     */
    desenharCone(ctx, x, y, width, height) {
        ctx.save();
        ctx.translate(x, y);

        const w = width;
        const h = height;

        ctx.fillStyle = '#212121';
        ctx.fillRect(-w * 0.5, -h * 0.18, w, h * 0.18);

        ctx.fillStyle = '#ff6d00';
        ctx.beginPath();
        ctx.moveTo(-w * 0.38, -h * 0.18);
        ctx.lineTo(0, -h);
        ctx.lineTo(w * 0.38, -h * 0.18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-w * 0.22, -h * 0.46);
        ctx.lineTo(-w * 0.13, -h * 0.70);
        ctx.lineTo(w * 0.13, -h * 0.70);
        ctx.lineTo(w * 0.22, -h * 0.46);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * Obstáculo 2: Pedestre Atravessando a Pista
     */
    desenharPedestre(ctx, x, y, width, height) {
        ctx.save();
        ctx.translate(x, y);

        const w = width;
        const h = height;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.35, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-w * 0.22, -h * 0.48, w * 0.18, h * 0.48);
        ctx.fillRect(w * 0.04, -h * 0.48, w * 0.18, h * 0.48);

        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(-w * 0.32, -h * 0.82, w * 0.64, h * 0.36, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-w * 0.32, -h * 0.68, w * 0.64, h * 0.06);

        ctx.fillStyle = '#d49a74';
        ctx.beginPath();
        ctx.arc(0, -h * 0.92, w * 0.20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -h * 0.96, w * 0.21, Math.PI, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Obstáculo 3: Outro Veículo Civil em Trânsito
     * Cores vivas + contorno + lanternas com brilho para destacar na pista noturna.
     */
    desenharVeiculoTransito(ctx, x, y, width, height, cor = '#c0392b') {
        ctx.save();
        ctx.translate(x, y);

        const w = width;
        const h = height;
        const contorno = Math.max(1, w * 0.012);

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.5, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pneus
        ctx.fillStyle = '#111111';
        ctx.fillRect(-w * 0.46, -h * 0.30, w * 0.15, h * 0.30);
        ctx.fillRect(w * 0.31, -h * 0.30, w * 0.15, h * 0.30);

        // Carroceria
        ctx.fillStyle = cor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = contorno;
        ctx.beginPath();
        ctx.moveTo(-w * 0.45, -h * 0.20);
        ctx.lineTo(-w * 0.43, -h * 0.60);
        ctx.lineTo(-w * 0.30, -h * 0.97);
        ctx.lineTo(w * 0.30, -h * 0.97);
        ctx.lineTo(w * 0.43, -h * 0.60);
        ctx.lineTo(w * 0.45, -h * 0.20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Brilho do teto
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(-w * 0.28, -h * 0.97, w * 0.56, h * 0.05);

        // Vidro traseiro
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-w * 0.26, -h * 0.92);
        ctx.lineTo(w * 0.26, -h * 0.92);
        ctx.lineTo(w * 0.34, -h * 0.66);
        ctx.lineTo(-w * 0.34, -h * 0.66);
        ctx.closePath();
        ctx.fill();

        // Lanternas traseiras com brilho (visíveis à noite)
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = Math.max(4, w * 0.08);
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(-w * 0.40, -h * 0.54, w * 0.18, h * 0.11);
        ctx.fillRect(w * 0.22, -h * 0.54, w * 0.18, h * 0.11);
        ctx.shadowBlur = 0;

        // Para-choque e placa
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-w * 0.44, -h * 0.30, w * 0.88, h * 0.09);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-w * 0.10, -h * 0.44, w * 0.20, h * 0.09);

        ctx.restore();
    }

    /**
     * Destino Final: Casa do Protagonista (fim do trajeto)
     * (x, y) = centro da base da casa na tela; width/height em pixels.
     */
    desenharCasa(ctx, x, y, width, height) {
        ctx.save();
        ctx.translate(x, y);

        const w = width;
        const h = height;
        const contorno = Math.max(1, w * 0.006);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = contorno;

        // Gramado/jardim da frente
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.75, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chaminé
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(w * 0.22, -h * 0.98, w * 0.09, h * 0.24);
        ctx.strokeRect(w * 0.22, -h * 0.98, w * 0.09, h * 0.24);

        // Paredes
        ctx.fillStyle = '#f5e6c8';
        ctx.fillRect(-w * 0.45, -h * 0.58, w * 0.90, h * 0.58);
        ctx.strokeRect(-w * 0.45, -h * 0.58, w * 0.90, h * 0.58);

        // Telhado
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(-w * 0.52, -h * 0.56);
        ctx.lineTo(0, -h * 0.95);
        ctx.lineTo(w * 0.52, -h * 0.56);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Janelas iluminadas (luz amarela acolhedora)
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = Math.max(6, w * 0.04);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-w * 0.38, -h * 0.46, w * 0.18, h * 0.16);
        ctx.fillRect(w * 0.20, -h * 0.46, w * 0.18, h * 0.16);
        // Janela do sótão
        ctx.beginPath();
        ctx.arc(0, -h * 0.72, w * 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Caixilhos das janelas
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = Math.max(1, w * 0.008);
        [-w * 0.38, w * 0.20].forEach((jx) => {
            ctx.strokeRect(jx, -h * 0.46, w * 0.18, h * 0.16);
            ctx.beginPath();
            ctx.moveTo(jx + w * 0.09, -h * 0.46);
            ctx.lineTo(jx + w * 0.09, -h * 0.30);
            ctx.moveTo(jx, -h * 0.38);
            ctx.lineTo(jx + w * 0.18, -h * 0.38);
            ctx.stroke();
        });

        // Porta de entrada
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = contorno;
        ctx.fillRect(-w * 0.08, -h * 0.34, w * 0.16, h * 0.34);
        ctx.strokeRect(-w * 0.08, -h * 0.34, w * 0.16, h * 0.34);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(w * 0.05, -h * 0.17, Math.max(1, w * 0.012), 0, Math.PI * 2);
        ctx.fill();

        // Placa "CASA"
        if (w > 60) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-w * 0.14, -h * 0.56, w * 0.28, h * 0.08);
            ctx.fillStyle = '#22c55e';
            ctx.font = `bold ${Math.max(8, Math.round(h * 0.06))}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('CASA', 0, -h * 0.52);
        }

        ctx.restore();
    }

    /**
     * Obstáculo 4: Buraco / Deformidade no Asfalto
     */
    desenharBuracoAsfalto(ctx, x, y, width, height) {
        ctx.save();
        ctx.translate(x, y);

        const w = width;
        const h = height;

        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.2, w * 0.48, h * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.2, w * 0.50, h * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#27272a';
        ctx.beginPath();
        ctx.moveTo(-w * 0.45, -h * 0.2);
        ctx.lineTo(-w * 0.65, -h * 0.25);
        ctx.moveTo(w * 0.45, -h * 0.2);
        ctx.lineTo(w * 0.68, -h * 0.18);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Árvores das Margens da Rodovia
     */
    desenharArvore(ctx, x, y, width, height) {
        ctx.save();
        ctx.translate(x, y);

        const w = width;
        const h = height;

        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-w * 0.1, -h * 0.45, w * 0.2, h * 0.45);

        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.arc(0, -h * 0.68, w * 0.48, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(-w * 0.12, -h * 0.72, w * 0.35, 0, Math.PI * 2);
        ctx.arc(w * 0.12, -h * 0.72, w * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

export const spriteRenderer = new SpriteRenderer();
