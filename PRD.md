# PRD — Simple Palette
**Versão:** 2.0
**Data:** 2026-03-15
**Status:** Em planejamento

---

## Visão do Produto

Simple Palette é uma ferramenta web para designers criarem color scales consistentes e tokens prontos para uso. O usuário entra com uma cor base e sai com uma paleta completa, acessível e exportável — sem precisar entender color science.

A referência de mercado é o Leonardo Color (leonardocolor.io), mas a proposta é radicalmente mais simples: menos configuração, mais automação, resultado imediato.

---

## Princípios

1. **Simplicidade extrema** — uma tela, sem modais desnecessários
2. **Automação** — o usuário não precisa entender teoria de cor
3. **Consistência** — todas as escalas seguem a mesma lógica
4. **Escalabilidade** — funciona para múltiplas cores sem perder clareza
5. **Acessibilidade** — contraste adequado desde a geração

---

## Usuário-alvo

Designers que trabalham com Design Systems e precisam gerar color tokens rapidamente. Podem ter conhecimento básico ou intermediário de acessibilidade, mas não dominam color science profundamente.

---

## Fluxo Principal

```
Entra no site
    ↓
Adiciona cor base (HEX ou color picker)
    ↓
Sistema gera escala automaticamente
    ↓
Usuário ajusta se necessário (nome, stops, stops individuais)
    ↓
Adiciona outras cores (opcional)
    ↓
Exporta tokens no formato desejado
```

Tudo ocorre em uma única tela. Não há navegação entre páginas.

---

## Funcionalidades

### 1. Input de cor base

- Campo HEX com validação em tempo real
- Color picker nativo integrado ao campo
- Nome da cor editável (ex: "Red", "Brand Primary")
  - Sistema auto-sugere o nome pela cor detectada (ex: `#FF3B30` → "Red")
  - Nomes devem ser únicos — alerta visual se houver duplicata (tokens colidiriam)
- Ao confirmar, a geração da escala acontece automaticamente

---

### 2. Geração de escala de cores

**Padrão:** 9 stops — 50, 100, 200, 300, 400, 500, 600, 700, 800, 900

**Algoritmo:**
- Conversão para espaço de cor OKLCH (perceptualmente uniforme)
- Hue e Chroma da cor base são preservados em todos os stops
- Lightness é distribuída progressivamente:
  - Stop 50 → ~95% de lightness
  - Stop 900 → ~15% de lightness
- A cor base do usuário é sempre ancorada no stop 500 (lightness original preservada)
- Conversão final de volta para HEX/sRGB com gamut mapping (cores fora do sRGB são aproximadas, não quebradas)

**Casos extremos — comportamento definido:**

| Input | Comportamento |
|---|---|
| Cor muito clara (lightness > 85%) | Sistema avisa e ancora no stop 200 automaticamente, ou usuário escolhe o stop manualmente |
| Cor muito escura (lightness < 20%) | Sistema avisa e ancora no stop 800 automaticamente |
| Cor desaturada / cinza | Gera escala válida; sistema avisa que a cor é de baixa saturação |
| Preto ou branco puros | Bloqueado com mensagem explicativa — use "Neutral Scale" para isso |

---

### 3. Neutral Scale (escala de cinza)

Funcionalidade separada para geração de gray scale.

- Cinza puro (`#808080`) gera tons "frios" que descasam da paleta de marca
- A Neutral Scale é gerada com um **leve tint** derivado da cor primária do projeto
- Usuário pode escolher qual paleta influencia o tint, ou usar cinza neutro
- Exportada com o mesmo padrão: `color.neutral.50` → `color.neutral.900`

---

### 4. Ajuste do número de stops

Usuário pode customizar quantos stops gerar:

- **Mínimo:** 5 stops
- **Padrão:** 9 stops (50–900)
- **Máximo:** 12 stops

Ao adicionar stops intermediários, o sistema os interpola automaticamente no espaço OKLCH.

Ao remover stops, os tokens correspondentes são removidos da exportação.

---

### 5. Edição manual de stops individuais

Após a geração automática, o usuário pode:

- Clicar em qualquer swatch para editar o HEX manualmente
- O stop editado fica marcado como "fixo" (ícone de cadeado)
- Stops fixos não são alterados ao regenerar a escala
- Múltiplos stops podem ser fixados
- "Desbloquear" o stop volta ao valor gerado automaticamente

**Caso de uso principal:** garantir que a cor de marca exata apareça em um stop específico.

---

### 6. Múltiplas paletas

- Usuário pode adicionar quantas paletas quiser
- Cada paleta tem nome, cor base, e sua escala independente
- Paletas podem ser reordenadas (drag or up/down arrows)
- Paletas podem ser duplicadas ou removidas
- Nomes de paletas devem ser únicos (tokens não podem colidir)

---

### 7. Acessibilidade

**Por swatch (sempre visível):**
- Ícone de contraste mostrando se passa AA contra branco e contra preto
- Ao hover: valor exato do contrast ratio (ex: 4.7:1)

**Painel de acessibilidade (expandível):**
- Matriz de contraste entre todos os stops da paleta
- Destaque visual de quais combinações passam AA (4.5:1) e AAA (7:1)
- Sugestão de pares seguros: "Use 900 como texto sobre 50 como fundo"

**Algoritmo:** WCAG 2.1 (padrão atual). APCA pode ser adicionado como toggle na v2.

**Postura do sistema:**
- Problemas de contraste geram aviso — não bloqueiam a geração
- O usuário decide se aceita ou ajusta

---

### 8. Preview em contexto

Mini componentes de UI renderizados com as cores geradas para apoiar a decisão visual:

