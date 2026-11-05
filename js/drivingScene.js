/**
 * drivingScene.js - Desafio da Direção em Pista Reta (Seminário de Toxicologia)
 *
 * Implementa:
 * - Pista plana em linha reta contínua (pseudo-3D retrô, sem curvas)
 * - Avanço automático; o jogador controla apenas o deslocamento lateral
 * - Tráfego de carros em 3 faixas + cones, pedestres e buracos
 * - Casa do protagonista no final do trajeto (destino visível se aproximando)
 * - Dificuldade proporcional ao nivelAlcool (densidade, atraso, instabilidade, blur)
 * - Colisão calculada em coordenadas de MUNDO, sincronizada com a linha do carro na tela
 */

import { globalState } from './state.js';
import { spriteRenderer } from './sprites.js';
import { visualEffects } from './effects.js';
import { audio } from './audio.js';

// --- Parâmetros da câmera / pista (unidades de mundo) ---
const LARGURA_PISTA = 2000;          // meia-largura da pista (jogadorX = ±1 é a borda)
const COMPRIMENTO_SEGMENTO = 200;
const DISTANCIA_DESENHO = 150;       // segmentos visíveis à frente (~30 000 unidades)
const ALTURA_CAMERA = 1000;
const PROFUNDIDADE_CAMERA = 0.84;
const FATOR_METROS = 100;            // 100 unidades de mundo = 1 metro exibido no HUD

// O carro do jogador é desenhado fixo em 90% da altura da tela.
// Profundidade (z relativo à câmera) que corresponde exatamente a essa linha:
// y = h/2 + (PROF / z) * ALTURA * h/2  =>  z = PROF * ALTURA * 0.5 / 0.4
const POSICAO_Y_CARRO = 0.90;
const Z_LINHA_CARRO = (PROFUNDIDADE_CAMERA * ALTURA_CAMERA * 0.5) / (POSICAO_Y_CARRO - 0.5); // ≈ 1050

// Dimensões do carro do jogador no mundo (equivalentes aos 320x176 px desenhados)
const LARGURA_MUNDO_JOGADOR = 830;
const FATOR_HITBOX_JOGADOR = 0.78;   // hitbox um pouco menor que a arte
const PROFUNDIDADE_COLISAO = 220;    // comprimento do carro no eixo Z

// Faixas da pista (offset normalizado)
const FAIXAS = [-0.62, 0, 0.62];

// Configuração dos veículos de tráfego (obstáculos): tamanho no mundo + fator de hitbox (menor que a arte)
const CONFIG_VEICULO = { largura: 700, altura: 400, hitbox: 0.80 };

const CORES_CARROS = ['#2563eb', '#dc2626', '#f59e0b', '#10b981', '#e5e7eb', '#a855f7', '#f97316'];

export class DrivingScene {
    constructor(canvas, onVoltarConsumo) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onVoltarConsumo = onVoltarConsumo;
        this.ativo = false;
        this.tempo = 0;

        // Modo debug de hitboxes
        this.debugHitboxes = false;

        // Fila FIFO de comandos (simulação do atraso de resposta)
        this.bufferComandos = [];
        this.comandoAtual = { esquerda: false, direita: false };

        // Física do veículo
        this.jogadorX = 0;
        this.jogadorZ = 0;
        this.velocidade = 0;
        this.velocidadeCruzeiro = 9200;
        this.velocidadeMaxima = 10000;
        this.taxaAceleracao = 3000;
        this.atritoGrama = 4800;
        this.velocidadeLateral = 0;

        // Puxões involuntários (o carro se move sozinho quando alcoolizado)
        this.tempoProximoPuxao = 3.5;
        this.puxaoAtivo = false;
        this.tempoRestantePuxao = 0;
        this.direcaoPuxao = 0;
        this.forcaPuxaoAtual = 0;

        // Mundo
        this.segmentos = [];
        this.obstaculos = [];
        this.metaZ = 0;   // posição Z em que o trajeto é concluído
        this.casaZ = 0;   // posição Z onde a casa é desenhada

        // DOM
        this.domContainer = document.getElementById('driving-ui-overlay');
        this.displayVelocidade = document.getElementById('hud-speed-value');
        this.displayAtraso = document.getElementById('hud-lag-value');
        this.displayDistancia = document.getElementById('hud-distance-value');
        this.displayAlcool = document.getElementById('hud-driving-bac');
        this.modalResultado = document.getElementById('result-modal');
        this.touchBtnEsq = document.getElementById('btn-touch-left');
        this.touchBtnDir = document.getElementById('btn-touch-right');

