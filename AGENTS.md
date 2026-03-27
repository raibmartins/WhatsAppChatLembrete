# AGENTS.md - Guia para Agentes de Codificação IA

## Visão Geral da Arquitetura

Este projeto é um conjunto de scripts Tampermonkey para WhatsApp Web, permitindo gerenciar lembretes visuais flutuantes para conversas. A arquitetura é modular, com componentes carregados remotamente ou diretamente via `@require`.

### Componentes Principais
- **`loader.js`**: Carregador remoto que busca `janela.js` e `botao.js` do GitHub via `loadScript()`. Útil para desenvolvimento sem reinstalar o userscript.
- **`janela.js`**: Cria uma janela flutuante (`#floatingTodoBox`) que exibe lembretes ordenados por data. Gerencia dados no `localStorage` com chave `'clientes_lembretes'`. Fornece APIs globais: `window.addCliente({nome, data, motivo, foto})` e `window.removeClienteByNome(nome)`.
- **`botao.js`**: Injeta opção "Marcar lembrete" no menu de contexto do WhatsApp. Abre modal para inserir data/hora e motivo, capturando nome e foto do contato selecionado.
- **`user.js`**: Userscript principal que inclui `janela.js` e `botao.js` diretamente via `@require`, evitando carregamento remoto.

### Fluxo de Dados
- Lembretes armazenados como array JSON no `localStorage`: `[{nome: string, data: 'DD/MM/YYYY HH:MM', motivo: string, foto: base64|url}]`.
- Parsing de datas via `parseData()` em `janela.js`, convertendo para timestamp para ordenação.
- Comunicação entre scripts via funções globais (`window.addCliente`).

### Decisões Estruturais
- Modularidade para facilitar manutenção: janela separada da injeção de botão.
- Persistência local para funcionar offline, sem dependências externas.
- Interface visual integrada ao WhatsApp Web, usando DOM manipulation para menus e overlays.

## Workflows de Desenvolvimento

### Instalação e Teste
- Instale `user.js` no Tampermonkey para uso direto, ou `loader.js` para carregamento remoto.
- Teste em `https://web.whatsapp.com/*` após login.
- Para debugging: Use `console.log` (ex.: `[WhatsLembrete] Componente carregado` em `loader.js`). Abra DevTools no WhatsApp Web.

### Build e Deploy
- Sem build: Scripts são JavaScript puro. Atualize versões em headers `@version`.
- Deploy: Push para GitHub; `loader.js` carrega automaticamente as versões remotas.
- Atualização: Use `@updateURL` e `@downloadURL` em `user.js` para auto-update no Tampermonkey.

## Convenções e Padrões Específicos

### Manipulação de DOM
- Use `document.querySelector` com seletores específicos do WhatsApp (ex.: `div[aria-selected="true"]` para contato ativo em `botao.js`).
- Estilos inline para isolamento, evitando conflitos CSS (ex.: `box.style.zIndex = '9999'`).

### Tratamento de Dados
- Datas no formato brasileiro `'DD/MM/YYYY HH:MM'` (ex.: `dt.toLocaleString('pt-BR')` em `botao.js`).
- Fotos: Converta para base64 se necessário (ex.: `resolveFoto()` em `janela.js` prepende `'data:image/jpeg;base64,'`).

### Padrões de Código
- IIFE (Immediately Invoked Function Expression) para isolamento (ex.: `(function () { 'use strict'; ... })()` em todos os scripts).
- Evite globals exceto APIs intencionais (`window.addCliente`).
- Tratamento de erros básico: `try/catch` no `JSON.parse` de `localStorage`.

## Integrações e Dependências

- **WhatsApp Web**: Manipulação direta do DOM; dependente de seletores que podem mudar com atualizações do WhatsApp.
- **Tampermonkey**: Framework para userscripts; use `@match`, `@grant none` para permissões mínimas.
- **Nenhuma dependência externa**: Tudo local, exceto carregamento remoto opcional via GitHub URLs.

## Exemplos de Padrões

- **Adicionar lembrete**: Em `botao.js`, capture contato e abra modal:
  ```javascript
  const nomeContato = getNomeContatoAtual();
  window.addCliente({nome: nomeContato, data: dataFormatada, motivo: motivo.trim(), foto: fotoContato});
  ```
- **Renderizar lista**: Em `janela.js`, ordene e crie cards:
  ```javascript
  const clientesOrdenados = [...clientes].sort((a, b) => parseData(a.data) - parseData(b.data));
  // Criar elementos DOM para cada cliente
  ```

Referências: `janela.js` (lógica de render), `botao.js` (injeção de UI), `loader.js` (carregamento remoto).</content>
<parameter name="filePath">/ambiente/repositorio/pessoal/WhatsAppChatLembrete/AGENTS.md