- Badge / Tag
- Botão primário e secundário
- Alerta / Banner
- Input com label

Componentes usam os stops 500 (base), 50 (background suave), 700 (hover), 900 (texto).

---

### 9. Simulação de daltonismo

Toggle para simular como a paleta aparece para:
- Deuteranopia (vermelho-verde, mais comum)
- Protanopia
- Tritanopia

Ajuda designers a validar se a paleta comunica significado apenas por matiz (problema) ou se tem contraste suficiente para ser universalmente legível.

---

### 10. Tokens — estrutura gerada

**Escala (geração automática):**
```
color.red.50
color.red.100
...
color.red.900
```

**Semânticos (camada opcional, v2):**
Arquitetura preparada desde o início. O usuário pode mapear stops para aliases:
```
brand.primary   → color.red.500
brand.primary.hover → color.red.600
brand.primary.subtle → color.red.50
```

---

### 11. Copiar valores rapidamente

- Clique em qualquer swatch → copia o HEX para o clipboard
- Feedback visual de confirmação (toast ou animação sutil)
- Clique no nome do token → copia o token completo (`color.red.500`)

---

### 12. Exportação

**Formatos disponíveis:**

| Formato | Prioridade | Exemplo |
|---|---|---|
| JSON (genérico) | MVP | `{ "color": { "red": { "500": "#FF3B30" } } }` |
| CSS Variables | MVP | `--color-red-500: #FF3B30;` |
| Tailwind Config | MVP | `colors: { red: { 500: '#FF3B30' } }` |
| Figma Variables | MVP | JSON no formato aceito pelo Figma para importação via plugin |
| W3C Design Tokens | v2 | `{ "color.red.500": { "$value": "#FF3B30", "$type": "color" } }` |
| SCSS Variables | v2 | `$color-red-500: #FF3B30;` |

**Interface de exportação:**
- Modal com abas por formato
- Preview do código antes de exportar
- Botão "Copiar" e botão "Baixar arquivo"
- Opção de exportar todas as paletas juntas ou cada uma separada

---

### 13. Persistência

**localStorage (automático):**
- Todo estado é salvo automaticamente no browser
- Ao reabrir o site, as paletas estão lá
- Sem login, sem backend

**URL como estado:**
- Paletas codificadas na URL em base64/JSON
- Ao compartilhar o link, o destinatário abre exatamente a mesma paleta
- Atualiza automaticamente enquanto o usuário edita
- Permite bookmarking e histórico do browser

---

### 14. Importação

- Colar JSON válido para importar paletas existentes
- Permite continuar trabalhando em uma paleta criada em outra ferramenta ou sessão anterior

---

## O que o produto NÃO faz (escopo negativo)

- Não tem contas de usuário ou login (v1)
- Não salva paletas em nuvem (v1)
- Não gera paletas temáticas completas (cores de alerta, sucesso, etc.) automaticamente — o usuário adiciona cada cor manualmente
- Não tem modo escuro automático na v1 (arquitetura preparada para v2)
- Não exporta para iOS/Android (v2)

---

## Arquitetura Técnica

### Stack

| Camada | Tecnologia | Motivo |
|---|---|---|
| Framework | Next.js + TypeScript | Produtivo, bom suporte a SSG |
| Estilo | Tailwind CSS | Consistente com projetos anteriores |
| Color Science | `culori` | Melhor lib JS para OKLCH, gamut mapping nativo |
| Contraste WCAG | Cálculo nativo via `culori` | Sem dependência extra |
| Estado | React `useState` + `useReducer` | App simples, sem Redux |
| Persistência | `localStorage` + URL params | Zero backend |
| Daltonismo | `culori` (simulação de espaços de cor) | Mesma lib |

### Estrutura de dados

```typescript
type ColorStop = {
  step: number          // 50, 100, 200...
  hex: string           // "#FF3B30"
  isLocked: boolean     // editado manualmente
  contrastWhite: number // ratio ex: 4.7
  contrastBlack: number
}

type Palette = {
  id: string
  name: string          // "Red"
  baseColor: string     // "#FF3B30"
  baseStep: number      // 500 (step onde a cor base foi ancorada)
  stops: ColorStop[]
}

type AppState = {
  palettes: Palette[]
  stopCount: number     // 5, 9 ou 12
}
```

---

## Roadmap de Entregas

### v1 — MVP (lançamento)
- [ ] Geração de escala OKLCH
- [ ] Múltiplas paletas
- [ ] Edição de stops individuais com lock
- [ ] Neutral Scale
- [ ] Acessibilidade por swatch (AA/AAA)
- [ ] Copiar HEX/token com clique
- [ ] Export: JSON, CSS Variables, Tailwind, Figma Variables
- [ ] Persistência localStorage + URL
- [ ] Preview em contexto (componentes básicos)

### v2 — Evolução
- [ ] Tokens semânticos (mapeamento de aliases)
- [ ] Simulação de daltonismo
- [ ] Matriz de contraste completa
- [ ] Modo escuro automático
- [ ] W3C Design Tokens format
- [ ] SCSS export
- [ ] APCA contrast
- [ ] Importação de JSON
- [ ] Histórico de versões (undo/redo)

---

## Referências

- [Leonardo Color](https://leonardocolor.io) — referência de mercado
- [OKLCH Color Picker](https://oklch.com) — entender o espaço de cor
- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [culori docs](https://culorijs.org) — lib de color science
- [Figma Variables JSON format](https://help.figma.com/hc/en-us/articles/15339657135383)
- [Tailwind CSS color config](https://tailwindcss.com/docs/customizing-colors)
