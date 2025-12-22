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

        const box = document.createElement('div');
        box.id = 'floatingTodoBox';
        box.style.position = 'fixed';
        box.style.top = '20px';
        box.style.right = '20px';
        box.style.width = tamanho.largura + 'px';
        box.style.height = tamanho.altura + 'px';
        box.style.background = '#111';
        box.style.color = '#fff';
        box.style.borderRadius = '12px';
        box.style.boxShadow = '0 5px 20px rgba(0,0,0,0.4)';
        box.style.fontFamily = 'Arial, sans-serif';
        box.style.zIndex = '9999';
        box.style.userSelect = 'none';
        box.style.overflow = 'hidden'; // Para evitar overflow durante resize

        const header = document.createElement('div');
        header.style.background = '#222';
        header.style.padding = '10px';
        header.style.cursor = 'move';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const title = document.createElement('span');
        title.innerText = 'Lembrete 📅';

        const toggleBtn = document.createElement('span');
        toggleBtn.innerText = '-';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '26px';

        header.appendChild(title);
        header.appendChild(toggleBtn);

        const content = document.createElement('div');
        content.style.padding = '10px';
        content.id = 'clientesList';
        content.style.padding = '10px';
        content.style.maxHeight = 'calc(100% - 50px)'; // Ajustar para altura dinâmica
        content.style.overflow = 'auto';

        // Handle de redimensionamento
        const resizeHandleBL = document.createElement('div'); // Bottom-Left
        resizeHandleBL.style.position = 'absolute';
        resizeHandleBL.style.bottom = '0';
        resizeHandleBL.style.left = '0';
        resizeHandleBL.style.width = '20px';
        resizeHandleBL.style.height = '20px';
        resizeHandleBL.style.cursor = 'nw-resize';
        resizeHandleBL.style.background = 'transparent';
        resizeHandleBL.style.borderBottom = '2px solid #555';
        resizeHandleBL.style.borderLeft = '2px solid #555';

        const resizeHandleBR = document.createElement('div'); // Bottom-Right
        resizeHandleBR.style.position = 'absolute';
        resizeHandleBR.style.bottom = '0';
        resizeHandleBR.style.right = '0';
        resizeHandleBR.style.width = '20px';
        resizeHandleBR.style.height = '20px';
        resizeHandleBR.style.cursor = 'ne-resize';
        resizeHandleBR.style.background = 'transparent';
        resizeHandleBR.style.borderBottom = '2px solid #555';
        resizeHandleBR.style.borderRight = '2px solid #555';

        const resizeHandleTL = document.createElement('div'); // Top-Left
        resizeHandleTL.style.position = 'absolute';
        resizeHandleTL.style.top = '0';
        resizeHandleTL.style.left = '0';
        resizeHandleTL.style.width = '20px';
        resizeHandleTL.style.height = '20px';
        resizeHandleTL.style.cursor = 'sw-resize';
        resizeHandleTL.style.background = 'transparent';
        resizeHandleTL.style.borderTop = '2px solid #555';
        resizeHandleTL.style.borderLeft = '2px solid #555';

        const resizeHandleTR = document.createElement('div'); // Top-Right
        resizeHandleTR.style.position = 'absolute';
        resizeHandleTR.style.top = '0';
        resizeHandleTR.style.right = '0';
        resizeHandleTR.style.width = '20px';
        resizeHandleTR.style.height = '20px';
        resizeHandleTR.style.cursor = 'se-resize';
        resizeHandleTR.style.background = 'transparent';
        resizeHandleTR.style.borderTop = '2px solid #555';
        resizeHandleTR.style.borderRight = '2px solid #555';

        // ===== RENDER =====
        function renderClientes() {
            content.innerHTML = '';

            if (clientes.length === 0) {
                content.innerHTML = `<div style="color:#777;font-size:12px;">Nenhum lembrete</div>`;
                return;
            }

            const clientesOrdenados = [...clientes].sort((a, b) => {
                return parseData(a.data) - parseData(b.data);
            });

            clientesOrdenados.forEach((cliente) => {
                const card = document.createElement('div');
                card.style.background = '#1c1c1c';
                card.style.border = '1px solid #333';
                card.style.borderRadius = '10px';
                card.style.padding = '10px';
                card.style.marginBottom = '8px';
                card.style.position = 'relative';
                card.style.display = 'flex';
                card.style.gap = '10px';
                card.style.alignItems = 'center';

                // ==== FOTO ====
                const foto = document.createElement('img');
                foto.style.width = '40px';
                foto.style.height = '40px';
                foto.style.borderRadius = '50%';
                foto.style.objectFit = 'cover';
                foto.style.flexShrink = '0';

                const fotoSrc = resolveFoto(cliente.foto);
                if (fotoSrc) {
                    foto.src = fotoSrc;
                } else {
                    foto.src = 'https://via.placeholder.com/40';
                }

                // ==== CONTEÚDO ====
                const info = document.createElement('div');
                info.style.flex = '1';

                const nome = document.createElement('div');
                nome.innerText = cliente.nome;
                nome.style.fontWeight = 'bold';
                nome.style.marginBottom = '2px';
                nome.style.fontSize = '14px';

                const data = document.createElement('div');
                data.innerText = '📆 ' + cliente.data;
                data.style.color = '#aaa';
                data.style.fontSize = '12px';

                const motivo = document.createElement('div');
                motivo.innerText = '📝 ' + (cliente.motivo || '');
                motivo.style.color = '#bbb';
                motivo.style.fontSize = '12px';
                motivo.style.marginTop = '4px';

                const removeBtn = document.createElement('span');
                removeBtn.innerText = '✖';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '6px';
                removeBtn.style.right = '8px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.color = '#f55';
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
                box.style.height = '50px'; // Altura mínima para o header
                resizeHandleBL.style.display = 'none';
                resizeHandleBR.style.display = 'none';
                resizeHandleTL.style.display = 'none';
                resizeHandleTR.style.display = 'none';
            } else {
                const tamanho = carregarTamanhoJanela() || { largura: 500, altura: 400 };
                box.style.height = tamanho.altura + 'px';
                content.style.display = 'block';
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
            if (e.target === toggleBtn) return; // Não iniciar drag se clicar no botão de toggle
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

        function startResize(e, direction) {
            isResizing = true;
            resizeDirection = direction;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = box.offsetWidth;
            startHeight = box.offsetHeight;
            startLeft = box.offsetLeft;
            startTop = box.offsetTop;
            e.preventDefault();
        }

        resizeHandleBL.addEventListener('mousedown', (e) => startResize(e, 'bl'));
        resizeHandleBR.addEventListener('mousedown', (e) => startResize(e, 'br'));
        resizeHandleTL.addEventListener('mousedown', (e) => startResize(e, 'tl'));
        resizeHandleTR.addEventListener('mousedown', (e) => startResize(e, 'tr'));

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

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
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                salvarTamanhoJanela(box.offsetWidth, box.offsetHeight);
                isResizing = false;
                resizeDirection = null;
            }
        });

        box.appendChild(header);
        box.appendChild(content);
        box.appendChild(resizeHandleBL);
        box.appendChild(resizeHandleBR);
        box.appendChild(resizeHandleTL);
        box.appendChild(resizeHandleTR);
        document.body.appendChild(box);

        renderClientes();
    }
})();
