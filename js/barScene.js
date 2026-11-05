/**
 * barScene.js - Fase de Consumo (Tela Inicial do Seminário de Toxicologia)
 * 
 * Permite ao usuário interagir com o catálogo de bebidas (não alcoólicas e alcoólicas),
 * observando em tempo real o impacto toxicológico no bafômetro digital e no protagonista neutro.
 * Inclui o botão de transição: "Voltar para Casa Dirigindo".
 */

import { globalState } from './state.js';
import { CATALOGO_BEBIDAS } from './drinksData.js';
import { spriteRenderer } from './sprites.js';
import { visualEffects } from './effects.js';
import { audio } from './audio.js';

export class BarScene {
    constructor(canvas, onAvancarDirecao) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onAvancarDirecao = onAvancarDirecao;
        this.bebidaModalAtiva = null;
        this.tempo = 0;
        this.ativo = false;

        // Elementos DOM da interface
        this.domContainer = document.getElementById('bar-ui-overlay');
        this.modalElement = document.getElementById('drink-modal');
        this.hudBarraAlcool = document.getElementById('hud-alcohol-fill');
        this.hudValorAlcool = document.getElementById('hud-alcohol-value');
        this.hudStatusAlcool = document.getElementById('hud-alcohol-status');
        this.listaConsumidosElement = document.getElementById('consumed-drinks-list');

