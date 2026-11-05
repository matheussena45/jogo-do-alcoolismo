/**
 * audio.js - Sistema de Áudio Automotivo (Gravações Reais Free + Web Audio API)
 *
 * Utiliza gravações reais gratuitas da biblioteca pública Google Sound Library:
 * - Condução contínua em rodovia/asfalto (carro já ligado): https://actions.google.com/sounds/v1/transportation/car_cruise_hand_out_window.ogg
 * - Ambiente de rodovia movimentada e pneus do trânsito no asfalto: https://actions.google.com/sounds/v1/ambiences/distant_highway.ogg
 * - Atrito fora da pista (cascalho/grama): https://actions.google.com/sounds/v1/transportation/car_on_gravel.ogg
 *
 * Também sintetiza via Web Audio API:
 * - Ronco contínuo do motor acompanhando a aceleração (RPM dinâmico, sem som de partida/ignição)
 * - Som de rolamento dos pneus dos outros carros no asfalto (aumenta ao se aproximar do tráfego)
 * - Efeito Doppler estéreo ao ultrapassar veículos na pista
 */

const SONS_REAIS_URLS = {
    rodovia: 'https://actions.google.com/sounds/v1/transportation/car_cruise_hand_out_window.ogg',
    transito: 'https://actions.google.com/sounds/v1/ambiences/distant_highway.ogg',
    grama: 'https://actions.google.com/sounds/v1/transportation/car_on_gravel.ogg',
    colisao: 'assets/audio/colisao_impacto.mp3',
    ultrapassagem: 'assets/audio/colisao_derrapagem.wav',
    buzina: 'assets/audio/buzina.wav'
};

class RetroAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterCompressor = null;
        this.isMuted = false;

        // Gravações reais (rodovia + arquivos locais enviados para colisão, ultrapassagem e buzina)
        this.audioRodovia = null;
        this.audioTransito = null;
        this.audioGrama = null;
        this.audioColisao = null;
        this.audioUltrapassagem = null;
        this.ultrapassagemTimeout = null;
        this.audioBuzina = null;
        this.ultimoTempoBuzina = 0;
        this.proximoIntervaloBuzina = 6500;
        this.sonsReaisProntos = false;

        // Geradores Web Audio para motor contínuo, asfalto e pneus do tráfego
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
        this.engineGain = null;

        this.noiseBuffer = null;
        this.roadNoiseSource = null;
        this.roadFilter = null;
        this.roadGain = null;

        // Camada dedicada ao som de pneus dos outros carros no asfalto (rodovia movimentada)
        this.trafficTireFilter = null;
        this.trafficTireGain = null;

        this.isEngineRunning = false;
        this.isMusicPlaying = false;
        this.musicInterval = null;

        this.precarregarSonsReais();
    }

    /**
     * Pré-carrega os arquivos de áudio reais gratuitos (Google Sound Library)
     */
    precarregarSonsReais() {
        try {
            this.audioRodovia = new Audio(SONS_REAIS_URLS.rodovia);
            this.audioRodovia.crossOrigin = 'anonymous';
            this.audioRodovia.preload = 'auto';
            this.audioRodovia.loop = true;
            this.audioRodovia.volume = 0.48;

            this.audioTransito = new Audio(SONS_REAIS_URLS.transito);
            this.audioTransito.crossOrigin = 'anonymous';
            this.audioTransito.preload = 'auto';
            this.audioTransito.loop = true;
            this.audioTransito.volume = 0.42;

            this.audioGrama = new Audio(SONS_REAIS_URLS.grama);
            this.audioGrama.crossOrigin = 'anonymous';
            this.audioGrama.preload = 'auto';
            this.audioGrama.loop = true;
            this.audioGrama.volume = 0.0;

            // Sons locais reais enviados para o projeto (assets/audio/)
            this.audioColisao = new Audio(SONS_REAIS_URLS.colisao);
            this.audioColisao.preload = 'auto';
            this.audioColisao.volume = 0.95;

            this.audioUltrapassagem = new Audio(SONS_REAIS_URLS.ultrapassagem);
            this.audioUltrapassagem.preload = 'auto';
            this.audioUltrapassagem.volume = 0.85;

            this.audioBuzina = new Audio(SONS_REAIS_URLS.buzina);
            this.audioBuzina.preload = 'auto';
            this.audioBuzina.volume = 0.40;

            this.sonsReaisProntos = true;
        } catch (e) {
            this.sonsReaisProntos = false;
        }
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterCompressor = this.ctx.createDynamicsCompressor();
            this.masterCompressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
            this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
            this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
            this.masterCompressor.attack.setValueAtTime(0.01, this.ctx.currentTime);
            this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);
            this.masterCompressor.connect(this.ctx.destination);

            this.createNoiseBuffer();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    createNoiseBuffer() {
        if (this.noiseBuffer || !this.ctx) return;
        const length = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Pink noise contínuo para som realista de pneu no asfalto
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            const pink = b0 + b1 + b2 + white * 0.5362;
            data[i] = pink * 0.11;
        }
        this.noiseBuffer = buffer;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.engineGain && this.ctx) {
            this.engineGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.055, this.ctx.currentTime, 0.05);
        }
        if (this.roadGain && this.ctx) {
            this.roadGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.045, this.ctx.currentTime, 0.05);
        }
        if (this.trafficTireGain && this.ctx) {
            this.trafficTireGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.04, this.ctx.currentTime, 0.05);
        }
        if (this.audioRodovia) this.audioRodovia.muted = this.isMuted;
        if (this.audioTransito) this.audioTransito.muted = this.isMuted;
        if (this.audioGrama) this.audioGrama.muted = this.isMuted;
        if (this.audioColisao) this.audioColisao.muted = this.isMuted;
        if (this.audioUltrapassagem) this.audioUltrapassagem.muted = this.isMuted;
        if (this.audioBuzina) this.audioBuzina.muted = this.isMuted;
        return this.isMuted;
    }

    /**
     * Bip suave do menu arcade
     */
    playBeep(freq = 440, type = 'sine', duration = 0.06) {
        if (this.isMuted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            osc.connect(gain);
            gain.connect(this.masterCompressor || this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration + 0.01);
        } catch (e) {}
    }

    /**
     * Som de gole / beber dose
     */
    playDrinkSound() {
        if (this.isMuted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            [0, 0.11, 0.22].forEach((delay, index) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                const startFreq = 230 + index * 45;
                const endFreq = 440 + index * 60;
                osc.frequency.setValueAtTime(startFreq, now + delay);
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + 0.08);

                gain.gain.setValueAtTime(0.001, now + delay);
                gain.gain.linearRampToValueAtTime(0.11, now + delay + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);

                osc.connect(gain);
                gain.connect(this.masterCompressor || this.ctx.destination);

                osc.start(now + delay);
                osc.stop(now + delay + 0.1);
            });
        } catch (e) {}
    }

    playScreech() {
        // Silenciado em movimentos laterais para evitar estalos
    }

    /**
     * Toca o som real de buzina automotiva apenas ocasionalmente para ambientação (assets/audio/buzina.wav)
     */
    playHorn(volume = 0.38) {
        if (this.isMuted) return;
        const agora = performance.now();
        // Intervalo espaçado (6 a 11 segundos) para tocar só de vez em quando como ambientação
        if (agora - this.ultimoTempoBuzina < this.proximoIntervaloBuzina) return;
        this.ultimoTempoBuzina = agora;
        this.proximoIntervaloBuzina = 6500 + Math.random() * 4500;

        try {
            if (this.audioBuzina) {
                this.audioBuzina.muted = this.isMuted;
                this.audioBuzina.volume = Math.min(1, Math.max(0.1, volume));
                this.audioBuzina.currentTime = 0;
                this.audioBuzina.play().catch(() => {});
            }
        } catch (e) {}
    }

    /**
     * Som de colisão: toca APENAS o som de batida (colisao_impacto.mp3) e interrompe qualquer som de ultrapassagem
     */
    playCrash() {
        if (this.isMuted) return;
        this.init();

        try {
            if (this.ultrapassagemTimeout) {
                clearTimeout(this.ultrapassagemTimeout);
                this.ultrapassagemTimeout = null;
            }
            if (this.audioUltrapassagem) {
                this.audioUltrapassagem.pause();
                this.audioUltrapassagem.currentTime = 0;
            }
            if (this.audioBuzina) {
                this.audioBuzina.pause();
                this.audioBuzina.currentTime = 0;
            }
            if (this.audioColisao) {
                this.audioColisao.muted = this.isMuted;
                this.audioColisao.currentTime = 0;
                this.audioColisao.volume = 0.98;
                this.audioColisao.play().catch(() => {});
            }
        } catch (e) {}
    }

    /**
     * Toca o áudio de ultrapassagem enviado pelo usuário (cortado/sincronizado no trecho de pico 0.72s -> 1.85s)
     * Volume varia conforme a distância lateral:
     * - Passando próximo (faixa vizinha): som forte e encorpado
     * - Passando longe (2 faixas de distância): som mais baixo ao fundo
     */
    playTrafficPass(lateralOffset = 0) {
        if (this.isMuted) return;
        this.init();

        const distLateral = Math.abs(lateralOffset);
        // Próximo (dist <= 0.70): volume ~0.92 | Longe (dist >= 1.24): volume ~0.28
        const volumeCalculado = Math.max(0.26, Math.min(0.95, 1.05 - distLateral * 0.60));

        try {
            if (this.audioUltrapassagem) {
                if (this.ultrapassagemTimeout) {
                    clearTimeout(this.ultrapassagemTimeout);
                }
                this.audioUltrapassagem.muted = this.isMuted;
                this.audioUltrapassagem.volume = volumeCalculado;
                // Inicia em 0.72s (o som cresce antes da ultrapassagem, atinge o pico ao cruzar em ~1.12s e finaliza após passar)
                this.audioUltrapassagem.currentTime = 0.72;
                this.audioUltrapassagem.play().catch(() => {});

                // Corta o silêncio final após o carro passar (1.15s de duração útil)
                this.ultrapassagemTimeout = setTimeout(() => {
                    if (this.audioUltrapassagem && !this.audioUltrapassagem.paused) {
                        this.audioUltrapassagem.pause();
                    }
                }, 1150);
            }
        } catch (e) {}
    }

    /**
     * Inicia o som contínuo do carro já ligado acelerando + rodovia movimentada e pneus no asfalto
     */
    startEngine() {
        if (this.isEngineRunning) return;
        this.init();
        this.isEngineRunning = true;

        // 1. Gravações reais contínuas (carro já em movimento + rodovia movimentada)
        if (this.sonsReaisProntos) {
            try {
                if (this.audioRodovia) {
                    this.audioRodovia.muted = this.isMuted;
                    this.audioRodovia.currentTime = 0;
                    this.audioRodovia.volume = 0.45;
                    this.audioRodovia.playbackRate = 0.85;
                    this.audioRodovia.play().catch(() => {});
                }
                if (this.audioTransito) {
                    this.audioTransito.muted = this.isMuted;
                    this.audioTransito.currentTime = 0;
                    this.audioTransito.volume = 0.50;
                    this.audioTransito.play().catch(() => {});
                }
                if (this.audioGrama) {
                    this.audioGrama.muted = this.isMuted;
                    this.audioGrama.currentTime = 0;
                    this.audioGrama.volume = 0.0;
                    this.audioGrama.play().catch(() => {});
                }
            } catch (e) {}
        }

        // 2. Motor contínuo (aceleração progressiva) + pneus no asfalto + pneus do trânsito ao redor
        try {
            const now = this.ctx.currentTime;

            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineSubOsc = this.ctx.createOscillator();

            this.engineOsc1.type = 'sawtooth';
            this.engineOsc2.type = 'sawtooth';
            this.engineSubOsc.type = 'triangle';

            this.engineOsc1.frequency.setValueAtTime(46, now);
            this.engineOsc2.frequency.setValueAtTime(92.4, now);
            this.engineSubOsc.frequency.setValueAtTime(46, now);

            this.engineFilter = this.ctx.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.setValueAtTime(210, now);
            this.engineFilter.Q.setValueAtTime(1.6, now);

            this.engineGain = this.ctx.createGain();
            this.engineGain.gain.setValueAtTime(0.001, now);
            this.engineGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.055, now + 0.25);

            this.engineOsc1.connect(this.engineFilter);
            this.engineOsc2.connect(this.engineFilter);
            this.engineSubOsc.connect(this.engineFilter);
            this.engineFilter.connect(this.engineGain);
            this.engineGain.connect(this.masterCompressor || this.ctx.destination);

            this.engineOsc1.start(now);
            this.engineOsc2.start(now);
            this.engineSubOsc.start(now);

            if (this.noiseBuffer) {
                this.roadNoiseSource = this.ctx.createBufferSource();
                this.roadNoiseSource.buffer = this.noiseBuffer;
                this.roadNoiseSource.loop = true;

                // Rolamento dos próprios pneus no asfalto
                this.roadFilter = this.ctx.createBiquadFilter();
                this.roadFilter.type = 'lowpass';
                this.roadFilter.frequency.setValueAtTime(180, now);

                this.roadGain = this.ctx.createGain();
                this.roadGain.gain.setValueAtTime(0.001, now);
                this.roadGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.045, now + 0.25);

                // Pneus dos outros carros no asfalto (chiado de rodovia movimentada)
                this.trafficTireFilter = this.ctx.createBiquadFilter();
                this.trafficTireFilter.type = 'bandpass';
                this.trafficTireFilter.frequency.setValueAtTime(620, now);
                this.trafficTireFilter.Q.setValueAtTime(0.9, now);

                this.trafficTireGain = this.ctx.createGain();
                this.trafficTireGain.gain.setValueAtTime(0.001, now);
                this.trafficTireGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.035, now + 0.25);

                this.roadNoiseSource.connect(this.roadFilter);
                this.roadFilter.connect(this.roadGain);
                this.roadGain.connect(this.masterCompressor || this.ctx.destination);

                this.roadNoiseSource.connect(this.trafficTireFilter);
                this.trafficTireFilter.connect(this.trafficTireGain);
                this.trafficTireGain.connect(this.masterCompressor || this.ctx.destination);

                this.roadNoiseSource.start(now);
            }
        } catch (e) {}
    }

    /**
     * Atualiza dinamicamente o som do motor, do asfalto e dos pneus dos carros próximos na rodovia
     * @param {number} speedRatio - Proporção da velocidade atual (0 a 1)
     * @param {boolean} isOffroad - Se o veículo saiu do asfalto para a grama
     * @param {number} trafficProximity - Proximidade dos outros carros na pista (0 a 1)
     */
    updateEngine(speedRatio, isOffroad = false, trafficProximity = 0) {
        if (!this.isEngineRunning || this.isMuted) return;
        const ratio = Math.min(1, Math.max(0, speedRatio));
        const prox = Math.min(1, Math.max(0, trafficProximity));

        // 1. Ajusta gravações reais (rodovia, trânsito e grama)
        try {
            if (this.audioRodovia && !this.audioRodovia.paused) {
                this.audioRodovia.playbackRate = 0.82 + ratio * 0.38;
                this.audioRodovia.volume = Math.min(1, 0.22 + ratio * 0.40);
            }
            if (this.audioTransito && !this.audioTransito.paused) {
                // Aumenta o som de rodovia movimentada conforme há carros por perto
                this.audioTransito.volume = Math.min(1, 0.35 + prox * 0.45);
            }
            if (this.audioGrama && !this.audioGrama.paused) {
                this.audioGrama.volume = isOffroad ? Math.min(1, 0.45 * (0.4 + ratio * 0.6)) : 0.0;
            }
        } catch (e) {}

        // 2. Ajusta motor contínuo e som de pneus dos outros carros no asfalto
        if (!this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const baseFreq = 46 + ratio * 102;

            if (this.engineOsc1) this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
            if (this.engineOsc2) this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.08);
            if (this.engineSubOsc) this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);

            if (this.engineFilter) {
                this.engineFilter.frequency.setTargetAtTime(200 + ratio * 320, now, 0.1);
            }
            if (this.roadFilter) {
                this.roadFilter.frequency.setTargetAtTime(150 + ratio * 210, now, 0.1);
            }

            // Volume e frequência do som de pneus do tráfego no asfalto crescem ao se aproximar de outros carros
            if (this.trafficTireGain && !this.isMuted) {
                const targetTireGain = (0.025 + prox * 0.065) * (0.3 + ratio * 0.7);
                this.trafficTireGain.gain.setTargetAtTime(targetTireGain, now, 0.08);
            }
            if (this.trafficTireFilter) {
                this.trafficTireFilter.frequency.setTargetAtTime(520 + prox * 280 + ratio * 150, now, 0.08);
            }
        } catch (e) {}
    }

    /**
     * Para todos os sons de condução
     */
    stopEngine() {
        this.isEngineRunning = false;

        try {
            if (this.audioRodovia) {
                this.audioRodovia.pause();
                this.audioRodovia.currentTime = 0;
            }
            if (this.audioTransito) {
                this.audioTransito.pause();
                this.audioTransito.currentTime = 0;
            }
            if (this.audioGrama) {
                this.audioGrama.pause();
                this.audioGrama.currentTime = 0;
            }
        } catch (e) {}

        try {
            if (this.engineOsc1) {
                this.engineOsc1.stop();
                this.engineOsc1.disconnect();
                this.engineOsc1 = null;
            }
            if (this.engineOsc2) {
                this.engineOsc2.stop();
                this.engineOsc2.disconnect();
                this.engineOsc2 = null;
            }
            if (this.engineSubOsc) {
                this.engineSubOsc.stop();
                this.engineSubOsc.disconnect();
                this.engineSubOsc = null;
            }
            if (this.roadNoiseSource) {
                this.roadNoiseSource.stop();
                this.roadNoiseSource.disconnect();
                this.roadNoiseSource = null;
            }
            this.engineGain = null;
            this.roadGain = null;
            this.trafficTireGain = null;
        } catch (e) {}
    }

    /**
     * Trilha sonora retrô suave ao fundo
     */
    startRetroMusic() {
        if (this.isMusicPlaying || this.isMuted) return;
        this.init();
        this.isMusicPlaying = true;

        const bassNotes = [
            110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83,
            98, 98, 123.47, 130.81, 82.41, 82.41, 98, 110
        ];
        let noteIndex = 0;

        this.musicInterval = setInterval(() => {
            if (this.isMuted || !this.isMusicPlaying) return;
            try {
                const now = this.ctx.currentTime;
                const freq = bassNotes[noteIndex % bassNotes.length];
                noteIndex++;

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(380, now);
                filter.frequency.exponentialRampToValueAtTime(130, now + 0.14);

                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.025, now + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.masterCompressor || this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.16);
            } catch (e) {}
        }, 160);
    }

    stopRetroMusic() {
        this.isMusicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

export const audio = new RetroAudioEngine();
