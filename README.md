# Pulse ID Backend - API de Autenticação Segura

## Visão geral do backend
Este repositório agora inclui um backend dedicado para o domínio de autenticação do projeto Pulse ID.

A API foi projetada para suportar fluxos reais de produção:
- cadastro de usuário
- login com bloqueio por tentativas inválidas
- sessão com `access token` + `refresh token` rotativo
- logout com revogação de sessão
- recuperação e redefinição de senha
- trilha de auditoria e métricas administrativas

## Análise do backend e decisões arquiteturais
### Situação inicial
O projeto original era apenas frontend estático, sem camada de API, persistência de dados, autenticação robusta ou governança de segurança no servidor.

### Arquitetura adotada
Foi implementado um **monólito modular** em Node.js/Express com separação por responsabilidades:
- `config`: variáveis e configuração de ambiente
- `core`: erros, logging e resposta HTTP padronizada
- `middlewares`: validação, auth, rate limit, tratamento global de erro
- `modules`: domínios (`auth`, `health`, `audit`)
- `infra`: persistência transacional em arquivo JSON com fila de mutações
- `routes`: versionamento e composição da API (`/api/v1`)

Esse modelo reduz acoplamento, facilita testes e permite evolução para microserviços no futuro sem reescrever regras de negócio.

## Segurança e confiabilidade implementadas
- Hash de senha com `bcrypt` (salt rounds 12)
- Access token JWT com expiração
- Refresh token opaco com hash SHA-256 e rotação
- Revogação de tokens em logout e reset de senha
- Bloqueio temporário de conta por falhas consecutivas de login
- Validação rigorosa com `zod` em body/query
- `helmet`, `cors` restritivo, `hpp`, `compression`
- Rate limiting global e dedicado para endpoints sensíveis
- Tratamento centralizado de erros com códigos padronizados
- Auditoria de eventos de autenticação e ações administrativas

## Features de backend adicionadas
- **API REST versionada (`/api/v1`)**
- **Módulo completo de autenticação**
- **Módulo de auditoria para administradores**
- **Métricas de autenticação em janela de 24h**
- **Contrato OpenAPI em `backend/docs/openapi.json`**
- **Teste de integração ponta a ponta automatizado**

## Tecnologias utilizadas
- Node.js 20+
- Express 4
- Zod
- JWT (`jsonwebtoken`)
- bcryptjs
- Pino + pino-http
- express-rate-limit
- Helmet / CORS / HPP / Compression
- Supertest + `node:test`

## Endpoints principais
### Health
- `GET /api/v1/health`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/metrics` (admin)

### Admin
- `GET /api/v1/admin/audit-logs` (admin)

### Docs
- `GET /api/v1/docs`

## Setup e execução
### 1. Instalar dependências
```bash
cd backend
npm install
```

### 2. Configurar ambiente
```bash
cp .env.example .env
```

### 3. Executar em desenvolvimento
```bash
npm run dev
```

### 4. Executar em modo produção
```bash
npm start
```

### 5. Rodar testes
```bash
npm test
```

## Estrutura do projeto
```text
backend/
├── data/
├── docs/
│   └── openapi.json
├── src/
│   ├── config/
│   ├── core/
│   ├── infra/
│   │   └── storage/
│   ├── middlewares/
│   ├── modules/
│   │   ├── auth/
│   │   ├── audit/
│   │   └── health/
│   ├── routes/
│   ├── app.js
│   ├── bootstrap.js
│   └── server.js
├── tests/
│   └── auth-api.test.js
├── .env.example
└── package.json
```

## Padrões e boas práticas aplicadas
- Separação de camadas (arquitetura modular)
- Regras de negócio isoladas em service
- Acesso a dados centralizado em repository
- Erros operacionais padronizados (`AppError`)
- Contrato de API versionado e documentado
- Teste de integração cobrindo fluxo crítico
- Princípios de manutenção: DRY, legibilidade e baixo acoplamento

## Melhorias futuras recomendadas
- Migração da persistência JSON para PostgreSQL
- Camada de cache distribuído (Redis) para sessões e rate limit global
- Observabilidade com métricas Prometheus + tracing OpenTelemetry
- CI com lint + cobertura mínima + security scanning
- RBAC mais granular e gestão de permissões por recurso
- Fluxo de e-mail real para recuperação de senha

## Repositório
Código publicado em:
- https://github.com/matheussiqueira-dev/form-login-cadastro-responsivo.git

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
