# UX/UI Design Guide - Pulse ID

## 1) Análise de contexto
### Propósito do produto
Pulse ID é um portal de autenticação fullstack para produtos digitais que exigem:
- onboarding de conta sem fricção
- autenticação confiável
- gestão de credenciais e sessões
- visibilidade administrativa por métricas e auditoria

### Público-alvo
- usuários finais de produtos SaaS (login, cadastro, recuperação de senha)
- administradores com responsabilidade operacional
- times de produto e engenharia que precisam de consistência visual e técnica

### Objetivos de negócio
- elevar taxa de sucesso no acesso
- reduzir abandono em cadastro e recuperação de senha
- aumentar percepção de confiança no fluxo de identidade
- facilitar evolução do produto com padrões reutilizáveis

## 2) Fricções identificadas e ações
### Fricções observadas
- sobrecarga cognitiva inicial sem trilha clara de jornada
- baixa distinção visual entre contexto institucional e ação principal
- poucos sinais de progresso e estado durante o fluxo de autenticação
- campos críticos de senha sem consistência de controle visual em todos os cenários

### Ações implementadas
- separação mais clara entre painel de contexto (valor e métricas) e painel de ação
- adição de mapa de jornada e chips de valor para orientar o usuário no primeiro contato
- reforço de hierarquia tipográfica e espaçamento para leitura mais rápida
- padronização de `password-box` com ação de visibilidade em todos os pontos relevantes

## 3) Decisões de UX
### Arquitetura da informação
- coluna esquerda: contexto de produto, valor, status de negócio e jornada
- coluna direita: execução de tarefa (login/cadastro) e área autenticada

### Jornada principal
1. Selecionar modo (entrar/criar conta)
2. Preencher dados com validação imediata
3. Concluir autenticação
4. Gerenciar perfil, senha e sessões

### Microinterações
- transição de tabs com indicador deslizante
- revelação progressiva dos campos por painel ativo
- feedback visual por estado (info/success/error)
- botões com estados de foco, hover e disabled claramente distintos

## 4) Decisões de UI e Design System
### Tokens definidos
- cores semânticas: `brand`, `accent`, `danger`, `success`, `info`
- escala de espaçamento: `--space-1` a `--space-10`
- tipografia:
  - display: `Space Grotesk`
  - body: `Manrope`
- raios: `sm`, `md`, `lg`, `xl`, `pill`
- sombras: `sm`, `md`, `lg`

### Componentes padronizados
- botões: `primary-btn`, `secondary-btn`, `ghost-pill`
- formulário: `field-group`, `input`, `password-box`, `field-error`, `inline-hint`
- navegação de modo: `mode-switch`, `mode-tab`, `switch-indicator`
- feedback de sistema: `feedback` com variantes por severidade
- blocos autenticados: `session-card`, `session-block`, `sessions-list`, `audit-list`

### Estados de componentes
- botões: `hover`, `focus-visible`, `active`, `disabled`
- input: `default`, `hover`, `focus`, `invalid`
- mensagens: `info`, `success`, `error`

## 5) Acessibilidade (WCAG na prática)
### Melhorias aplicadas
- uso de landmarks e semântica estrutural
- `aria-live` em feedbacks e mensagens de erro
- `aria-describedby` para campos com suporte textual/erro
- contraste reforçado em tipografia principal e elementos interativos
- foco visível consistente para navegação por teclado
- suporte a `prefers-reduced-motion`
- `skip link` funcional para salto ao conteúdo principal

### Boas práticas adicionais recomendadas
- validação automatizada com axe/lighthouse no CI
- teste de navegação completa sem mouse
- revisão periódica de contraste após mudanças de marca

## 6) Responsividade e adaptação
### Estratégia
- layout em duas colunas em desktop
- colapso para coluna única em telas médias/pequenas
- reflow de grupos de ação para pilha vertical no mobile
- controles de senha e botões adaptados para toque

### Breakpoints atuais
- `1080px`: troca para layout em coluna única
- `760px`: simplificação de grids e formulários
- `560px`: empilhamento de ações e controles sensíveis a toque

## 7) Preparação para implementação
### Contratos mantidos
Todos os IDs e contratos usados pelo JavaScript foram preservados para evitar regressões funcionais:
- autenticação: `login-*`, `register-*`, `mode-*`
- sessão: `session-*`, `profile-*`, `change-password-*`, `sessions-*`
- reset: `reset-*`
- métricas: `users-count`, `last-login-label`, `success-rate-label`, `backend-status-label`

### Próximos passos sugeridos para produto
1. instrumentar eventos de UX (tempo de conclusão por etapa)
2. executar teste de usabilidade moderado com 5-8 usuários
3. evoluir biblioteca de componentes para tokens compartilhados frontend/backend docs
