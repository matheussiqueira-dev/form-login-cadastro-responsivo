# Pulse ID - Formulário de Login e Cadastro Responsivo

## Visão geral do projeto
O projeto foi evoluído de um formulário simples para um **portal de autenticação front-end** com foco em experiência do usuário, qualidade técnica e base pronta para expansão.

Ele simula os fluxos de login, cadastro e recuperação de senha com persistência local, validações robustas e feedback contextual em tempo real.

## Propósito, público-alvo e fluxo principal
**Propósito:** servir como base profissional para produtos que precisam de fluxo de autenticação inicial, prototipação rápida e boa experiência em desktop/mobile.

**Público-alvo:**
- Desenvolvedores que precisam de um template de autenticação moderno sem dependências de framework.
- Times de produto/UX que desejam validar fluxo de entrada e onboarding com rapidez.
- Estudantes e profissionais que querem estudar boas práticas de front-end aplicado.

**Fluxo principal:**
1. Usuário escolhe o modo `Entrar` ou `Criar conta`.
2. No cadastro, o sistema valida nome, e-mail, força de senha, confirmação e aceite de termos.
3. No login, valida credenciais com proteção contra tentativas excessivas.
4. Ao autenticar, sessão simulada é criada e exibida na interface.
5. Recuperação de senha simula envio de link sem expor existência de conta.

## Análise técnica da versão anterior
A versão anterior funcionava para demonstração básica, mas apresentava limitações para cenário real de evolução:
- Estrutura monolítica (HTML, CSS e JS no mesmo arquivo).
- Fluxo único sem separação clara entre login e cadastro.
- Baixa escalabilidade para manutenção e inclusão de novas features.
- Validações e feedbacks simplificados.
- UX visual muito básica para padrão de produto profissional.

## Otimizações e melhorias implementadas
### Arquitetura e manutenção
- Separação de camadas em arquivos independentes:
  - `site/index.html`
  - `site/assets/css/styles.css`
  - `site/assets/js/app.js`
- Organização da lógica em funções com responsabilidades claras (estado, validação, sessão, storage, UI).
- Padronização de nomes, seletores e mensagens de erro para facilitar manutenção.

### Performance e escalabilidade
- Remoção de estilos/scripts inline.
- Script com `defer` para carregamento não bloqueante.
- Atualizações de UI focadas em eventos necessários e manipulação de estado local enxuta.
- Estrutura preparada para futura troca de persistência local por API real.

### Segurança (escopo front-end)
- Hash de senha com `Web Crypto (SHA-256)` para armazenamento local simulado.
- Bloqueio temporário após múltiplas tentativas de login.
- Mensagem neutra no fluxo de recuperação para evitar enumeração de contas.
- Normalização de dados de entrada (nome e e-mail).

### UI/UX (refactor completo)
- Redesign total com linguagem visual moderna e hierarquia clara.
- Layout responsivo com painel informativo + painel de autenticação.
- Tipografia dedicada (`Sora` + `Plus Jakarta Sans`), tokens visuais e sistema de cores consistente.
- Animações úteis (entrada de layout, transições de modo e feedback visual).
- Suporte a `prefers-reduced-motion` para acessibilidade.
- Melhorias semânticas e ARIA (`tablist`, `tabpanel`, `aria-live`, `aria-invalid`).

## Novas funcionalidades implementadas e valor
- **Alternância Login/Cadastro com tabs acessíveis**
  - Melhora clareza do fluxo e reduz fricção.
- **Validação avançada de cadastro**
  - Reduz erros de entrada e melhora qualidade dos dados.
- **Medidor de força de senha + checklist de requisitos**
  - Incentiva criação de credenciais mais seguras.
- **Mostrar/Ocultar senha**
  - Melhora usabilidade e reduz erro de digitação.
- **Lembrar e-mail no login**
  - Acelera retornos frequentes do usuário.
- **Sessão simulada com painel de estado**
  - Permite testar fluxo pós-login sem backend.
- **Recuperação de senha simulada via modal**
  - Acrescenta cenário essencial de autenticação.
- **Proteção de tentativas de login**
  - Mitiga abuso básico em fluxos de autenticação.

## Tecnologias utilizadas
- HTML5 semântico
- CSS3 (design tokens, layout responsivo, animações e media queries)
- JavaScript Vanilla (ES6+)
- Web Crypto API (hash de senha)
- LocalStorage (persistência simulada)

## Instruções de instalação e uso
### Requisitos
- Navegador moderno (Chrome, Edge, Firefox, Safari).

### Execução local
1. Clone o repositório:
```bash
git clone https://github.com/matheussiqueira-dev/form-login-cadastro-responsivo.git
```
2. Acesse a pasta do projeto:
```bash
cd form-login-cadastro-responsivo
```
3. Abra `site/index.html` no navegador **ou** rode um servidor local:
```bash
python -m http.server -d site 8000
```
4. Acesse:
```text
http://localhost:8000
```

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

## Boas práticas aplicadas
- Separação de responsabilidades (estrutura, estilo e comportamento).
- Interface orientada a acessibilidade e feedback contínuo.
- Validação defensiva no front-end com mensagens claras.
- Persistência com tratamento de exceções para ambientes restritos.
- Código preparado para migração futura para autenticação via API.

## Possíveis melhorias futuras
- Integração com backend real (JWT, refresh token, expiração de sessão).
- Testes automatizados (unitários e E2E com Playwright/Cypress).
- Internacionalização (i18n) para múltiplos idiomas.
- Políticas de senha configuráveis por ambiente.
- Telemetria de erros e eventos de autenticação.
- Camada de design tokens compartilhada com Storybook.

## Deploy
O projeto contém workflows de GitHub Actions para publicação estática via GitHub Pages com origem na pasta `site/`.

Autoria: Matheus Siqueira  
Website: https://www.matheussiqueira.dev/
