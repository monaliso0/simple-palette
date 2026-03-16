# Design Spec — Simple Palette
**Versão:** 1.0
**Data:** 2026-03-15

---

## Princípio central

> A interface some. As cores do usuário aparecem.

A UI é neutra, quase invisível. Fundo escuro, tipografia precisa, zero decoração. O que chama atenção são as swatches — as cores que o usuário está criando. Isso é intencional: a ferramenta não compete visualmente com seu próprio conteúdo.

---

## Direção de estilo

**Nome:** Quiet Precision

Dark-mode nativo. Interface densa mas não sobrecarregada. Cada elemento tem função clara. Nada existe como decoração. A precisão dos números e a qualidade das cores comunicam seriedade profissional — como uma ferramenta de estúdio, não um app de consumidor.

---

## Cores da interface

A interface em si usa uma paleta monocromática deliberada para não interferir nas cores do usuário.

```
Background principal   #0F0F0F   (quase preto, não preto puro)
Surface / Card         #1A1A1A   (contraste sutil com o bg)
Surface elevada        #242424   (modais, dropdowns)
Borda sutil            #2E2E2E   (1px, separadores)
Borda visível          #3D3D3D   (inputs, hover states)

Texto primário         #F5F5F5   (não branco puro)
Texto secundário       #8A8A8A   (labels, descrições)
Texto terciário        #555555   (placeholders, hints)

Accent (único)         #FFFFFF   (botões primários, CTAs)
Accent texto           #0F0F0F   (texto sobre botão branco)

Sucesso / AA pass      #3DBA6E
Aviso / AA fail        #E5A020
Erro / inacessível     #E5483D
```

Nenhuma outra cor de interface é usada. Cores de status (verde/amarelo/vermelho) são reservadas exclusivamente para indicadores de acessibilidade.

---

## Tipografia

**Font família:** Inter (var)
- Familiar para designers, excelente legibilidade em tamanhos pequenos
- Números tabulares ativados (`font-variant-numeric: tabular-nums`) em todos os contextos numéricos

**Font monospace:** JetBrains Mono (ou `font-mono` do sistema)
- Usada exclusivamente para: valores HEX, nomes de tokens, código de exportação
- Cria hierarquia visual imediata — o usuário sabe o que é valor e o que é label

**Escala tipográfica:**

| Uso | Tamanho | Peso | Fonte |
|---|---|---|---|
| Nome da paleta | 15px | 500 | Inter |
| Step label (50, 100…) | 11px | 400 | Inter |
| Valor HEX | 11px | 400 | JetBrains Mono |
| Token name | 12px | 400 | JetBrains Mono |
| Label de seção | 11px | 500 | Inter, uppercase, letter-spacing |
| Título / Logo | 14px | 600 | Inter |
| Botão | 13px | 500 | Inter |

Nenhum texto é maior que 16px. O produto é denso e preciso, não editorial.

---

## Layout

### Grid e estrutura

```
┌────────────────────────────────────────────────────────┐
│  Header (fixo, 48px)                                   │
│  Simple Palette                     [Export ▾]         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Palette: Red                          [⋯]       │  │
│  │  [██ #FF3B30 ▾]  Name: Red                       │  │
│  │                                                  │  │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐          │  │
│  │  │   │   │   │   │   │   │   │   │   │          │  │
│  │  │   │   │   │   │   │   │   │   │   │          │  │
│  │  │50 │100│200│300│400│500│600│700│800│          │  │
│  │  │hex│hex│hex│hex│hex│hex│hex│hex│hex│          │  │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┘          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Palette: Blue                         [⋯]       │  │
│  │  ...                                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [+ Add color]                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

- **Header fixo:** 48px, `bg #0F0F0F`, border-bottom `#2E2E2E`
- **Conteúdo:** scroll vertical, padding horizontal 24px (desktop), 16px (mobile)
- **Paletas:** cards com `bg #1A1A1A`, radius 12px, padding 20px
- **Gap entre paletas:** 12px
- **Swatches:** altura 88px, ocupam 100% da largura do card, sem gap entre elas

---

## Componentes

### Swatch

O elemento mais importante da interface.

```
┌───────────────┐
│               │  ← 88px de altura, cor sólida
│               │
│   500  ●      │  ← step label (11px) + dot de contraste (hover)
│  #FF3B30      │  ← hex em mono (11px)
└───────────────┘
```

- Texto (step + hex) aparece **sempre** — não só no hover. Legibilidade é prioridade.
- Cor do texto muda automaticamente para branco ou preto baseado no contraste da swatch
- **Dot de contraste:** pequeno círculo no canto superior direito
  - Verde: passa AA contra branco e preto
  - Amarelo: passa em um dos dois
  - Vermelho: não passa em nenhum
- **Hover:** leve highlight `rgba(255,255,255,0.06)` + cursor pointer
- **Click:** copia HEX. Toast sutil "Copied" por 1.5s
- **Stop base (500):** borda inferior 2px branca como marcador discreto

