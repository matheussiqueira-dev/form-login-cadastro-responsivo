# Pulse ID - Frontend de Autenticação Responsivo

## Visão geral do frontend
O projeto é uma aplicação web estática que simula um fluxo completo de autenticação com foco em **experiência do usuário, acessibilidade e arquitetura frontend limpa**.

A interface cobre os cenários principais de entrada de usuário:
- login
- cadastro
- recuperação de senha
- sessão ativa

Tudo foi implementado em HTML, CSS e JavaScript Vanilla, com organização em camadas e base pronta para integração com backend real.

## Propósito, público-alvo e fluxos principais
**Propósito:** oferecer um frontend profissional de autenticação para prototipação rápida, validação de UX e evolução para produção.

**Público-alvo:**
- Desenvolvedores frontend que precisam de base moderna sem framework.
- Times de produto/design que desejam testar jornadas de entrada e conversão.
- Portfólios e estudos técnicos de arquitetura frontend.

**Fluxos principais:**
1. Alternar entre `Entrar` e `Criar conta`.
2. Cadastrar com validação robusta e senha forte.
3. Logar com proteção de tentativas e feedback contextual.
4. Recuperar senha por modal com resposta neutra (simulada).
5. Gerenciar sessão ativa (logout/troca de usuário).

## Análise técnica do frontend
### Situação inicial
- Estrutura monolítica (HTML + CSS + JS juntos).
- Fluxo simples, baixa escalabilidade para novas features.
- Validação limitada e pouca observabilidade de estado.
- UI básica para estudo inicial.

### Evolução aplicada
- Separação de responsabilidades em arquivos independentes.
- Lógica de estado e persistência mais previsível.
- Camada visual com tokens e componentes reutilizáveis.
- Melhorias de SEO, acessibilidade e feedback em tempo real.

## Stack e tecnologias
- HTML5 semântico
- CSS3 (tokens visuais, componentes, responsividade, microinterações)
- JavaScript ES6+ (sem dependências)
- Web Crypto API (hash SHA-256 para persistência simulada)
- LocalStorage (dados de demo, sessão e métricas)
- GitHub Actions (deploy estático para GitHub Pages)

## Estrutura do projeto
```text
form-login-cadastro-responsivo-main/
├── .github/
│   └── workflows/
│       ├── gh-pages.yml
│       └── static.yml
├── site/
│   ├── assets/
│   │   ├── css/
│   │   │   └── styles.css
│   │   └── js/
│   │       └── app.js
│   └── index.html
├── LICENSE
└── README.md
```

## Refactor de UI/UX (nível sênior)
- Redesign completo com hierarquia visual forte e identidade consistente.
- Layout responsivo em duas áreas: contexto de produto + fluxo de autenticação.
- Design system com tokens de cor, raio, sombra, tipografia e estados.
- Componentes reutilizáveis de botão, feedback, tabs, cards e modal.
- Microinterações com foco em clareza (transições de modo, indicadores e respostas visuais).

## Novas funcionalidades implementadas e justificativa
- **Acesso com conta demo (1 clique):** reduz atrito e melhora conversão em testes e apresentações.
- **Gerador de senha forte + copiar senha:** aumenta segurança e reduz abandono no cadastro.
- **Auto-save de rascunho de cadastro (sem senha):** melhora continuidade de preenchimento.
- **Aviso de Caps Lock:** reduz erro de autenticação por digitação.
- **Bloqueio com contagem regressiva em tempo real:** reforça segurança e transparência para o usuário.
- **Métrica de sucesso das tentativas nas últimas 24h:** adiciona sinal de qualidade do fluxo para análise local.
- **Recuperação de senha com resposta neutra:** evita exposição de existência de conta no feedback.

## Performance, SEO, acessibilidade e responsividade
### Performance
- CSS e JS externos (sem inline pesado).
- Script carregado com `defer`.
- Lógica de interface baseada em atualizações pontuais de estado.

### SEO
- `meta description`, `robots`, `canonical`.
- Open Graph (`og:title`, `og:description`, `og:url`, etc.).
- JSON-LD (`WebApplication`) para enriquecimento semântico.

### Acessibilidade (WCAG-oriented)
- Estrutura semântica com labels explícitos.
- `aria-live`, `aria-invalid`, `tablist` e `tabpanel` nos fluxos críticos.
- `skip link` para navegação por teclado.
- Estados de foco visíveis e suporte a `prefers-reduced-motion`.

### Responsividade
- Layout adaptável para desktop, tablet e mobile.
- Ajustes de grid e empilhamento para componentes interativos em telas pequenas.

## Setup e execução
### Pré-requisitos
- Navegador moderno (Chrome, Edge, Firefox ou Safari).

### Rodar localmente
1. Clonar:
```bash
git clone https://github.com/matheussiqueira-dev/form-login-cadastro-responsivo.git
```
2. Entrar no diretório:
```bash
cd form-login-cadastro-responsivo
```
3. Executar servidor local (recomendado):
```bash
python -m http.server -d site 8000
```
4. Acessar:
```text
http://localhost:8000
```

### Build
- Não há etapa de build obrigatória (frontend estático).

### Deploy
- Publicação estática via workflows em `.github/workflows/`, com origem em `site/`.

## Boas práticas adotadas
- Separação de camadas (estrutura, estilo e comportamento).
- Nomenclatura clara de IDs/classes e funções.
- Validações defensivas com mensagens orientadas ao usuário.
- Persistência local com sanitização e fallback.
- Componentização visual orientada a reutilização.

## Melhorias futuras
- Integração com API real (JWT + refresh token + expiração de sessão).
- Suite de testes automatizados (unit + e2e).
- Internacionalização (`pt-BR` / `en-US`).
- Política de segurança de conteúdo (CSP) e hardening adicional.
- Telemetria estruturada para funil de autenticação.
- Evolução para PWA com suporte offline.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
