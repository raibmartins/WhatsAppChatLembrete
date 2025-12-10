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

        const box = document.createElement('div');
        box.id = 'floatingTodoBox';
        box.style.position = 'fixed';
        box.style.top = '20px';
        box.style.right = '20px';
        box.style.width = '500px';
        box.style.background = '#111';
        box.style.color = '#fff';
        box.style.borderRadius = '12px';
        box.style.boxShadow = '0 5px 20px rgba(0,0,0,0.4)';
        box.style.fontFamily = 'Arial, sans-serif';
        box.style.zIndex = '9999';
        box.style.userSelect = 'none';

        const header = document.createElement('div');
        header.style.background = '#222';
        header.style.padding = '10px';
        header.style.cursor = 'move';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const title = document.createElement('span');
        title.innerText = '📅 Lembretes';

        const toggleBtn = document.createElement('span');
        toggleBtn.innerText = '-';
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.fontSize = '18px';

        header.appendChild(title);
        header.appendChild(toggleBtn);

        const content = document.createElement('div');
        content.style.padding = '10px';
        content.id = 'clientesList';

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
            content.style.display = minimized ? 'none' : 'block';
            toggleBtn.innerText = minimized ? '+' : '-';
        };

        // === DRAG ===
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        header.addEventListener('mousedown', (e) => {
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

        box.appendChild(header);
        box.appendChild(content);
        document.body.appendChild(box);

        renderClientes();
    }
})();
