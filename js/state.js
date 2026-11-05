/**
 * state.js - Gerenciamento de Estado e Modelagem Toxicológica
 * Projeto: Jogo Educativo – Seminário de Toxicologia
 * 
 * Modela a correlação matemática e fisiológica entre o nível de álcool (nivelAlcool: 0 a 100%),
 * a Taxa de Álcool no Sangue (TAS em g/L), atraso psicomotor de resposta (ms),
 * instabilidade motora e densidade de obstáculos na via.
 */

export class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        // Nível de álcool no organismo: 0% (totalmente sóbrio) a 100% (intoxicação severa)
        this.nivelAlcool = 0;
        
        // Histórico de bebidas consumidas na Fase de Consumo
        this.bebidasConsumidas = [];

        // Estatísticas para os laudos de feedback acadêmico
        this.stats = {
            tempoInicio: 0,
            distanciaPercorrida: 0,
            // Trajeto sóbrio é mais curto e direto (1800m); sob efeito de álcool a desorientação amplia a rota necessária
            distanciaMetaBase: 1800,
            distanciaMeta: 1800,
            tempoReacaoAtrasoMs: 0,
            desviosRealizados: 0,
            colisoes: 0,
            motivoColisao: '',
            tipoObstaculoColidido: '',
            concluido: false,
            colidiu: false
        };
    }

    /**
     * Consumo de bebida com fundamentação na Fórmula de Widmark adaptada.
     * Gramas de álcool puro = Volume (ml) * (ABV / 100) * 0.8 (densidade do etanol).
     * 
     * - Bebidas não alcoólicas (água, suco, refrigerante, café): somam 0 ao nivelAlcool.
     * - Bebidas alcoólicas: incrementam proporcionalmente ao teor e volume ingerido.
     */
    consumirBebida(bebida) {
        this.bebidasConsumidas.push({
            ...bebida,
            horario: Date.now()
        });

        if (bebida.tipo === 'alcoolica' && bebida.abv > 0) {
            const gramasAlcoolPuro = bebida.volumeMl * (bebida.abv / 100) * 0.8;
            // 1 dose padrão (~14g de etanol) incrementa ~15% de nível toxicológico
            const incremento = gramasAlcoolPuro * 1.12;
            this.nivelAlcool = Math.min(100, Math.round(this.nivelAlcool + incremento));
        } else {
            // Bebida sem álcool: mantém nivelAlcool inalterado
            if (bebida.id === 'agua' && this.nivelAlcool > 0) {
                // Efeito didático de hidratação leve (redução pontual)
                this.nivelAlcool = Math.max(0, this.nivelAlcool - 2);
            }
        }

        // Atualiza a distância meta proporcionalmente ao nível de desorientação
        this.stats.distanciaMeta = Math.round(this.stats.distanciaMetaBase * (1 + (this.nivelAlcool / 100) * 0.4));

        return this.nivelAlcool;
    }

    /**
     * Relatório Clínico-Toxicológico e Estimativa de Alcoolemia (TAS)
     * Dados referenciados pelas diretrizes da OMS e da Associação Brasileira de Medicina de Tráfego (ABRAMET).
     */
    getRelatorioToxicologico() {
        const n = this.nivelAlcool;

        if (n === 0) {
            return {
                estado: "Sóbrio (0.00 g/L)",
                tasEstimada: "0.00 g/L",
                faixaClinica: "Fisiologicamente Normal",
                cor: "#2ecc71",
                reflexos: "Tempo de reação motor ótimo (~250 milissegundos).",
                campoVisual: "Visão periférica íntegra (180 graus de amplitude).",
                impactoSNC: "Córtex cerebral e funções executivas plenamente ativas.",
                riscoAcidente: "Risco padrão de linha de base."
            };
        } else if (n <= 25) {
            return {
                estado: "Alcoolemia Leve (0.20 - 0.40 g/L)",
                tasEstimada: "0.20 - 0.40 g/L",
                faixaClinica: "Inibição Cortical Inicial",
                cor: "#f1c40f",
                reflexos: "Atraso no tempo de resposta em cerca de 25% a 35%.",
                campoVisual: "Início de redução na percepção de contraste e objetos em movimento.",
                impactoSNC: "Diminuição da vigilância, atenção dividida comprometida.",
                riscoAcidente: "Risco de sinistro duplicado em relação ao estado sóbrio."
            };
        } else if (n <= 55) {
            return {
                estado: "Embriaguez Moderada (0.50 - 0.90 g/L)",
                tasEstimada: "0.50 - 0.90 g/L",
                faixaClinica: "Disfunção Psicomotora Evidente",
                cor: "#e67e22",
                reflexos: "Retardo substancial de resposta (> 800 ms para acionar comandos).",
                campoVisual: "Constrição da visão periférica (visão tubular), falha no cálculo de distâncias.",
                impactoSNC: "Afeta o cerebelo e córtex motor; dificuldade em manter trajetória reta.",
                riscoAcidente: "Risco de sinistro aumentado de 4 a 7 vezes."
            };
        } else if (n <= 80) {
            return {
                estado: "Embriaguez Severa (1.00 - 1.50 g/L)",
                tasEstimada: "1.00 - 1.50 g/L",
                faixaClinica: "Intoxicação Alcoólica Aguda",
                cor: "#e74c3c",
                reflexos: "Lentidão crítica (> 1.5 segundo de atraso sináptico).",
                campoVisual: "Diplopia (visão dupla), movimentos sacádicos oculares prejudicados.",
                impactoSNC: "Perda severa de coordenação motora fina, tônus muscular deprimido.",
                riscoAcidente: "Risco de colisão fatal aumentado em mais de 15 vezes."
            };
        } else {
            return {
                estado: "Intoxicação Grave (> 1.60 g/L)",
                tasEstimada: "> 1.60 g/L",
                faixaClinica: "Depressão Central Grave / Estupor",
                cor: "#9b59b6",
                reflexos: "Incapacidade psicomotora completa de resposta em tempo hábil.",
                campoVisual: "Visão turva grave, desorientação têmporo-espacial.",
                impactoSNC: "Bloqueio de transmissão neurotransmissora GABAérgica e glutamatérgica.",
                riscoAcidente: "Direção com risco iminente e probabilidade extrema de morte."
            };
        }
    }

    // =========================================================================
    // FÓRMULAS MATEMÁTICAS: Toxicologia Aplicada aos Controles do Veículo
    // =========================================================================

    /**
     * 1. Atraso de Resposta Psicomotor (Input Lag em milissegundos)
     * No cérebro humano sóbrio o tempo de reação ao volante é ~250ms.
     * Sob efeito de álcool, o atraso sináptico cresce quadraticamente:
     * 
     * InputLag(A) = 15 * A + 0.10 * (A^2)
     * Exemplos:
     * - A = 0   => 0 ms de atraso adicional (resposta imediata)
     * - A = 30  => ~540 ms de retardo
     * - A = 60  => ~1260 ms (> 1.2 segundos para reagir ao obstáculo)
     * - A = 100 => ~2500 ms (2.5 segundos de latência total!)
     */
    getAtrasoRespostaMs() {
        const A = this.nivelAlcool;
        if (A <= 0) return 0;
        return Math.round(15 * A + 0.10 * Math.pow(A, 2));
    }

    /**
     * 2. Instabilidade Motora e Inércia Lateral (Sobresterçamento)
     * O tônus motor e o controle fino de feedback proprioceptivo degradam-se:
     * - Sóbrio: decay rápido (0.86), o carro estabiliza imediatamente.
     * - Bêbado: decay elevado (até 0.985), o carro continua derivando para os lados.
     */
    getFisicaDirecao() {
        const norm = this.nivelAlcool / 100;
        return {
            decay: 0.86 + norm * 0.125,
            sobresterco: 1.0 + Math.pow(norm, 1.4) * 2.3,
            precisao: Math.max(0.2, 1.0 - norm * 0.70)
        };
    }

    /**
     * 3. Desvio Involuntário por Perda de Atenção (Micro-oscilações da mão)
     */
    getOscilacaoInvoluntaria(tempoSegundos) {
        if (this.nivelAlcool <= 0) return 0;
        const norm = this.nivelAlcool / 100;
        const onda = Math.sin(tempoSegundos * 1.6) * 0.65 + Math.sin(tempoSegundos * 3.4) * 0.35;
        const amplitude = Math.pow(norm, 1.3) * 0.030;
        return onda * amplitude;
    }

    /**
     * 4. Puxões Espontâneos e Guinadas Involuntárias (O Carro se Move Sozinho)
     * Quando o condutor está alcoolizado, ocorrem micro-sonolências, espasmos
     * e perda súbita do controle direcional, fazendo o veículo derivar sozinho.
     */
    getParametrosPuxaoInvoluntario() {
        const A = this.nivelAlcool;
        if (A <= 0) return null; // 0% Sóbrio: NUNCA se move sozinho!

        const norm = A / 100;
        // Intervalo entre eventos: quanto mais álcool, mais frequente (de 6s até 1.8s)
        const intervaloMin = Math.max(1.8, 6.0 - norm * 4.2);
        const intervaloMax = Math.max(3.0, 9.0 - norm * 5.5);
        // Força da guinada lateral espontânea
        const forca = 0.45 + Math.pow(norm, 1.3) * 1.6;
        // Duração do puxão (0.4s a 1.2s)
        const duracao = 0.4 + norm * 0.7;

        return { intervaloMin, intervaloMax, forca, duracao };
    }

    /**
     * 5. Densidade Dinâmica de Obstáculos
     * Sob efeito de álcool, o campo perceptivo efetivo diminui, aumentando a
     * frequência relativa com que obstáculos críticos surgem no horizonte.
     * Multiplicador: 1.0 (sóbrio) até 1.75 (embriaguez severa).
     */
    getMultiplicadorDensidadeObstaculos() {
        return 1.0 + (this.nivelAlcool / 100) * 0.75;
    }

    /**
     * 6. Parâmetros de Distorção Visual Toxicológica
     * Desfoque progressivo, diplopia oscilatória (visão dupla) e constrição tubular.
     */
    getDistorcaoVisual(tempoSegundos) {
        const A = this.nivelAlcool;
        if (A <= 0) {
            return {
                desfoquePx: 0,
                deslocamentoDiplopiaPx: 0,
                alfaDiplopia: 0,
                aberracaoCromaticaPx: 0,
                oscilacaoCameraRad: 0,
                visaoTubular: 0
            };
        }

        const norm = A / 100;

        // Desfoque da lente ocular
        const desfoquePx = Math.round(norm * 5.5 * 10) / 10;

        // Visão dupla (diplopia por paralisia dos músculos retos oculares)
        const cicloDiplopia = Math.sin(tempoSegundos * 2.2);
        const deslocamentoDiplopiaPx = norm * (14.0 + 8.0 * cicloDiplopia);
        const alfaDiplopia = Math.min(0.72, norm * 0.75);

        // Aberração cromática
        const aberracaoCromaticaPx = Math.round(norm * 8.5);

        // Oscilação de câmera por perda de equilíbrio vestibular
        const oscilacaoCameraRad = Math.sin(tempoSegundos * 1.5) * (norm * 0.05);

        // Visão tubular (perda progressiva da visão periférica)
        const visaoTubular = Math.pow(norm, 1.2) * 0.85;

        return {
            desfoquePx,
            deslocamentoDiplopiaPx,
            alfaDiplopia,
            aberracaoCromaticaPx,
            oscilacaoCameraRad,
            visaoTubular
        };
    }
}

export const globalState = new GameState();
