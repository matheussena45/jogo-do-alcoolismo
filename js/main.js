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

        // Detecta capacidade de toque e adiciona classe auxiliar
        if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
            document.documentElement.classList.add('touch-device');
        }

        this.setupOrientationValidation();
        this.setupMobileZoomLock();
        this.setupGlobalControls();
    }

    /**
     * Detecta se o usuário está acessando por um dispositivo móvel autêntico
     * (Android ou iOS/iPadOS) ou por um computador desktop/laptop.
     */
    isMobileDevice() {
        const ua = navigator.userAgent || navigator.vendor || window.opera || '';
        const maxTouchPoints = navigator.maxTouchPoints || 0;
        const hasTouch = ('ontouchstart' in window) || (maxTouchPoints > 0);

        // Detecta iOS / iPadOS (incluindo Safari iOS 13+ que envia Macintosh no UA mas possui multi-touch)
        const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
        const isAndroid = /Android/i.test(ua);

        // Se for Windows, Mac sem touch ou Linux desktop (não-Android): É COMPUTADOR / PC! NUNCA bloqueia.
        const isWindows = /Windows NT/i.test(ua);
        const isMacDesktop = /Macintosh/i.test(ua) && !isIOS;
        const isLinuxDesktop = /Linux/i.test(ua) && !isAndroid;

        if (isWindows || isMacDesktop || isLinuxDesktop) {
            return false;
        }

        // Se a resolução for de monitor desktop grande sem ser iOS/Android
        if (!isIOS && !isAndroid && window.innerWidth >= 1024 && window.innerHeight >= 650) {
            return false;
        }

        const isMobileUA = isIOS || isAndroid || /BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
            (navigator.userAgentData && navigator.userAgentData.mobile === true);

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

        const updateViewportVars = () => {
            const vv = window.visualViewport;
            const width = Math.round(vv ? vv.width : window.innerWidth);
            const height = Math.round(vv ? vv.height : window.innerHeight);
            document.documentElement.style.setProperty('--app-width', `${width}px`);
            document.documentElement.style.setProperty('--app-height', `${height}px`);
            return { width, height };
        };

        const checkOrientation = () => {
            const { width, height } = updateViewportVars();
            const isMobile = this.isMobileDevice();

            // Regra 1: Se for desktop, NUNCA bloqueia. Garante que abre normal.
            if (!isMobile) {
                this.isOrientationLocked = false;
                lockOverlay.classList.add('hidden');
                document.body.classList.remove('mobile-portrait', 'mobile-landscape');
                document.body.classList.add('desktop-mode');
                return;
            }

            // Regra 2: Se for mobile (Android ou iOS), verifica se está em modo retrato (altura > largura)
            document.body.classList.remove('desktop-mode');
            const isPortrait = height > width;

            if (isPortrait) {
                // Mobile em retrato: Bloqueia e avisa para virar para horizontal
                this.isOrientationLocked = true;
                lockOverlay.classList.remove('hidden');
                document.body.classList.add('mobile-portrait');
                document.body.classList.remove('mobile-landscape');
            } else {
                // Mobile em paisagem: Libera o jogo com layout horizontal adaptado
                this.isOrientationLocked = false;
                lockOverlay.classList.add('hidden');
                document.body.classList.remove('mobile-portrait');
                document.body.classList.add('mobile-landscape');
                window.scrollTo(0, 0);
            }
        };

        // Verifica na inicialização e em eventos de rotação, barra de endereço (Android/iOS) ou redimensionamento
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', () => {
            setTimeout(checkOrientation, 100);
            setTimeout(checkOrientation, 300);
        });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', checkOrientation);
            window.visualViewport.addEventListener('scroll', () => {
                if (document.body.classList.contains('mobile-landscape')) {
                    window.scrollTo(0, 0);
                }
            });
        }
    }

    /**
     * Bloqueia qualquer tentativa de zoom no mobile (pinça com dois dedos,
     * duplo toque e gestos nativos do iOS Safari / Android Chrome).
     */
    setupMobileZoomLock() {
        // Bloqueia gestos de pinça no iOS Safari
        const preventGesture = (e) => e.preventDefault();
        document.addEventListener('gesturestart', preventGesture, { passive: false });
        document.addEventListener('gesturechange', preventGesture, { passive: false });
        document.addEventListener('gestureend', preventGesture, { passive: false });

        // Bloqueia início de pinça com múltiplos dedos fora dos botões de direção
        document.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 1 && !e.target.closest('.btn-touch')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Bloqueia movimento de pinça (multi-touch ou escala != 1)
        document.addEventListener('touchmove', (e) => {
            if (e.touches && e.touches.length > 1) {
                e.preventDefault();
            } else if (typeof e.scale === 'number' && e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Bloqueia dblclick nativo de causar zoom
        document.addEventListener('dblclick', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Bloqueia Ctrl + Scroll zoom
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // Bloqueia menu de contexto ao segurar o dedo nos botões do jogo no Android/iOS
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#arcade-cabinet') || e.target.closest('#arcade-header')) {
                e.preventDefault();
            }
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
