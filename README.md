# Pulse ID - Plataforma Fullstack de Autenticação

## Visão geral
O **Pulse ID** é uma aplicação fullstack para autenticação com foco em UX moderna, segurança e manutenção em produção.

O projeto atende cenários reais de:
- login e cadastro com validação robusta
- recuperação e redefinição de senha
- gestão de perfil e sessões ativas
- trilha de auditoria para administração

Público-alvo:
- times de produto/engenharia que precisam de base sólida para fluxos de identidade
- portfólios técnicos com padrão profissional de frontend + backend

## Objetivos de negócio e produto
- reduzir falhas de autenticação por validações claras e feedback imediato
- aumentar confiabilidade do acesso por sessão com token rotativo
- melhorar governança com eventos de auditoria e métricas administrativas
- permitir evolução para produção com baixo acoplamento e arquitetura modular

## Arquitetura adotada
### Frontend
- aplicação web estática, responsiva e acessível
- JavaScript modular (core/services/main)
- integração com API REST versionada (`/api/v1`)
- design system leve baseado em tokens CSS (cores, raio, sombras, tipografia)

### Backend
- Node.js + Express em **monólito modular**
- separação por camadas: `config`, `core`, `middlewares`, `modules`, `infra`, `routes`
- módulo de autenticação com regras de negócio isoladas em service
- persistência em arquivo JSON com operações transacionais serializadas

### Decisões técnicas principais
- arquitetura modular para facilitar evolução e testes
- validação de contratos com `zod`
- segurança defensiva com `helmet`, `cors`, `hpp`, rate limiting e tratamento global de erros
- observabilidade mínima com logs estruturados e auditoria de eventos

## Stack e tecnologias
- Frontend: HTML5, CSS3, JavaScript ES Modules
- Backend: Node.js 20+, Express 4
- Segurança: JWT, bcryptjs, rate limiting, Helmet, CORS, HPP
- Validação: Zod
- Logging: Pino + pino-http
- Testes: Node test runner + Supertest
- Documentação de API: OpenAPI 3 (`backend/docs/openapi.json`)

## Funcionalidades principais
### Frontend
- login e cadastro com validação em tempo real
- medidor de força de senha + gerador/cópia de senha forte
- recuperação de senha com fluxo de solicitação/reset
- sessão autenticada com:
  - atualização de perfil
  - alteração de senha
  - listagem de sessões ativas
  - revogação de sessão individual e global
- painel administrativo de auditoria (quando usuário possui role `admin`)
- interface responsiva, com foco em acessibilidade e feedback contextual

### Backend
- `register`, `login`, `refresh`, `logout`
- `forgot-password` e `reset-password`
- `me`, `profile`, `change-password`
- gestão de sessões (`GET/DELETE /auth/sessions` e `DELETE /auth/sessions/:sessionId`)
- métricas de autenticação (`/auth/metrics`, admin)
- auditoria (`/admin/audit-logs`, admin)

## Segurança, performance e qualidade
- hash de senha com bcrypt (salt rounds 12)
- access token JWT com expiração curta
- refresh token opaco com hash + rotação
- revogação de sessões em eventos críticos (logout, troca/reset de senha)
- bloqueio temporário por tentativas inválidas de login
- limitação de taxa global e em rotas sensíveis
- compressão de resposta e mitigação de payload pollution
- padrão consistente de erro/response para facilitar manutenção

## Setup e execução
### Pré-requisitos
- Node.js 20+
- npm 10+

### 1) Clonar repositório
```bash
git clone https://github.com/matheussiqueira-dev/form-login-cadastro-responsivo.git
cd form-login-cadastro-responsivo
```

### 2) Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend disponível por padrão em: `http://localhost:3333`

### 3) Frontend
Em outro terminal, na raiz do projeto, sirva a pasta `site` em `http://localhost:8000`.

Exemplo com Python:
```bash
python -m http.server 8000 -d site
```

Exemplo com Node:
```bash
npx serve site -l 8000
```

Acesse: `http://localhost:8000`

### 4) Testes
```bash
cd backend
npm test
```

## API e documentação
- OpenAPI (arquivo): `backend/docs/openapi.json`
- Endpoint de docs: `GET /api/v1/docs`
- Health check: `GET /api/v1/health`

## Documentação de UX/UI
- Guia de análise e decisões de design: `site/docs/ux-ui-design-guide.md`
- Cobertura: contexto do produto, fricções, racional de UX, design system, acessibilidade e responsividade

## Estrutura do projeto
```text
.
├── backend/
│   ├── data/
│   ├── docs/
│   │   └── openapi.json
│   ├── src/
│   │   ├── config/
│   │   ├── core/
│   │   ├── infra/
│   │   │   └── storage/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── audit/
│   │   │   └── health/
│   │   ├── routes/
│   │   ├── app.js
│   │   ├── bootstrap.js
│   │   └── server.js
│   └── tests/
│       └── auth-api.test.js
└── site/
    ├── docs/
    │   └── ux-ui-design-guide.md
    ├── index.html
    └── assets/
        ├── css/
        │   └── styles.css
        └── js/
            ├── core/
            ├── services/
            └── main.js
```

## Boas práticas adotadas
- responsabilidade única por módulo/camada
- contratos de entrada validados antes da regra de negócio
- estado de sessão centralizado no frontend
- componentes visuais e tokens consistentes
- tratamento de erros explícito com mensagens úteis para usuário
- foco em legibilidade, reuso e previsibilidade de comportamento

## Melhorias futuras
- migrar persistência JSON para PostgreSQL
- adicionar Redis para sessões/rate limit distribuído
- incluir pipeline CI com lint, cobertura e SAST
- instrumentar métricas e tracing (OpenTelemetry)
- implementar envio real de e-mail no fluxo de recuperação
- ampliar testes (unitários, integração e e2e frontend)

## Repositório
https://github.com/matheussiqueira-dev/form-login-cadastro-responsivo.git

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
