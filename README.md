# Formulário de Login/Cadastro Responsivo

Projeto simples para praticar HTML e CSS criando um formulário responsivo de login/cadastro com pseudo‑elementos e efeitos sutis.

## Recursos
- Campos: "Nome de Usuário" e "Senha".
- Botões: "Enviar" (submit) e "Limpar" (reset).
- Pseudo‑elementos: `::before` para ícones nos campos e `::after` para efeito visual nos botões no hover.
- Estilos: bordas arredondadas, sombras suaves e foco realçado.
- Responsivo: ocupa toda a largura em telas pequenas; centralizado com largura fixa em telas maiores.
- Validação: HTML5 + script exibindo mensagem de sucesso/erro (demo, sem backend).

## Como usar
1. Abra o arquivo `site/index.html` diretamente no navegador.
   - Caminho: `form-login-cadastro-responsivo/site/index.html`
2. Opcional: sirva com um servidor local (recomendado para testar melhor):
   - Python 3: `python -m http.server -d form-login-cadastro-responsivo/site 8000`
   - Acesse: http://localhost:8000

## Estrutura
- `site/index.html`: HTML + CSS + pequeno JS (efeito de hover e validação/demo de envio).

## Publicação com GitHub Pages
- Método atual: branch `gh-pages` (workflow `.github/workflows/gh-pages.yml`).
- Em Settings > Pages, defina Source: Deploy from a branch → `gh-pages` / `(root)`.
- A cada push na `main`, o workflow publica a pasta `site/` na `gh-pages`.

## Responsividade
- Mobile (≤ 480px): formulário preenche a largura, paddings reduzidos.
- Tablet (481–900px): largura máxima ampliada.
- Desktop (≥ 901px): cartão centralizado com `max-width` confortável.

## Pseudo‑elementos e efeitos
- Ícones dos campos: `.field::before` usa o atributo `data-icon` para injetar o emoji antes do input.
- Efeito nos botões: `.btn::after` cria um gradiente animado ao passar o mouse; um pequeno script atualiza as variáveis CSS `--x` e `--y` conforme a posição do cursor.

## Personalização rápida
- Ícones: altere os valores de `data-icon` nos wrappers `.field` (ex.: `👤`, `🔒`).
- Cores: edite as variáveis em `:root` (`--accent`, `--text`, etc.).
- Quebras de layout: ajuste os breakpoints nas media queries.

## Screenshots (opcional)
Você pode adicionar imagens em `screenshots/` e referenciá‑las aqui:

```md
![Desktop](screenshots/desktop.png)
![Mobile](screenshots/mobile.png)
```

---

Feito para prática e aprendizado. Sugestões e melhorias são bem‑vindas!