        this.setupTeclado();
        this.setupTouch();
        this.setupBotoesResultado();
    }

    start() {
        this.ativo = true;
        this.tempo = 0;
        this.jogadorX = 0;
        this.jogadorZ = 0;
        this.velocidade = 0;
        this.velocidadeLateral = 0;
        this.bufferComandos = [];
        this.comandoAtual = { esquerda: false, direita: false };

        this.tempoProximoPuxao = 2.5 + Math.random() * 2.0;
        this.puxaoAtivo = false;
        this.tempoRestantePuxao = 0;
        this.direcaoPuxao = 0;
        this.forcaPuxaoAtual = 0;

        globalState.stats.tempoInicio = Date.now();
        globalState.stats.colidiu = false;
        globalState.stats.concluido = false;
        globalState.stats.colisoes = 0;
        globalState.stats.distanciaPercorrida = 0;
        globalState.stats.desviosRealizados = 0;

        // Sob efeito de álcool o trajeto fica mais longo (desorientação)
        globalState.stats.distanciaMeta = Math.round(
            globalState.stats.distanciaMetaBase * (1 + (globalState.nivelAlcool / 100) * 0.4)
        );

        this.metaZ = globalState.stats.distanciaMeta * FATOR_METROS;
        // A casa fica um pouco à frente da linha do carro no momento da chegada,
        // garantindo que ela apareça grande e centralizada na tela final.
        this.casaZ = this.metaZ + Z_LINHA_CARRO + 1500;

        this.domContainer.classList.remove('hidden');
        this.modalResultado.classList.add('hidden');

        this.construirPistaReta();
        this.gerarObstaculos();

        audio.startEngine();
        audio.startRetroMusic();
    }

    stop() {
        this.ativo = false;
        this.domContainer.classList.add('hidden');
        audio.stopEngine();
        audio.stopRetroMusic();
    }

    // =========================================================================
    // CONTROLES
    // =========================================================================

    setupTeclado() {
        window.addEventListener('keydown', (e) => {
            if (!this.ativo) return;
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') {
                this.comandoAtual.esquerda = true;
                this.touchBtnEsq?.classList.add('touch-active');
            }
            if (k === 'arrowright' || k === 'd') {
                this.comandoAtual.direita = true;
                this.touchBtnDir?.classList.add('touch-active');
            }
        });

        window.addEventListener('keyup', (e) => {
            if (!this.ativo) return;
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') {
                this.comandoAtual.esquerda = false;
                this.touchBtnEsq?.classList.remove('touch-active');
            }
            if (k === 'arrowright' || k === 'd') {
                this.comandoAtual.direita = false;
                this.touchBtnDir?.classList.remove('touch-active');
            }
        });
    }

    setupTouch() {
        if (!this.touchBtnEsq || !this.touchBtnDir) return;

        const vincularToque = (btn, ehEsquerda) => {
            const iniciar = (e) => {
                e.preventDefault();
                if (!this.ativo) return;
                if (ehEsquerda) this.comandoAtual.esquerda = true;
                else this.comandoAtual.direita = true;
                btn.classList.add('touch-active');
            };
            const finalizar = (e) => {
                e.preventDefault();
                if (ehEsquerda) this.comandoAtual.esquerda = false;
                else this.comandoAtual.direita = false;
                btn.classList.remove('touch-active');
            };

            btn.addEventListener('touchstart', iniciar, { passive: false });
            btn.addEventListener('touchend', finalizar, { passive: false });
            btn.addEventListener('touchcancel', finalizar, { passive: false });
            btn.addEventListener('mousedown', iniciar);
            btn.addEventListener('mouseup', finalizar);
            btn.addEventListener('mouseleave', finalizar);
        };

        vincularToque(this.touchBtnEsq, true);
        vincularToque(this.touchBtnDir, false);
    }

    setupBotoesResultado() {
        document.getElementById('btn-retry-driving')?.addEventListener('click', () => {
            this.modalResultado.classList.add('hidden');
            this.start();
        });

        document.getElementById('btn-back-to-bar')?.addEventListener('click', () => {
            this.modalResultado.classList.add('hidden');
            this.stop();
            if (this.onVoltarConsumo) this.onVoltarConsumo();
        });
    }

    // =========================================================================
    // CONSTRUÇÃO DO MUNDO
    // =========================================================================

    /**
     * Pista plana e reta. O número de segmentos cobre todo o trajeto
     * até a casa + a distância de desenho (sem loop).
     */
    construirPistaReta() {
        this.segmentos = [];
        const total = Math.ceil((this.casaZ + 4000) / COMPRIMENTO_SEGMENTO) + DISTANCIA_DESENHO;
        const zLinhaChegada = this.metaZ + Z_LINHA_CARRO;

        for (let n = 0; n < total; n++) {
            const z = n * COMPRIMENTO_SEGMENTO;
            const listrado = Math.floor(n / 3) % 2;

            let cor = listrado
                ? { road: '#2f2f33', grass: '#15803d', rumble: '#dc2626', lane: '#fafafa' }
                : { road: '#3a3a40', grass: '#166534', rumble: '#ffffff', lane: null };

            // Faixa de chegada quadriculada
            if (z >= zLinhaChegada && z < zLinhaChegada + COMPRIMENTO_SEGMENTO * 2) {
                cor = { road: n % 2 ? '#f5f5f5' : '#111111', grass: '#166534', rumble: '#ffffff', lane: null };
            }
            // Entrada da garagem (calçamento claro) até a casa
            else if (z >= zLinhaChegada + COMPRIMENTO_SEGMENTO * 2 && z < this.casaZ) {
                cor = { road: '#a8a29e', grass: listrado ? '#15803d' : '#166534', rumble: '#d6d3d1', lane: null };
            }
            // Depois da casa: só gramado
            else if (z >= this.casaZ) {
                const g = listrado ? '#15803d' : '#166534';
                cor = { road: g, grass: g, rumble: g, lane: null };
            }

            const seg = {
                index: n,
                p1: { world: { x: 0, y: 0, z: z }, camera: {}, screen: {} },
                p2: { world: { x: 0, y: 0, z: z + COMPRIMENTO_SEGMENTO }, camera: {}, screen: {} },
                cor: cor,
                arvores: []
            };

            // Árvores nas margens (até a casa)
            if (n % 8 === 0 && z < this.casaZ - 2000) {
                seg.arvores.push({ offset: -1.45 - Math.random() * 0.35 });
                seg.arvores.push({ offset: 1.45 + Math.random() * 0.35 });
            }

            this.segmentos.push(seg);
        }
    }

    /**
     * Distribui veículos ao longo do trajeto com garantia matemática de corredor livre:
     * - Onda simples: 1 carro na pista (2 faixas livres).
     * - Onda dupla: 2 carros lado a lado (1 faixa 100% livre).
     * - NUNCA gera 3 carros juntos bloqueando a pista inteira.
     * - Velocidade uniforme para todo o tráfego: evita que carros de trás alcancem os da frente
     *   e formem barreiras intransponíveis durante a corrida.
     * - Espaçamento mínimo e transição suave entre faixas para dar tempo de desvio com reflexo reduzido.
     */
    gerarObstaculos() {
        this.obstaculos = [];
        const multiplicador = globalState.getMultiplicadorDensidadeObstaculos();
        const nivel = globalState.nivelAlcool / 100;

        // Espaçamento seguro entre ondas (mínimo de 6500 unidades para permitir manobra mesmo com atraso de input)
        const espacamentoMinimo = 6500;
        const espacamentoBase = Math.max(espacamentoMinimo, 9500 / multiplicador);

        const zInicio = 14000;                  // ~1.5 s de pista livre no início
        const zFim = this.metaZ - 4500;         // pista livre antes da chegada à casa
        let id = 0;
        let z = zInicio;
        let faixaLivreGarantida = -1;

        while (z < zFim) {
            // Chance de onda com 2 carros lado a lado:
            // Sóbrio: 15% | Embriagado: até 40%
            const ehOndaDupla = Math.random() < (0.15 + nivel * 0.25);

            if (ehOndaDupla) {
                // Escolhe 1 faixa para ficar 100% LIVRE garantida (0, 1 ou 2)
                // Se havia uma faixa livre na onda anterior, priorizamos mantê-la para não exigir chicane impossível
                let faixaLivre;
                if (faixaLivreGarantida !== -1 && Math.random() < 0.60) {
                    faixaLivre = faixaLivreGarantida;
                } else {
                    faixaLivre = Math.floor(Math.random() * FAIXAS.length);
                }

                const faixasOcupadas = [0, 1, 2].filter((f) => f !== faixaLivre);
                for (const f of faixasOcupadas) {
                    this.obstaculos.push(this.criarObstaculo(id++, z, f));
                }

                faixaLivreGarantida = faixaLivre;
                // Buffer extra após onda dupla para o motorista respirar e reposicionar o veículo
                z += espacamentoBase * (1.15 + Math.random() * 0.30);
            } else {
                // Onda simples: apenas 1 carro, deixando 2 faixas totalmente abertas
                let faixaOcupada;
                if (faixaLivreGarantida !== -1 && Math.random() < 0.65) {
                    // Evita colocar o carro exatamente na faixa que o jogador acabou de usar para desviar
                    const outrasFaixas = [0, 1, 2].filter((f) => f !== faixaLivreGarantida);
                    faixaOcupada = outrasFaixas[Math.floor(Math.random() * outrasFaixas.length)];
                } else {
                    faixaOcupada = Math.floor(Math.random() * FAIXAS.length);
                }

                this.obstaculos.push(this.criarObstaculo(id++, z, faixaOcupada));
                // Define uma das faixas livres restantes para suavizar a próxima onda
                const livres = [0, 1, 2].filter((f) => f !== faixaOcupada);
                faixaLivreGarantida = livres[Math.floor(Math.random() * livres.length)];

                z += espacamentoBase * (0.85 + Math.random() * 0.35);
            }
        }
    }

    criarObstaculo(id, z, faixa) {
        return {
            id,
            tipo: 'veiculo',
            z,
            zAnterior: z,
            faixa,
            offset: FAIXAS[faixa], // alinhado na faixa para manter vão amplo nas faixas livres
            // Velocidade uniforme em todo o tráfego: impede aglomerações e "paredes" acidentais
            velocidade: 3000,
            cor: CORES_CARROS[id % CORES_CARROS.length],
            largura: CONFIG_VEICULO.largura,
            altura: CONFIG_VEICULO.altura,
            fatorHitbox: CONFIG_VEICULO.hitbox,
            ultrapassado: false
        };
    }

    // =========================================================================
    // PROJEÇÃO PSEUDO-3D
    // =========================================================================

    project(p, cameraX, cameraY, cameraZ, width, height) {
        p.camera.x = p.world.x - cameraX;
        p.camera.y = p.world.y - cameraY;
        p.camera.z = p.world.z - cameraZ;

        p.screen.scale = PROFUNDIDADE_CAMERA / Math.max(1, p.camera.z);
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round(p.screen.scale * LARGURA_PISTA * width / 2);
    }

    /**
     * Projeta um objeto do mundo (z relativo à câmera, x em unidades de mundo)
     * e retorna posição na tela e a escala para converter tamanhos de mundo em pixels.
     * Tamanho em pixels = tamanhoMundo * escalaPx (mesma escala usada pela pista).
     */
    projetarObjeto(zRelativo, xMundo, w, h) {
        const escala = PROFUNDIDADE_CAMERA / zRelativo;
        const cameraX = this.jogadorX * LARGURA_PISTA;
        return {
            x: (w / 2) + escala * (xMundo - cameraX) * (w / 2),
            y: (h / 2) + escala * ALTURA_CAMERA * (h / 2),
            escalaPx: escala * (w / 2)
        };
    }

    // =========================================================================
    // ATUALIZAÇÃO (FÍSICA + COLISÃO)
    // =========================================================================

    update(dt) {
        if (!this.ativo) return;
        this.tempo += dt;
        visualEffects.update(dt);

        const agora = performance.now();
        const atrasoMs = globalState.getAtrasoRespostaMs();

        // 1. Fila de comandos com atraso de resposta (input lag)
        this.bufferComandos.push({
            timestamp: agora,
            esquerda: this.comandoAtual.esquerda,
            direita: this.comandoAtual.direita
        });

        const tempoAlvo = agora - atrasoMs;
        let comandoEfetivo = { esquerda: false, direita: false };
        while (this.bufferComandos.length > 0 && this.bufferComandos[0].timestamp <= tempoAlvo) {
            comandoEfetivo = this.bufferComandos.shift();
        }
        if (atrasoMs <= 0 || this.bufferComandos.length === 0) {
            comandoEfetivo = { ...this.comandoAtual };
        }

        // 2. Aceleração automática (mais lenta fora da pista)
        let velocidadeAlvo = this.velocidadeCruzeiro;
        if (Math.abs(this.jogadorX) > 1.05) {
            velocidadeAlvo = 4600;
        }
        if (this.velocidade < velocidadeAlvo) {
            this.velocidade = Math.min(velocidadeAlvo, this.velocidade + this.taxaAceleracao * dt);
        } else {
            this.velocidade = Math.max(velocidadeAlvo, this.velocidade - this.atritoGrama * dt);
        }

        // 3. Física lateral com sobresterço toxicológico
        const fisica = globalState.getFisicaDirecao();
        let direcaoDesejada = 0;
        if (comandoEfetivo.esquerda) direcaoDesejada -= 1;
        if (comandoEfetivo.direita) direcaoDesejada += 1;
        this.velocidadeLateral += direcaoDesejada * fisica.precisao * dt * 4.6 * fisica.sobresterco;

        // 3.1 Puxões involuntários: o carro se move sozinho quando alcoolizado
        this.aplicarPuxaoInvoluntario(dt);

        // 3.2 Atrito direcional + micro-oscilações
        this.velocidadeLateral *= Math.pow(fisica.decay, dt * 60);
        this.velocidadeLateral += globalState.getOscilacaoInvoluntaria(this.tempo) * (this.velocidade / this.velocidadeMaxima);

        this.jogadorX += this.velocidadeLateral * dt * 2.2;
        this.jogadorX = Math.max(-2.0, Math.min(2.0, this.jogadorX));

        // 4. Avanço longitudinal do jogador e do tráfego
        const zJogadorAnterior = this.jogadorZ;
        const zCarroAnterior = zJogadorAnterior + Z_LINHA_CARRO;
        this.jogadorZ += this.velocidade * dt;
        const zCarroAtual = this.jogadorZ + Z_LINHA_CARRO;

        // Limite da rodovia antes da entrada da casa (carros desaparecem ao atingir o fim da via)
        const zLimiteRodovia = this.metaZ - 400;
        let menorDistanciaTransito = Infinity;

        for (const obs of this.obstaculos) {
            obs.zAnterior = obs.z;
            obs.z += obs.velocidade * dt;

            // Calcula proximidade dos carros ao redor para o som de pneus do trânsito no asfalto
            const distZ = Math.abs(obs.z - zCarroAtual);
            if (distZ < menorDistanciaTransito) {
                menorDistanciaTransito = distZ;
            }
        }

        globalState.stats.distanciaPercorrida = Math.min(
            globalState.stats.distanciaMeta,
            Math.floor(this.jogadorZ / FATOR_METROS)
        );

        // 5. Colisão (checada ANTES dos sons de ultrapassagem para que batidas toquem apenas o som de colisão)
        if (this.verificarColisoes(zJogadorAnterior)) return;

        // 5.1 Sons de ultrapassagem e buzina ocasional (apenas quando NÃO houve colisão)
        let menorOffsetUltrapassagem = null;
        for (const obs of this.obstaculos) {
            const lateralOffset = obs.offset - this.jogadorX;

            // Buzina ocasional de ambientação no trânsito (apenas de vez em quando)
            if (!obs.buzinou && obs.z > zCarroAtual && (obs.z - zCarroAtual) < 3500 && Math.abs(lateralOffset) < 0.55) {
                obs.buzinou = true;
                if (Math.random() < 0.25) {
                    audio.playHorn(0.38);
                }
            }

            // Dispara o som ~0.40s ANTES de cruzar o veículo (distRelativa <= 2400),
            // para que o áudio comece antes da ultrapassagem, atinja o pico exatamente ao lado do carro e termine após passar
            const distRelativaAnterior = obs.zAnterior - zCarroAnterior;
            const distRelativaAtual = obs.z - zCarroAtual;
            const emRotaDeColisao = Math.abs(lateralOffset * LARGURA_PISTA) <
                ((LARGURA_MUNDO_JOGADOR * FATOR_HITBOX_JOGADOR) / 2 + (obs.largura * obs.fatorHitbox) / 2);

            if (!obs.ultrapassado && !emRotaDeColisao && distRelativaAtual <= 2400 && distRelativaAtual > -100) {
                obs.ultrapassado = true;
                if (menorOffsetUltrapassagem === null || Math.abs(lateralOffset) < Math.abs(menorOffsetUltrapassagem)) {
                    menorOffsetUltrapassagem = lateralOffset;
                }
            }
        }

        if (menorOffsetUltrapassagem !== null) {
            audio.playTrafficPass(menorOffsetUltrapassagem);
        }

        // Remove veículos que chegaram ao final do mapa para que nunca atravessem a casa
        this.obstaculos = this.obstaculos.filter((obs) => obs.z < zLimiteRodovia);

        // Intensidade sonora do tráfego próximo (0.0 a 1.0 quando há carros a menos de 9000 unidades)
        const proximidadeTransito = menorDistanciaTransito < 9000
            ? Math.max(0, 1 - menorDistanciaTransito / 9000)
            : 0;
        audio.updateEngine(
            this.velocidade / this.velocidadeMaxima,
            Math.abs(this.jogadorX) > 1.05,
            proximidadeTransito
        );

        // 6. Chegada em casa
        if (this.jogadorZ >= this.metaZ) {
            this.concluirTrajeto();
            return;
        }

        this.atualizarHUD(atrasoMs);
    }

    aplicarPuxaoInvoluntario(dt) {
        const params = globalState.getParametrosPuxaoInvoluntario();
        if (!params || this.velocidade <= 3000) return;

        if (this.puxaoAtivo) {
            this.velocidadeLateral += this.direcaoPuxao * this.forcaPuxaoAtual * dt * 3.6;
            this.tempoRestantePuxao -= dt;
            if (this.tempoRestantePuxao <= 0) {
                this.puxaoAtivo = false;
                this.tempoProximoPuxao = params.intervaloMin + Math.random() * (params.intervaloMax - params.intervaloMin);
            }
            return;
        }

        this.tempoProximoPuxao -= dt;
        if (this.tempoProximoPuxao <= 0) {
            this.puxaoAtivo = true;
            this.tempoRestantePuxao = params.duracao;
            this.forcaPuxaoAtual = params.forca;
            if (this.jogadorX > 0.5) this.direcaoPuxao = -1;
            else if (this.jogadorX < -0.5) this.direcaoPuxao = 1;
            else this.direcaoPuxao = Math.random() < 0.5 ? -1 : 1;
        }
    }

    /**
     * Colisão em coordenadas de mundo, sincronizada com o desenho:
     * - Eixo Z: o obstáculo precisa CRUZAR a linha do carro (Z_LINHA_CARRO ± PROFUNDIDADE_COLISAO)
     *   neste frame. Como essa linha é exatamente onde o carro é desenhado (90% da tela),
     *   o obstáculo está visível e encostado no carro no instante da batida.
     * - Eixo X: sobreposição das meias-larguras das hitboxes (menores que as artes).
     * A checagem por intervalo evita "atravessar" obstáculos em frames lentos.
     */
    verificarColisoes(zJogadorAnterior) {
        const meiaLarguraJogador = (LARGURA_MUNDO_JOGADOR * FATOR_HITBOX_JOGADOR) / 2;
        const xJogador = this.jogadorX * LARGURA_PISTA;
        const zMin = Z_LINHA_CARRO - PROFUNDIDADE_COLISAO;
        const zMax = Z_LINHA_CARRO + PROFUNDIDADE_COLISAO;

        // 1. Colisão contra veículos de tráfego na pista
        for (const obs of this.obstaculos) {
            const relAnterior = obs.zAnterior - zJogadorAnterior;
            const relAtual = obs.z - this.jogadorZ;
            const menor = Math.min(relAnterior, relAtual);
            const maior = Math.max(relAnterior, relAtual);

            if (maior < zMin || menor > zMax) continue;

            const meiaLarguraObs = (obs.largura * obs.fatorHitbox) / 2;
            const xObs = obs.offset * LARGURA_PISTA;

            if (Math.abs(xObs - xJogador) < meiaLarguraJogador + meiaLarguraObs) {
                this.registrarColisao('Colisão traseira contra outro veículo na pista', 'veiculo');
                return true;
            }
        }

        // 2. Colisão contra árvores nas margens (ao sair da pista ou desviar excessivamente)
        const indiceMin = Math.max(0, Math.floor((zJogadorAnterior + zMin) / COMPRIMENTO_SEGMENTO) - 1);
        const indiceMax = Math.min(this.segmentos.length - 1, Math.ceil((this.jogadorZ + zMax) / COMPRIMENTO_SEGMENTO) + 1);

        for (let n = indiceMin; n <= indiceMax; n++) {
            const seg = this.segmentos[n];
            if (!seg || !seg.arvores || seg.arvores.length === 0) continue;

            const zArvore = seg.p1.world.z;
            const relAnterior = zArvore - zJogadorAnterior;
            const relAtual = zArvore - this.jogadorZ;
            const menor = Math.min(relAnterior, relAtual);
            const maior = Math.max(relAnterior, relAtual);

            if (maior < zMin || menor > zMax) continue;

            for (const arv of seg.arvores) {
                const xArvore = arv.offset * LARGURA_PISTA;
                const meiaLarguraArvore = 260; // hitbox do tronco e copa da árvore

                if (Math.abs(xArvore - xJogador) < meiaLarguraJogador + meiaLarguraArvore) {
                    this.registrarColisao('Colisão violenta contra árvore na margem da pista', 'arvore');
                    return true;
                }
            }
        }

        return false;
    }

    registrarColisao(motivo, tipo) {
        this.ativo = false;
        globalState.stats.colidiu = true;
        globalState.stats.motivoColisao = motivo;
        globalState.stats.tipoObstaculoColidido = tipo;

        audio.stopEngine();
        audio.playCrash();
        this.canvas.classList.add('screen-shake');
        setTimeout(() => this.canvas.classList.remove('screen-shake'), 700);

        this.exibirModalResultado(false);
    }

    concluirTrajeto() {
        this.ativo = false;
        globalState.stats.concluido = true;
        globalState.stats.distanciaPercorrida = globalState.stats.distanciaMeta;
        // Limpa os carros do cenário ao chegar em casa (fim do mapa)
        this.obstaculos = [];
        audio.stopEngine();
        this.render(true); // último quadro limpo com a casa à frente
        this.exibirModalResultado(true);
    }

    // =========================================================================
    // FEEDBACK ACADÊMICO
    // =========================================================================

    exibirModalResultado(sucesso) {
        const modal = this.modalResultado;
        const title = document.getElementById('result-title');
        const badge = document.getElementById('result-status-badge');
        const statsContent = document.getElementById('result-stats-content');
        const eduMessage = document.getElementById('result-educational-message');

        const relatorio = globalState.getRelatorioToxicologico();
        const atrasoMs = globalState.getAtrasoRespostaMs();
        const distPercorrida = globalState.stats.distanciaPercorrida;
        const distMeta = globalState.stats.distanciaMeta;
        const velKmh = Math.round((this.velocidade / this.velocidadeCruzeiro) * 120);

        if (sucesso) {
            title.textContent = '🏠 CHEGADA EM CASA: RELATÓRIO DO TRAJETO';
            badge.textContent = globalState.nivelAlcool === 0
                ? 'CONDUÇÃO SEGURA – REFLEXOS INTACTOS (0.00 g/L)'
                : 'ALERTA TOXICOLÓGICO: CONDUTA DE ALTO RISCO';
            badge.className = `result-badge ${globalState.nivelAlcool === 0 ? 'badge-safe' : 'badge-warning'}`;
        } else {
            title.textContent = '💥 SINISTRO DE TRÂNSITO REGISTRADO!';
            badge.textContent = `LAUDO: ${globalState.stats.motivoColisao.toUpperCase()}`;
            badge.className = 'result-badge badge-danger';
        }

        statsContent.innerHTML = `
            <div class="result-metric">
                <span class="metric-label">Nível de Álcool / Classificação:</span>
                <span class="metric-val" style="color: ${relatorio.cor}; font-weight: bold;">${globalState.nivelAlcool}% (${relatorio.estado})</span>
            </div>
            <div class="result-metric">
                <span class="metric-label">Estimativa Toxicológica (TAS):</span>
                <span class="metric-val">${relatorio.tasEstimada}</span>
            </div>
            <div class="result-metric">
                <span class="metric-label">Atraso Psicomotor de Resposta:</span>
                <span class="metric-val" style="color: ${atrasoMs > 200 ? '#e74c3c' : '#2ecc71'}; font-weight: bold;">+${atrasoMs} ms</span>
            </div>
            <div class="result-metric">
                <span class="metric-label">Distância Percorrida até em Casa:</span>
                <span class="metric-val">${distPercorrida} m / ${distMeta} m</span>
            </div>
            <div class="result-metric">
                <span class="metric-label">Efeito Sináptico no SNC:</span>
                <span class="metric-val">${relatorio.impactoSNC}</span>
            </div>
        `;

        if (sucesso) {
            if (globalState.nivelAlcool === 0) {
                eduMessage.innerHTML = `
                    <div class="edu-box safe">
                        <h4>🟢 Conclusão do Seminário: O Estado Sóbrio Salva Vidas</h4>
                        <p>Com <strong>0% de álcool (0.00 g/L)</strong>, sua latência de resposta foi instantânea, a acuidade visual periférica manteve-se nítida e todos os desvios foram efetuados com precisão de trajetória.</p>
                        <p>No trânsito real, a tolerância zero adotada pela legislação brasileira é estritamente respaldada pela toxicologia: qualquer dose de etanol já inicia a depressão das funções executivas do córtex pré-frontal.</p>
                    </div>
                `;
            } else {
                eduMessage.innerHTML = `
                    <div class="edu-box danger">
                        <h4>⚠️ Conclusão do Seminário: Sobrevivência por Mera Sorte Estatística</h4>
                        <p>Mesmo chegando em casa, você dirigiu com <strong>${globalState.nivelAlcool}% de álcool</strong> e um atraso motor de <strong>+${atrasoMs} ms</strong>, num trajeto <strong>${distMeta - globalState.stats.distanciaMetaBase} m mais longo</strong> pela desorientação.</p>
                        <p>Estudos epidemiológicos demonstram que motoristas sob efeito de álcool frequentemente superestimam sua capacidade, ignorando que o tempo de reação aumentado transforma qualquer frenagem de emergência em impacto inevitável.</p>
                    </div>
                `;
            }
        } else {
            eduMessage.innerHTML = `
                <div class="edu-box danger">
                    <h4>🔬 Parecer Toxicológico do Sinistro:</h4>
                    <p>A <strong>${velKmh || 120} km/h</strong>, o veículo percorre mais de <strong>33 metros a cada segundo</strong>. Com um atraso de resposta de <strong>${atrasoMs} ms</strong>, seu veículo percorreu aproximadamente <strong>${Math.round((33 * atrasoMs) / 1000)} metros às cegas</strong> antes que o comando de desvio surtisse efeito.</p>
                    <p>O álcool reduz o tempo de resposta e altera o campo de visão periférico. <strong>Não misture bebida e direção.</strong></p>
                </div>
            `;
        }

        modal.classList.remove('hidden');
    }

    atualizarHUD(atrasoMs) {
        const velKmh = Math.round((this.velocidade / this.velocidadeCruzeiro) * 120);
        if (this.displayVelocidade) this.displayVelocidade.textContent = `${velKmh} KM/H`;
        if (this.displayAtraso) {
            this.displayAtraso.textContent = `ATRASO: +${atrasoMs}ms`;
            this.displayAtraso.style.color = atrasoMs > 180 ? '#ef4444' : '#22c55e';
        }
        if (this.displayDistancia) {
            const restante = Math.max(0, globalState.stats.distanciaMeta - globalState.stats.distanciaPercorrida);
            this.displayDistancia.textContent = `🏠 CASA: faltam ${restante}m`;
        }
        if (this.displayAlcool) {
            this.displayAlcool.textContent = `ÁLCOOL: ${globalState.nivelAlcool}%`;
        }
    }

    // =========================================================================
    // RENDERIZAÇÃO
    // =========================================================================

    render(forcar = false) {
        if (!this.ativo && !forcar) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const distorcao = globalState.getDistorcaoVisual(this.tempo);

        ctx.save();
        visualEffects.applyCameraTransform(ctx, {
            horizonTiltRad: distorcao.oscilacaoCameraRad,
            horizonPitchPx: 0
        }, w, h);

        this.desenharCeuNoturno(ctx, w, h);
        this.desenharPista(ctx, w, h);
        this.desenharObjetos(ctx, w, h);

        // Carro do jogador fixo na linha Z_LINHA_CARRO (90% da altura)
        const playerW = 320;
        const playerH = 176;
        const playerX = w / 2;
        const playerY = h * POSICAO_Y_CARRO;
        spriteRenderer.desenharCarroJogador(ctx, playerX, playerY, playerW, playerH, this.velocidadeLateral);

        if (this.debugHitboxes) {
            const escalaPx = (PROFUNDIDADE_CAMERA / Z_LINHA_CARRO) * (w / 2);
            const larguraHit = LARGURA_MUNDO_JOGADOR * FATOR_HITBOX_JOGADOR * escalaPx;
            this.desenharCaixaDebug(ctx, playerX - larguraHit / 2, playerY - playerH * 0.6, larguraHit, playerH * 0.6, '#22c55e');
        }

        ctx.restore();

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

    desenharPista(ctx, w, h) {
        const indiceBase = Math.floor(this.jogadorZ / COMPRIMENTO_SEGMENTO);
        const cameraX = this.jogadorX * LARGURA_PISTA;
        let maxY = h;

        for (let n = 0; n < DISTANCIA_DESENHO; n++) {
            const seg = this.segmentos[indiceBase + n];
            if (!seg) break;

            this.project(seg.p1, cameraX, ALTURA_CAMERA, this.jogadorZ, w, h);
            this.project(seg.p2, cameraX, ALTURA_CAMERA, this.jogadorZ, w, h);

            if (seg.p1.camera.z <= PROFUNDIDADE_CAMERA || seg.p2.screen.y >= maxY) continue;

            this.desenharSegmento(ctx, w,
                seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w,
                seg.p2.screen.x, seg.p2.screen.y, seg.p2.screen.w,
                seg.cor);

            maxY = seg.p2.screen.y;
        }
    }

    /**
     * Desenha árvores, obstáculos e a casa ordenados do mais distante para o mais
     * próximo (algoritmo do pintor), usando a mesma projeção da pista.
     */
    desenharObjetos(ctx, w, h) {
        const distanciaMax = DISTANCIA_DESENHO * COMPRIMENTO_SEGMENTO;
        const zMinimo = 250; // abaixo disso o objeto já saiu pela parte de baixo da tela
        const lista = [];

        // Árvores
        const indiceBase = Math.floor(this.jogadorZ / COMPRIMENTO_SEGMENTO);
        for (let n = 1; n < DISTANCIA_DESENHO; n++) {
            const seg = this.segmentos[indiceBase + n];
            if (!seg) break;
            const zRel = seg.p1.world.z - this.jogadorZ;
            if (zRel < zMinimo) continue;
            for (const arv of seg.arvores) {
                lista.push({ tipo: 'arvore', zRel, xMundo: arv.offset * LARGURA_PISTA });
            }
        }

        // Obstáculos
        for (const obs of this.obstaculos) {
            const zRel = obs.z - this.jogadorZ;
            if (zRel < zMinimo || zRel > distanciaMax) continue;
            lista.push({ tipo: 'obstaculo', zRel, xMundo: obs.offset * LARGURA_PISTA, obs });
        }

        // Casa no final do trajeto
        const zRelCasa = this.casaZ - this.jogadorZ;
        if (zRelCasa > zMinimo && zRelCasa < distanciaMax) {
            lista.push({ tipo: 'casa', zRel: zRelCasa, xMundo: 0 });
        }

        lista.sort((a, b) => b.zRel - a.zRel);

        for (const item of lista) {
            const p = this.projetarObjeto(item.zRel, item.xMundo, w, h);

            if (item.tipo === 'arvore') {
                spriteRenderer.desenharArvore(ctx, p.x, p.y, 900 * p.escalaPx, 1300 * p.escalaPx);
            } else if (item.tipo === 'casa') {
                spriteRenderer.desenharCasa(ctx, p.x, p.y, 3000 * p.escalaPx, 2400 * p.escalaPx);
            } else {
                const obs = item.obs;
                const largPx = obs.largura * p.escalaPx;
                const altPx = obs.altura * p.escalaPx;

                spriteRenderer.desenharVeiculoTransito(ctx, p.x, p.y, largPx, altPx, obs.cor);

                if (this.debugHitboxes) {
                    const hitW = largPx * obs.fatorHitbox;
                    this.desenharCaixaDebug(ctx, p.x - hitW / 2, p.y - altPx, hitW, altPx, '#ef4444');
                }
            }
        }
    }

    desenharCaixaDebug(ctx, x, y, largura, altura, cor) {
        ctx.save();
        ctx.strokeStyle = cor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, largura, altura);
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = cor;
        ctx.fillRect(x, y, largura, altura);
        ctx.restore();
    }

    desenharSegmento(ctx, width, x1, y1, w1, x2, y2, w2, cor) {
        ctx.fillStyle = cor.grass;
        ctx.fillRect(0, y2, width, y1 - y2);

        const r1 = w1 / 6;
        const r2 = w2 / 6;
        this.desenharPoligono(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, cor.rumble);
        this.desenharPoligono(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, cor.rumble);
        this.desenharPoligono(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, cor.road);

        // Duas linhas tracejadas separando as 3 faixas
        if (cor.lane) {
            const lw1 = w1 / 40;
            const lw2 = w2 / 40;
            [-0.31, 0.31].forEach((pos) => {
                const cx1 = x1 + w1 * pos * 2;
                const cx2 = x2 + w2 * pos * 2;
                this.desenharPoligono(ctx, cx1 - lw1, y1, cx1 + lw1, y1, cx2 + lw2, y2, cx2 - lw2, y2, cor.lane);
            });
        }
    }

    desenharPoligono(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    }

    desenharCeuNoturno(ctx, w, h) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
        skyGrad.addColorStop(0, '#020617');
        skyGrad.addColorStop(0.6, '#0f172a');
        skyGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(-w * 0.2, -h * 0.2, w * 1.4, h * 0.72);

        // Silhueta de montanhas no horizonte
        ctx.fillStyle = '#0b0f19';
        ctx.beginPath();
        ctx.moveTo(-w * 0.2, h * 0.5);
        for (let i = -w * 0.2; i <= w * 1.2; i += 70) {
            const alt = Math.sin(i * 0.015) * 30 + Math.cos(i * 0.035) * 18 + 20;
            ctx.lineTo(i, h * 0.5 - alt);
        }
        ctx.lineTo(w * 1.2, h * 0.5);
        ctx.closePath();
        ctx.fill();

        // Gramado abaixo do horizonte (evita faixas vazias com a oscilação da câmera)
        ctx.fillStyle = '#14532d';
        ctx.fillRect(-w * 0.2, h * 0.5, w * 1.4, h * 0.7);
    }
}
