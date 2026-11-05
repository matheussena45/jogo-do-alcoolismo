/**
 * drinksData.js - Catálogo de Substâncias e Bebidas
 * Projeto: Jogo Educativo – Seminário de Toxicologia
 * 
 * Cada item contém propriedades toxicológicas:
 * - id: Identificador único
 * - nome: Nome comercial/comum da bebida
 * - tipo: 'nao_alcoolica' | 'alcoolica'
 * - abv: Teor alcoólico em % v/v (0.0 para não alcoólicas)
 * - volumeMl: Volume da porção/dose em mililitros
 * - icone: Representação visual
 * - cor: Cor representativa para efeitos gráficos
 * - descricao: Descrição da substância
 * - notaToxicologica: Fundamentação farmacocinética e dados toxicológicos
 */

export const CATALOGO_BEBIDAS = [
    // --- LADO ESQUERDO: BEBIDAS NÃO ALCOÓLICAS (SOMAM 0% AO NÍVEL DE ÁLCOOL) ---
    {
        id: 'agua',
        nome: 'Água Mineral Purificada',
        tipo: 'nao_alcoolica',
        abv: 0.0,
        volumeMl: 500,
        icone: '💧',
        cor: '#4fc3f7',
        categoria: 'Hidratação Celular',
        descricao: 'Água potável e fresca. Mantém o equilíbrio hidroeletrolítico celular sem qualquer alteração sináptica.',
        notaToxicologica: 'A água não degrada nem altera o tempo de resposta psicomotor do condutor (~250 ms) e preserva a integridade do campo visual.'
    },
    {
        id: 'suco',
        nome: 'Suco Natural de Frutas',
        tipo: 'nao_alcoolica',
        abv: 0.0,
        volumeMl: 300,
        icone: '🍊',
        cor: '#ff9800',
        categoria: 'Nutrição / Frutas',
        descricao: 'Suco integral natural, rico em carboidratos simples, água e vitamina C.',
        notaToxicologica: 'Fornece glicose para o metabolismo cerebral sem introduzir compostos depressores do Sistema Nervoso Central.'
    },
    {
        id: 'refrigerante',
        nome: 'Refrigerante Tradicional',
        tipo: 'nao_alcoolica',
        abv: 0.0,
        volumeMl: 350,
        icone: '🥤',
        cor: '#8d6e63',
        categoria: 'Gaseificada Sem Álcool',
        descricao: 'Bebida gaseificada e adoçada servida gelada.',
        notaToxicologica: 'Opção segura para o motorista designado. A taxa de álcool no sangue permanece em estritos 0.00 g/L.'
    },

    // --- LADO DIREITO: BEBIDAS ALCOÓLICAS (INCREMENTAM nivelAlcool CONFORME TEOR E VOLUME) ---
    {
        id: 'cerveja',
        nome: 'Cerveja (Lata 350ml)',
        tipo: 'alcoolica',
        abv: 5.0,
        volumeMl: 350,
        icone: '🍺',
        cor: '#fbc02d',
        categoria: 'Fermentada (Cerveja)',
        descricao: 'Bebida alcoólica fermentada tradicional.',
        notaToxicologica: 'Contém aproximadamente 14g de etanol puro. Uma única lata eleva a TAS em ~0.20 g/L, dobrando o risco estatístico de colisão.'
    },
    {
        id: 'vinho',
        nome: 'Taça de Vinho (150ml)',
        tipo: 'alcoolica',
        abv: 12.0,
        volumeMl: 150,
        icone: '🍷',
        cor: '#880e4f',
        categoria: 'Fermentada (Uva)',
        descricao: 'Taça clássica de vinho de mesa.',
        notaToxicologica: 'Contém aproximadamente 14g de etanol puro. Causa alteração na percepção de velocidade e prejuízo na atenção ao volante.'
    },
    {
        id: 'cachaca',
        nome: 'Dose de Cachaça (50ml)',
        tipo: 'alcoolica',
        abv: 40.0,
        volumeMl: 50,
        icone: '🥃',
        cor: '#d84315',
        categoria: 'Destilada (Cachaça)',
        descricao: 'Dose pura de cachaça tradicional de alta concentração alcoólica.',
        notaToxicologica: 'Fornece cerca de 16g de etanol provocando reações no sistema nervoso central.'
    }
];