        this.initUI();
    }

    start() {
        this.ativo = true;
        this.tempo = 0;
        this.domContainer.classList.remove('hidden');
        this.atualizarHUD();
    }

    stop() {
        this.ativo = false;
        this.domContainer.classList.add('hidden');
        this.fecharModal();
    }

    initUI() {
        const colunaEsquerda = document.getElementById('bar-drinks-left');
        const colunaDireita = document.getElementById('bar-drinks-right');

        colunaEsquerda.innerHTML = '';
        colunaDireita.innerHTML = '';

        // Separação estrita: não alcoólicas na esquerda, alcoólicas na direita
        const itensEsquerda = CATALOGO_BEBIDAS.filter(b => b.tipo === 'nao_alcoolica');
        const itensDireita = CATALOGO_BEBIDAS.filter(b => b.tipo === 'alcoolica');

        const criarCardBebida = (bebida) => {
            const card = document.createElement('button');
            card.className = `drink-card ${bebida.tipo === 'alcoolica' ? 'alcoholic' : 'non-alcoholic'}`;
            card.innerHTML = `
                <div class="drink-card-icon">${bebida.icone}</div>
                <div class="drink-card-info">
                    <span class="drink-card-name">${bebida.nome}</span>
                    <span class="drink-card-badge">${bebida.abv > 0 ? `${bebida.abv.toFixed(1)}% Teor (ABV)` : '0.0% SEM ÁLCOOL'}</span>
                </div>
            `;
            card.addEventListener('mouseenter', () => audio.playBeep(520, 'sine', 0.04));
            card.addEventListener('click', () => this.abrirModal(bebida));
            return card;
        };

        itensEsquerda.forEach(b => colunaEsquerda.appendChild(criarCardBebida(b)));
        itensDireita.forEach(b => colunaDireita.appendChild(criarCardBebida(b)));

        // Botão para avançar: "Voltar para Casa Dirigindo"
        const botaoAvancar = document.getElementById('btn-go-drive');
        botaoAvancar.textContent = '🚗 Voltar para Casa Dirigindo ➔';
        botaoAvancar.addEventListener('click', () => {
            audio.playBeep(640, 'square', 0.12);
            if (this.onAvancarDirecao) {
                this.onAvancarDirecao();
            }
        });

        // Fechar Modal
        const btnFechar = document.getElementById('btn-close-modal');
        btnFechar.addEventListener('click', () => this.fecharModal());

        // Botão de Confirmação de Consumo na Modal
        const btnBeber = document.getElementById('btn-confirm-drink');
        btnBeber.addEventListener('click', () => {
            if (this.bebidaModalAtiva) {
                this.consumirBebida(this.bebidaModalAtiva);
            }
        });
    }

    abrirModal(bebida) {
        this.bebidaModalAtiva = bebida;
        audio.playBeep(480, 'square', 0.08);

        document.getElementById('modal-drink-icon').textContent = bebida.icone;
        document.getElementById('modal-drink-name').textContent = bebida.nome;
        document.getElementById('modal-drink-desc').textContent = bebida.descricao;
        document.getElementById('modal-drink-volume').textContent = `${bebida.volumeMl} ml`;
        document.getElementById('modal-drink-abv').textContent = `${bebida.abv.toFixed(1)}%`;
        document.getElementById('modal-drink-type').textContent = bebida.tipo === 'alcoolica' ? 'Bebida Alcoólica' : 'Sem Álcool (Segura)';
        document.getElementById('modal-drink-fact').textContent = bebida.notaToxicologica;

        const badge = document.getElementById('modal-type-badge');
        badge.className = `modal-badge ${bebida.tipo === 'alcoolica' ? 'badge-alcoholic' : 'badge-safe'}`;
        badge.textContent = bebida.tipo === 'alcoolica' ? 'Contém Etanol' : 'Sem Efeito Psicomotor';

        this.modalElement.classList.remove('hidden');
    }

    fecharModal() {
        this.bebidaModalAtiva = null;
        this.modalElement.classList.add('hidden');
    }

    consumirBebida(bebida) {
        audio.playDrinkSound();
        const nivelAnterior = globalState.nivelAlcool;
        const novoNivel = globalState.consumirBebida(bebida);
        const diferenca = novoNivel - nivelAnterior;

        const ehAlcoolica = bebida.tipo === 'alcoolica';
        visualEffects.triggerDrinkPulse(ehAlcoolica, (bebida.abv * bebida.volumeMl) / 1000);

        this.fecharModal();
        this.atualizarHUD();

        if (ehAlcoolica && diferenca > 10) {
            this.canvas.classList.add('screen-shake');
            setTimeout(() => this.canvas.classList.remove('screen-shake'), 400);
        }
    }

    atualizarHUD() {
        const nivel = globalState.nivelAlcool;
        const relatorio = globalState.getRelatorioToxicologico();

        if (this.hudBarraAlcool) {
            this.hudBarraAlcool.style.width = `${nivel}%`;
            this.hudBarraAlcool.style.backgroundColor = relatorio.cor;
        }

        if (this.hudValorAlcool) {
            this.hudValorAlcool.textContent = `${nivel}%`;
            this.hudValorAlcool.style.color = relatorio.cor;
        }

        if (this.hudStatusAlcool) {
            this.hudStatusAlcool.textContent = `${relatorio.estado}`;
            this.hudStatusAlcool.style.color = relatorio.cor;
        }

        if (this.listaConsumidosElement) {
            if (globalState.bebidasConsumidas.length === 0) {
                this.listaConsumidosElement.innerHTML = '<span class="empty-list">Nenhuma bebida ingerida até o momento.</span>';
            } else {
                this.listaConsumidosElement.innerHTML = globalState.bebidasConsumidas.map(b => `
                    <span class="consumed-pill ${b.tipo === 'alcoolica' ? 'alcoholic' : 'non-alcoholic'}">
                        ${b.icone} ${b.nome} (${b.abv > 0 ? `${b.abv}%` : '0%'})
                    </span>
                `).join('');
            }
        }
    }

    // Alias de compatibilidade
    updateHUD() {
        this.atualizarHUD();
    }

    update(dt) {
        if (!this.ativo) return;
        this.tempo += dt;
        visualEffects.update(dt);
    }

    render() {
        if (!this.ativo) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const distorcao = globalState.getDistorcaoVisual(this.tempo);

        // Cenário elegante e neutro de confraternização
        this.desenharCenarioNeutro(ctx, w, h);

        // Personagem neutro centralizado
        const tamanhoPersonagem = Math.min(w * 0.38, 230);
        const posX = w / 2;
        const posY = h * 0.52;

        spriteRenderer.desenharPersonagem(ctx, posX, posY, tamanhoPersonagem, globalState.nivelAlcool, this.tempo);

        visualEffects.applyPostProcessing(ctx, this.canvas, {
            blurPx: distorcao.desfoquePx,
            ghostingOffsetPx: distorcao.deslocamentoDiplopiaPx,
            ghostingAlpha: distorcao.alfaDiplopia,
            chromaticAberrationPx: distorcao.aberracaoCromaticaPx,
            horizonTiltRad: distorcao.oscilacaoCameraRad,
            horizonPitchPx: 0,
            tunnelDarkness: distorcao.visaoTubular
        });
    }

    desenharCenarioNeutro(ctx, w, h) {
        // Ambiente moderno e sóbrio de confraternização social
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#101728');
        bgGrad.addColorStop(0.5, '#1e293b');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Painel iluminado com título acadêmico formal
        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(w * 0.28, h * 0.02, w * 0.44, 42);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px "Press Start 2P", monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FASE DE CONSUMO', w * 0.5, h * 0.02 + 21);
        ctx.restore();

        // Bancada contemporânea
        const balcaoY = h * 0.72;
        const balcaoGrad = ctx.createLinearGradient(0, balcaoY, 0, h);
        balcaoGrad.addColorStop(0, '#334155');
        balcaoGrad.addColorStop(0.3, '#1e293b');
        balcaoGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = balcaoGrad;
        ctx.fillRect(0, balcaoY, w, h - balcaoY);

        // Borda iluminada em LED neutro
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(0, balcaoY - 4, w, 4);
    }
}
