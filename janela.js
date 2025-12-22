// ==UserScript==
// @name         Janela de lembretes
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Janela flutuante listando clientes com motivo, foto e ordenação por data
// @match        https://web.whatsapp.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    var iniciado = false;

    const STORAGE_KEY = 'clientes_lembretes';
    const WINDOW_SIZE_KEY = 'janela_tamanho';
    const THEME_KEY = 'janela_tema';
    let clientes = [];

    function salvarClientes() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
    }

    function carregarClientes() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            try {
                clientes = JSON.parse(data) || [];
            } catch {
                clientes = [];
            }
        }
    }

    function salvarTamanhoJanela(largura, altura) {
        localStorage.setItem(WINDOW_SIZE_KEY, JSON.stringify({ largura, altura }));
    }

    function carregarTamanhoJanela() {
        const data = localStorage.getItem(WINDOW_SIZE_KEY);
        if (data) {
            try {
                return JSON.parse(data);
            } catch {
                return null;
            }
        }
        return null;
    }

    function salvarTema(tema) {
        localStorage.setItem(THEME_KEY, tema);
    }

    function carregarTema() {
        return localStorage.getItem(THEME_KEY) || 'dark';
    }

    function parseData(dataStr) {
        if (!dataStr) return 0;
        const [data, hora] = dataStr.split(' ');
        if (!data) return 0;

        const [dia, mes, ano] = data.split('/');
        const [hh = '00', mm = '00'] = (hora || '').split(':');

        return new Date(
            parseInt(ano),
            parseInt(mes) - 1,
            parseInt(dia),
            parseInt(hh),
            parseInt(mm)
        ).getTime();
    }

    const waitForBody = setInterval(() => {
        if (document.body) {
            clearInterval(waitForBody);
            carregarClientes();
            createFloatingTodo();
        }
    }, 300);

    function resolveFoto(foto) {
        if (!foto) return null;
        if (foto.startsWith('data:image') || foto.startsWith('http')) {
            return foto;
        }
        return `data:image/jpeg;base64,${foto}`;
    }

    function createFloatingTodo() {
        if (iniciado) return;
        iniciado = true;

        const tamanho = carregarTamanhoJanela() || { largura: 500, altura: 400 };
        let temaAtual = carregarTema();

        const themes = {
            dark: {
                bg: '#111b21',
                header: '#202c33',
                text: '#e9edef',
                secondaryText: '#8696a0',
                cardBg: '#111b21',
                cardBorder: '#222d34',
                shadow: 'rgba(0,0,0,0.5)'
            },
            light: {
                bg: '#ffffff',
                header: '#00a884',
                text: '#111b21',
                secondaryText: '#667781',
                cardBg: '#ffffff',
                cardBorder: '#e9edef',
                shadow: 'rgba(0,0,0,0.1)'
            }
        };
        const box = document.createElement('div');
        box.id = 'floatingTodoBox';
        box.style.position = 'fixed';
        box.style.top = '20px';
        box.style.right = '20px';
        box.style.width = tamanho.largura + 'px';
        box.style.height = tamanho.altura + 'px';
        box.style.borderRadius = '12px';
        box.style.boxShadow = `0 5px 20px ${themes[temaAtual].shadow}`;
        box.style.fontFamily = 'Segoe UI, Helvetica Neue, Helvetica, Lucida Grande, Arial, Ubuntu, Cantarell, Fira Sans, sans-serif';
        box.style.zIndex = '9999';
        box.style.userSelect = 'none';
        box.style.overflow = 'hidden';
        box.style.transition = 'background 0.3s, color 0.3s, height 0.3s ease-in-out';

        const header = document.createElement('div');
        header.style.padding = '12px 16px';
        header.style.cursor = 'move';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.borderBottom = '1px solid rgba(0,0,0,0.1)';

        const title = document.createElement('span');
        title.innerText = 'Lembretes 📅';
        title.style.fontWeight = '500';
        title.style.fontSize = '16px';

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '15px';
        controls.style.alignItems = 'center';

        const themeBtn = document.createElement('span');
        themeBtn.innerText = temaAtual === 'dark' ? '☀️' : '🌙';
        themeBtn.style.cursor = 'pointer';
        themeBtn.style.fontSize = '14px';
        themeBtn.title = 'Alternar Tema';

        const toggleBtn = document.createElement('span');
        toggleBtn.innerText = '-';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '24px';
        toggleBtn.style.lineHeight = '1';

        controls.appendChild(themeBtn);
        controls.appendChild(toggleBtn);
        header.appendChild(title);
        header.appendChild(controls);

        const applyTheme = (tema) => {
            const colors = themes[tema];
            box.style.background = colors.bg;
            box.style.color = colors.text;
            header.style.background = colors.header;
            header.style.color = tema === 'light' ? '#ffffff' : colors.text; // Texto branco no header verde
            box.style.boxShadow = `0 5px 20px ${colors.shadow}`;
            themeBtn.innerText = tema === 'dark' ? '☀️' : '🌙';
            renderClientes();
        };

        themeBtn.onclick = () => {
            temaAtual = temaAtual === 'dark' ? 'light' : 'dark';
            salvarTema(temaAtual);
            applyTheme(temaAtual);
        };

        const content = document.createElement('div');
        content.style.padding = '10px';
        content.id = 'clientesList';
        content.style.maxHeight = 'calc(100% - 50px)';
        content.style.overflowY = 'auto';
        content.style.overflowX = 'hidden';

        // Estilo da scrollbar para parecer com o WhatsApp
        const style = document.createElement('style');
        style.innerHTML = `
            #clientesList::-webkit-scrollbar {
                width: 6px;
            }
            #clientesList::-webkit-scrollbar-thumb {
                background: rgba(128, 128, 128, 0.2);
                border-radius: 10px;
            }
            #clientesList::-webkit-scrollbar-thumb:hover {
                background: rgba(128, 128, 128, 0.3);
            }
        `;
        document.head.appendChild(style);

        // Handle de redimensionamento
        const resizeHandleBL = document.createElement('div'); // Bottom-Left
        resizeHandleBL.style.position = 'absolute';
        resizeHandleBL.style.bottom = '0';
        resizeHandleBL.style.left = '0';
        resizeHandleBL.style.width = '15px';
        resizeHandleBL.style.height = '15px';
        resizeHandleBL.style.cursor = 'nw-resize';
        resizeHandleBL.style.background = 'transparent';
        resizeHandleBL.style.borderBottom = '2px solid rgba(128,128,128,0.3)';
        resizeHandleBL.style.borderLeft = '2px solid rgba(128,128,128,0.3)';

        const resizeHandleBR = document.createElement('div'); // Bottom-Right
        resizeHandleBR.style.position = 'absolute';
        resizeHandleBR.style.bottom = '0';
        resizeHandleBR.style.right = '0';
        resizeHandleBR.style.width = '15px';
        resizeHandleBR.style.height = '15px';
        resizeHandleBR.style.cursor = 'ne-resize';
        resizeHandleBR.style.background = 'transparent';
        resizeHandleBR.style.borderBottom = '2px solid rgba(128,128,128,0.3)';
        resizeHandleBR.style.borderRight = '2px solid rgba(128,128,128,0.3)';

        const resizeHandleTL = document.createElement('div'); // Top-Left
        resizeHandleTL.style.position = 'absolute';
        resizeHandleTL.style.top = '0';
        resizeHandleTL.style.left = '0';
        resizeHandleTL.style.width = '15px';
        resizeHandleTL.style.height = '15px';
        resizeHandleTL.style.cursor = 'sw-resize';
        resizeHandleTL.style.background = 'transparent';
        resizeHandleTL.style.borderTop = '2px solid rgba(128,128,128,0.3)';
        resizeHandleTL.style.borderLeft = '2px solid rgba(128,128,128,0.3)';

        const resizeHandleTR = document.createElement('div'); // Top-Right
        resizeHandleTR.style.position = 'absolute';
        resizeHandleTR.style.top = '0';
        resizeHandleTR.style.right = '0';
        resizeHandleTR.style.width = '15px';
        resizeHandleTR.style.height = '15px';
        resizeHandleTR.style.cursor = 'se-resize';
        resizeHandleTR.style.background = 'transparent';
        resizeHandleTR.style.borderTop = '2px solid rgba(128,128,128,0.3)';
        resizeHandleTR.style.borderRight = '2px solid rgba(128,128,128,0.3)';

        // ===== RENDER =====
        function renderClientes() {
            content.innerHTML = '';
            const colors = themes[temaAtual];

            if (clientes.length === 0) {
                content.innerHTML = `<div style="color:${colors.secondaryText};font-size:13px;text-align:center;margin-top:20px;">Nenhum lembrete</div>`;
                return;
            }

            const clientesOrdenados = [...clientes].sort((a, b) => {
                return parseData(a.data) - parseData(b.data);
            });

            clientesOrdenados.forEach((cliente) => {
                const card = document.createElement('div');
                card.style.background = colors.cardBg;
                card.style.border = `1px solid ${colors.cardBorder}`;
                card.style.borderRadius = '8px';
                card.style.padding = '12px';
                card.style.marginBottom = '10px';
                card.style.position = 'relative';
                card.style.display = 'flex';
                card.style.gap = '12px';
                card.style.alignItems = 'center';
                card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

                // ==== FOTO ====
                const foto = document.createElement('img');
                foto.style.width = '45px';
                foto.style.height = '45px';
                foto.style.borderRadius = '50%';
                foto.style.objectFit = 'cover';
                foto.style.flexShrink = '0';

                const fotoSrc = resolveFoto(cliente.foto);
                if (fotoSrc) {
                    foto.src = fotoSrc;
                } else {
                    foto.src = 'https://via.placeholder.com/45';
                }

                // ==== CONTEÚDO ====
                const info = document.createElement('div');
                info.style.flex = '1';

                const nome = document.createElement('div');
                nome.innerText = cliente.nome;
                nome.style.fontWeight = '500';
                nome.style.marginBottom = '2px';
                nome.style.fontSize = '15px';
                nome.style.color = colors.text;

                const data = document.createElement('div');
                data.innerText = '📆 ' + cliente.data;
                data.style.color = colors.secondaryText;
                data.style.fontSize = '12px';

                const motivo = document.createElement('div');
                motivo.innerText = (cliente.motivo || '');
                motivo.style.color = colors.secondaryText;
                motivo.style.fontSize = '13px';
                motivo.style.marginTop = '4px';
                motivo.style.lineHeight = '1.4';

                const removeBtn = document.createElement('span');
                removeBtn.innerText = '✖';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '10px';
                removeBtn.style.right = '12px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.color = '#f15c6d';
                removeBtn.style.fontSize = '24px';
                removeBtn.title = 'Remover';

                removeBtn.onclick = () => {
                    const idx = clientes.findIndex(c =>
                        c.nome === cliente.nome &&
                        c.data === cliente.data &&
                        c.motivo === cliente.motivo
                    );

                    if (idx !== -1) {
                        clientes.splice(idx, 1);
                        salvarClientes();
                        renderClientes();
                    }
                };

                info.appendChild(nome);
                info.appendChild(data);
                info.appendChild(motivo);

                card.appendChild(foto);
                card.appendChild(info);
                card.appendChild(removeBtn);
                content.appendChild(card);
            });
        }

        // ===== API GLOBAL =====
        window.addCliente = function (cliente) {
            if (!cliente || !cliente.nome || !cliente.data) {
                console.warn('Cliente inválido. Use: { nome, data, motivo, foto }', cliente);
                return;
            }
            clientes.push(cliente);
            salvarClientes();
            renderClientes();
        };

        window.removeClienteByNome = function (nome) {
            const index = clientes.findIndex(c => c.nome === nome);
            if (index !== -1) {
                clientes.splice(index, 1);
                salvarClientes();
                renderClientes();
            }
        };

        let minimized = false;
        toggleBtn.onclick = () => {
            minimized = !minimized;
            if (minimized) {
                content.style.display = 'none';
                box.style.height = '45px'; // Altura compacta para o header
                themeBtn.style.display = 'none';
                resizeHandleBL.style.display = 'none';
                resizeHandleBR.style.display = 'none';
                resizeHandleTL.style.display = 'none';
                resizeHandleTR.style.display = 'none';
            } else {
                const tamanho = carregarTamanhoJanela() || { largura: 500, altura: 400 };
                box.style.height = tamanho.altura + 'px';
                content.style.display = 'block';
                themeBtn.style.display = 'block';
                resizeHandleBL.style.display = 'block';
                resizeHandleBR.style.display = 'block';
                resizeHandleTL.style.display = 'block';
                resizeHandleTR.style.display = 'block';
            }
            toggleBtn.innerText = minimized ? '+' : '-';
        };

        // === DRAG ===
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', (e) => {
            if (e.target === toggleBtn || e.target === themeBtn) return; // Não iniciar drag se clicar nos botões
            isDragging = true;
            const rect = box.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const boxWidth = box.offsetWidth;
            const boxHeight = box.offsetHeight;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;

            let left = e.clientX - offsetX;
            let top = e.clientY - offsetY;

            if (left < 0) left = 0;
            if (left + boxWidth > screenWidth) left = screenWidth - boxWidth;
            if (top < 0) top = 0;
            if (top + boxHeight > screenHeight) top = screenHeight - boxHeight;

            box.style.right = 'auto';
            box.style.left = left + 'px';
            box.style.top = top + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // === RESIZE ===
        let isResizing = false;
        let resizeDirection = null; // 'bl', 'br', 'tl', 'tr'
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;
        let startLeft = 0;
        let startTop = 0;
        let previousTransition = '';
        let rafPending = false;
        let lastMouseX = 0;
        let lastMouseY = 0;

        function startResize(e, direction) {
            isResizing = true;
            resizeDirection = direction;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = box.offsetWidth;
            startHeight = box.offsetHeight;
            startLeft = box.offsetLeft;
            startTop = box.offsetTop;
            // Desabilita transições para evitar animações encadeadas durante o resize
            previousTransition = box.style.transition || '';
            box.style.transition = 'none';
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            rafPending = false;
            e.preventDefault();
        }

        resizeHandleBL.addEventListener('mousedown', (e) => startResize(e, 'bl'));
        resizeHandleBR.addEventListener('mousedown', (e) => startResize(e, 'br'));
        resizeHandleTL.addEventListener('mousedown', (e) => startResize(e, 'tl'));
        resizeHandleTR.addEventListener('mousedown', (e) => startResize(e, 'tr'));

        function resizeFrame() {
            rafPending = false;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            const deltaX = lastMouseX - startX;
            const deltaY = lastMouseY - startY;

            if (resizeDirection.includes('l')) {
                newWidth = startWidth - deltaX;
                newLeft = startLeft + deltaX;
            } else if (resizeDirection.includes('r')) {
                newWidth = startWidth + deltaX;
            }

            if (resizeDirection.includes('t')) {
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
            } else if (resizeDirection.includes('b')) {
                newHeight = startHeight + deltaY;
            }

            // Limites mínimos
            const minWidth = 300;
            const minHeight = 200;

            if (newWidth >= minWidth) {
                box.style.width = newWidth + 'px';
                if (resizeDirection.includes('l')) {
                    box.style.left = newLeft + 'px';
                }
            }

            if (newHeight >= minHeight) {
                box.style.height = newHeight + 'px';
                if (resizeDirection.includes('t')) {
                    box.style.top = newTop + 'px';
                }
            }
        }

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(resizeFrame);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                // garante que última atualização foi aplicada
                if (rafPending) {
                    // aguarda o próximo frame e depois grava
                    requestAnimationFrame(() => {
                        salvarTamanhoJanela(box.offsetWidth, box.offsetHeight);
                        isResizing = false;
                        resizeDirection = null;
                        box.style.transition = previousTransition || 'background 0.3s, color 0.3s';
                        rafPending = false;
                    });
                } else {
                    salvarTamanhoJanela(box.offsetWidth, box.offsetHeight);
                    isResizing = false;
                    resizeDirection = null;
                    box.style.transition = previousTransition || 'background 0.3s, color 0.3s';
                }
            }
        });

        box.appendChild(header);
        box.appendChild(content);
        box.appendChild(resizeHandleBL);
        box.appendChild(resizeHandleBR);
        box.appendChild(resizeHandleTL);
        box.appendChild(resizeHandleTR);
        document.body.appendChild(box);

        applyTheme(temaAtual);
    }
})();
