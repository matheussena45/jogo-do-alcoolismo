/**
 * main.js - Inicializador e Gerenciador de Cenas do Jogo
 * 
 * Conecta o loop principal (requestAnimationFrame), gerencia a máquina de estados
 * das cenas (BarScene e DrivingScene), áudio e validação de orientação móvel (Landscape Lock).
 */

import { globalState } from './state.js';
import { BarScene } from './barScene.js';
import { DrivingScene } from './drivingScene.js';
import { audio } from './audio.js';

class GameApp {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.currentScene = null;
        this.lastTime = performance.now();
        this.isOrientationLocked = false;

        // Dimensões internas retrô padrão (16:9 arcade)
        this.canvas.width = 960;
        this.canvas.height = 540;

        this.barScene = new BarScene(this.canvas, () => this.switchScene('driving'));
        this.drivingScene = new DrivingScene(this.canvas, () => this.switchScene('bar'));

        this.setupOrientationValidation();
        this.setupGlobalControls();
    }

    /**
     * Detecta se o usuário está acessando por um dispositivo móvel autêntico
     * (smartphone ou tablet touch) ou por um computador desktop/laptop.
     */
    isMobileDevice() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';

        // Se for Windows, Mac ou Linux desktop: É COMPUTADOR / PC! NUNCA bloqueia.
        const isWindows = /Windows NT/i.test(ua);
        const isMac = /Macintosh/i.test(ua) && !('ontouchend' in document);
        const isLinux = /Linux/i.test(ua) && !/Android/i.test(ua);

        if (isWindows || isMac || isLinux) {
            return false;
        }

        // Se a resolução for típica de desktop/laptop, também não é smartphone
        if (window.innerWidth >= 1024 && window.innerHeight >= 650) {
            return false;
        }

        // Smartphone ou tablet autêntico
        const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        return isMobileUA && hasTouch;
    }

    init() {
        // Inicia na Fase de Consumo
        this.switchScene('bar');

        // Loop de animação principal com delta time seguro
        const loop = (currentTime) => {
            const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
            this.lastTime = currentTime;

            // Só atualiza o jogo se a orientação não estiver bloqueada no mobile
            if (this.currentScene && !this.isOrientationLocked) {
                this.currentScene.update(dt);
                this.currentScene.render();
            }

            requestAnimationFrame(loop);
        };

        requestAnimationFrame(loop);
    }

    switchScene(sceneName) {
        if (this.currentScene) {
            this.currentScene.stop();
        }

        if (sceneName === 'driving') {
            this.currentScene = this.drivingScene;
        } else {
            this.currentScene = this.barScene;
        }

        this.currentScene.start();
    }

    /**
     * Validador de Orientação de Tela (Mobile Landscape Lock)
     * - No DESKTOP: NUNCA exibe a mensagem de girar o aparelho. Abre 100% normal.
     * - No MOBILE: Se estiver em modo retrato (vertical), bloqueia o gameplay e
     *   solicita para virar o celular para a posição horizontal (paisagem).
     */
    setupOrientationValidation() {
        const lockOverlay = document.getElementById('orientation-lock-overlay');
        if (!lockOverlay) return;

        const checkOrientation = () => {
            const isMobile = this.isMobileDevice();

            // Regra 1: Se for desktop, NUNCA bloqueia. Garante que abre normal.
            if (!isMobile) {
                this.isOrientationLocked = false;
                lockOverlay.classList.add('hidden');
                document.body.classList.remove('mobile-portrait');
                document.body.classList.add('desktop-mode');
                return;
            }

            // Regra 2: Se for mobile, verifica se está em modo retrato (altura maior que largura)
            document.body.classList.remove('desktop-mode');
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isPortrait = height > width;

            if (isPortrait) {
                // Mobile em retrato: Bloqueia e avisa para virar para horizontal
                this.isOrientationLocked = true;
                lockOverlay.classList.remove('hidden');
                document.body.classList.add('mobile-portrait');
            } else {
                // Mobile em paisagem: Libera o jogo
                this.isOrientationLocked = false;
                lockOverlay.classList.add('hidden');
                document.body.classList.remove('mobile-portrait');
            }
        };

        // Verifica na inicialização e em eventos de rotação ou redimensionamento
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', () => {
            setTimeout(checkOrientation, 150);
        });
    }

    setupGlobalControls() {
        // Botão de Áudio (Mute / Unmute)
        const audioBtn = document.getElementById('btn-toggle-sound');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const muted = audio.toggleMute();
                audioBtn.textContent = muted ? '🔇 SOM: OFF' : '🔊 SOM: ON';
                audioBtn.classList.toggle('muted', muted);
            });
        }

        // Botão Reset Geral (Zerar Alcoolemia)
        const resetBtn = document.getElementById('btn-reset-game');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                globalState.reset();
                audio.playBeep(350, 'sawtooth', 0.1);
                if (this.currentScene === this.barScene) {
                    this.barScene.updateHUD();
                } else {
                    this.switchScene('bar');
                }
            });
        }

        // Interação inicial de áudio para destravar AudioContext dos navegadores
        const unlockAudio = () => {
            audio.init();
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
    }
}

// Inicializa o jogo quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
});
