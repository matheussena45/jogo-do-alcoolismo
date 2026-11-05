# 🔬 Jogo Educativo – Seminário de Toxicologia
### Conscientização sobre os Efeitos do Álcool nas Funções Psicomotoras e Reflexos ao Volante

Minigame web educativo desenvolvido em JavaScript puro (HTML5 Canvas + Web Audio API + CSS3) com modelagem toxicológica formal para demonstração em seminários acadêmicos.

---

## 📋 Estrutura Pedagógica do Projeto

O projeto é dividido em duas fases integradas por persistência fisiológica do nível de álcool (`nivelAlcool: 0 a 100%`):

### 1. Fase de Consumo (Tela Inicial)
- **Protagonista Neutro e Genérico:** Representação humana contemporânea sem caricaturas, exibindo reações progressivas à intoxicação (estabilidade postural, rubor facial por vasodilatação, sonolência e desorientação nistágmica).
- **Catálogo de Bebidas em Português:**
  - **Não alcoólicas (0% de impacto):** Água Mineral Purificada, Suco Natural de Frutas, Refrigerante Tradicional e Café Expresso (com a nota didática de que cafeína não acelera a metabolização do etanol).
  - **Alcoólicas:** Cerveja Pilsen (4.8% ABV), Chopp Artesanal (6.5% ABV), Taça de Vinho Tinto (13.0% ABV), Caipirinha Tradicional (18.0% ABV) e Dose de Destilado Forte (40.0% ABV).
- **Bafômetro Digital:** Estimativa em tempo real da Taxa de Álcool no Sangue (TAS em g/L) e efeitos farmacodinâmicos no Sistema Nervoso Central (SNC).
- **Botão de Avanço:** `"Voltar para Casa Dirigindo ➔"`.

---

### 2. Desafio da Direção (Pista Reta & Desvio)
- **Mecânica de Pista Reta Contínua:** Pista reta em perspectiva pseudo-3D (**sem curvas no traçado**), focando exclusivamente no tempo de reação e desvio lateral de obstáculos.
- **Avanço Automático:** O veículo avança em velocidade contínua; o jogador comanda apenas o deslocamento lateral via teclado (`A/D` ou `Setas`) ou botões touch laterais no mobile em modo paisagem.
- **4 Tipos de Obstáculos Visíveis:**
  1. 🚧 **Cones de trânsito** (sinalização viária de obras)
  2. 🚶 **Pedestres** atravessando a pista
  3. 🚗 **Outros veículos** trafegando à frente
  4. 🕳️ **Buracos e deformidades** no pavimento asfáltico
- **Barra de Progresso:** Distância percorrida e meta restante até em casa.

---

## 📐 Modelagem Matemática & Toxicológica ([`js/state.js`](js/state.js))

### 1. Farmacocinética do Etanol (Fórmula de Widmark Adaptada)
$$\text{Etanol Puro (g)} = \text{Volume (ml)} \times \left(\frac{\text{ABV}}{100}\right) \times 0.8$$
$$\Delta \text{nivelAlcool} = \text{Etanol Puro (g)} \times 1.12$$

### 2. Atraso Psicomotor de Resposta (Input Lag $L_{ms}$)
Modela a depressão sináptica nas vias neurais motoras do córtex:
$$\text{InputLag}(A) = \text{round}\left(15 \times A + 0.10 \times A^2\right) \text{ ms}$$
- **Sóbrio ($A = 0$):** $0 \text{ ms}$ de atraso (reação motora imediata).
- **Leve ($A = 25$):** $\approx 437 \text{ ms}$ de atraso.
- **Moderado ($A = 50$):** $\approx 1000 \text{ ms}$ ($1 \text{ segundo}$ de latência motora!).
- **Severo ($A = 100$):** $\approx 2500 \text{ ms}$ ($2.5 \text{ segundos}$ de atraso).

### 3. Instabilidade Motora, Sobresterço e Movimento Involuntário (O Carro se Move Sozinho)
- **Puxões Espontâneos da Direção:** Quando o condutor consome álcool ($A > 0$), o veículo **se move sozinho periodicamente** para os lados (simulando perda de foco, micro-sonolência e guinadas involuntárias de volante com ruído de pneu cantando).
- **Inércia e Sobresterço:**
$$\text{Decay}(A) = 0.86 + \left(\frac{A}{100}\right) \times 0.125$$
$$\text{Sobresterço}(A) = 1.0 + \left(\frac{A}{100}\right)^{1.4} \times 2.3$$

### 4. Densidade Dinâmica de Obstáculos
$$\text{Multiplicador de Obstáculos}(A) = 1.0 + \left(\frac{A}{100}\right) \times 0.75$$

### 5. Distorções Visuais Toxicológicas
- **Desfoque (Blur):** Perda de acomodação do cristalino ocular $\propto A$.
- **Diplopia (Visão Dupla):** Desalinhamento dos músculos retos oculares com oscilação lateral.
- **Visão Tubular:** Constrição concêntrica do campo de visão periférico.

---

## 📊 Telas de Conclusão e Feedback Acadêmico

- **Colisão (Sinistro Toxicológico):**
  Calcula a distância percorrida "às cegas" durante o tempo de latência motora ($L_{ms}$) e emite laudo técnico com os fatores fisiopatológicos que culminaram na colisão.
- **Chegada em Casa (Vitória):**
  - **Sóbrio:** Validação da condução defensiva com tempo de reação padrão.
  - **Sob Efeito:** Alerta toxicológico demonstrando que a conclusão ocorreu por mera probabilidade estatística, alertando sobre a falsa sensação de segurança.

---

## 📱 Responsividade: Desktop vs Mobile

- **Desktop:** Abre diretamente sem telas de bloqueio; controles de teclado com visão limpa da pista.
- **Mobile:**
  - **Modo Retrato:** Trava de segurança com animação convidando a rotacionar o aparelho.
  - **Modo Paisagem:** Expansão em tela cheia com botões de toque translúcidos `[ESQ]` e `[DIR]` posicionados para os polegares.

---

## 🚀 Como Executar

Abra o arquivo [`index.html`](index.html) no VS Code através do **Live Server** ou via terminal:
```bash
python -m http.server 8000
```
Acesse `http://localhost:8000` ou `http://127.0.0.1:5500`.