### Stop com lock

Quando editado manualmente:
- Ícone de cadeado `🔒` pequeno (12px) no canto superior esquerdo da swatch
- Tooltip no hover: "Manually set — click to reset"

### Input de cor

```
[██] #FF3B30
```

- Quadrado colorido clicável abre color picker nativo
- Campo texto ao lado: aceita HEX com ou sem `#`
- Validação em tempo real: borda vermelha `#E5483D` se HEX inválido
- Ao perder foco com valor válido: escala regenera automaticamente

### Card de paleta

```
┌─────────────────────────────────────────────┐
│  [color input]  [nome editável]    [menu ⋯] │
│                                             │
│  [swatches]                                 │
│                                             │
│  [acessibilidade ▾]                         │
└─────────────────────────────────────────────┘
```

- Nome: clique para editar inline, Enter para confirmar
- Menu `⋯`: Duplicate / Remove / Reorder
- Accordion "Accessibility": abre matriz de contraste abaixo das swatches

### Botão Add Color

```
[+ Add color]
```

- Estilo ghost: sem fundo, borda `#2E2E2E`, texto `#8A8A8A`
- Hover: borda `#3D3D3D`, texto `#F5F5F5`
- Centered, full-width do container de paletas, altura 44px

### Botão Export

- No header, canto direito
- Estilo primário: `bg #FFFFFF`, texto `#0F0F0F`, radius 8px
- Hover: `bg #E0E0E0`
- Clique abre sheet/modal de exportação

### Modal de exportação

- Slide up (mobile) ou centered modal (desktop)
- Backdrop `rgba(0,0,0,0.6)` com blur suave
- Abas: JSON / CSS Variables / Tailwind / Figma Variables
- Área de código: fundo `#0A0A0A`, fonte mono, syntax highlight mínimo (apenas strings em uma cor)
- Botões: "Copy all" + "Download"
- Fechar: X no canto ou click fora

---

## Motion e interações

**Filosofia:** funcional, não ornamental. Transições ajudam a entender o que mudou — não existem para impressionar.

| Interação | Efeito | Duração |
|---|---|---|
| Gerar escala (novo input) | Swatches fade-in sequencial (50→900) | 300ms total, stagger 20ms |
| Hover em swatch | Background overlay | 100ms ease |
| Copy HEX | Swatch pulsa levemente (scale 0.98→1) | 150ms |
| Toast "Copied" | Fade in, pausa, fade out | 1.5s total |
| Abrir accordion accessibility | Expand suave | 200ms ease-out |
| Adicionar paleta | Card slide down + fade in | 250ms ease-out |
| Remover paleta | Card collapse | 200ms ease-in |
| Abrir modal export | Fade in + scale de 0.97→1 | 180ms |

Sem animações de loading além de um estado sutil de "gerando…" nas swatches (skeleton shimmer por ~200ms).

---

## Estados da interface

### Estado vazio (primeiro acesso)

```
┌────────────────────────────────────────┐
│  Simple Palette                        │
├────────────────────────────────────────┤
│                                        │
│         ┌─────────────────────┐        │
│         │  Start with a color │        │
│         │  [██] #3478F6       │        │
│         │  [Generate palette] │        │
│         └─────────────────────┘        │
│                                        │
└────────────────────────────────────────┘
```

CTA centralizado. Nenhum elemento extra. O usuário sabe exatamente o que fazer.

### Estado com paletas

Layout normal com cards de paleta.

### Estado de erro de input

- Campo HEX: borda vermelha, mensagem inline "Invalid color" em 11px
- Cor extrema (muito clara/escura): banner sutil dentro do card informando o ajuste feito

---

## Responsividade

### Desktop (≥1024px)
- Container de paletas: max-width 960px, centralizado
- Swatches: sempre em linha horizontal

### Tablet (768–1023px)
- Container: full-width com padding 24px
- Sem mudança na estrutura

### Mobile (<768px)
- Swatches: scroll horizontal dentro do card (não quebra em grid)
- Modal de export: full-screen bottom sheet
- Header: apenas logo + ícone de export (sem texto)
- Add color: botão flutuante fixo no bottom center

---

## Acessibilidade da própria interface

- Todos os elementos interativos com focus ring visível (`outline 2px #FFFFFF, offset 2px`)
- Contraste mínimo AA em todo texto da interface
- Ações destrutivas (remove palette) com confirmação inline
- Tooltips em todos os ícones sem label

---

## O que não fazer

- Nenhum gradiente ou glassmorphism na interface (reservado para as swatches se necessário)
- Nenhuma ilustração ou ícone decorativo
- Nenhuma animação de entrada na página (sem hero, sem splash)
- Nenhuma cor de marca própria — a interface é intencionalmente sem cor para não interferir
- Nenhum tooltip persistente ou tour de onboarding — o produto se explica
