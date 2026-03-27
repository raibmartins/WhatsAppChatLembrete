// ==UserScript==
// @name         Botão de lembrete
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Injeta opção "Marcar lembrete" com Toast grande + datepicker corrigido
// @match        https://web.whatsapp.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    console.log('Iniciando script de lembrete versão 1.9...');

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const menu = node.matches('[role="menu"]') ? node : node.querySelector('[role="menu"]');
                if (menu) injectReminderOption(menu);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function showToast(message) {
        if (document.querySelector('#tm-toast')) return;

        const toast = document.createElement('div');
        toast.id = 'tm-toast';
        toast.innerText = message;

        Object.assign(toast.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#000',
            color: '#fff',
            padding: '28px 40px',
            borderRadius: '20px',
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
            zIndex: '999999',
            opacity: '0',
            transition: 'opacity 0.25s ease'
        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.style.opacity = '1');

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    function getNomeContatoAtual() {
        const selecionado = document.querySelector('div[aria-selected="true"]');
        if (!selecionado) return null;
        const nomeSpan = selecionado.querySelector('span[title]');
        if (!nomeSpan) return null;
        return nomeSpan.getAttribute('title');
    }

    function getFotoContatoAtual() {
        const selecionado = document.querySelector('div[aria-selected="true"]');
        if (!selecionado) return null;
        const img = selecionado.querySelector('img');
        if (!img) return null;
        return img.src;
    }

    function injectReminderOption(menu) {
        if (!menu) return;
        if (menu.querySelector('[data-reminder="true"]')) return;

        // Encontrar o container dos menuitems dentro do menu
        const itemsContainer = menu.querySelector('[role="menuitem"]')?.parentElement;
        if (!itemsContainer) return;

        const menuItem = document.createElement('div');
        menuItem.setAttribute('aria-label', 'Marcar lembrete');
        menuItem.setAttribute('role', 'menuitem');
        menuItem.setAttribute('tabindex', '-1');
        menuItem.setAttribute('data-reminder', 'true');

        // Copiar classes de um menuitem existente
        const existingItem = menu.querySelector('[role="menuitem"]');
        if (existingItem) menuItem.className = existingItem.className;

        menuItem.innerHTML = `
            <div class="x6s0dn4 xlr9sxt xvvg52n xwd4zgb xq8v1ta x78zum5 xu0aao5 xh8yej3">
                <div class="x6s0dn4 x78zum5 x8lyb6r xl56j7k x14ju556 x1xvr5cs x12w63v0 x1nzty39">
                    <span aria-hidden="true">
                        <svg viewBox="0 0 24 24" height="18" width="18" preserveAspectRatio="xMidYMid meet" fill="currentColor">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
                            <polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
                        </svg>
                    </span>
                </div>
                <div class="x78zum5 xdt5ytf x1iyjqo2 xeuugli x6ikm8r x10wlt62 xde1mab">
                    <span class="x140p0ai x1gufx9m x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x193iq5w xeuugli x13faqbe x1vvkbs x1lliihq x1fj9vlw x14ug900 x87ps6o x1f6kntn xjb2p0i x8r4c90 xo1l8bm x1ic7a3i x12xpedu" style="--x-fontSize: 14px; --x-lineHeight: 9.9531px; --x-8dd7yt: -0.0137em; --x-hxtmnb: 0.0137em;">Marcar lembrete</span>
                </div>
            </div>
        `;

        menuItem.addEventListener('click', () => {

            if (document.querySelector('div[aria-selected="true"]') == null) {
                showToast('Entre na conversa com o cliente para gerar um lembrete');
                return;
            }

            const nomeContato = getNomeContatoAtual();

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                background: 'rgba(0,0,0,0.6)',
                zIndex: '10000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });

            const modal = document.createElement('div');
            Object.assign(modal.style, {
                background: '#111',
                padding: '20px',
                borderRadius: '14px',
                width: '320px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                fontFamily: 'Arial, sans-serif',
                color: '#fff'
            });

            modal.innerHTML = `
                <div style="font-size:16px;font-weight:bold;margin-bottom:6px;">
                    📅 Novo Lembrete
                </div>

                <div style="font-size:24px;color:#22c55e;margin-bottom:10px;">
                    Para: ${nomeContato}
                </div>

                <label style="font-size:12px;color:#aaa;">Data e hora</label>
                <input id="tmData" type="datetime-local" style="
                    width:95%;
                    margin:4px 0 12px 0;
                    background:#000;
                    color:#fff;
                    border:1px solid #333;
                    border-radius:8px;
                    padding:8px;
                ">

                <label style="font-size:12px;color:#aaa;">Motivo</label>
                <textarea id="tmMotivo" placeholder="Digite o motivo..." style="
                    width:95%;
                    height:80px;
                    resize:none;
                    background:#000;
                    color:#fff;
                    border:1px solid #333;
                    border-radius:8px;
                    padding:8px;
                "></textarea>

                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                    <button id="tmCancel" style="
                        background:#333;
                        border:none;
                        color:#fff;
                        padding:8px 12px;
                        border-radius:8px;
                        cursor:pointer;
                    ">Cancelar</button>

                    <button id="tmSave" style="
                        background:#22c55e;
                        border:none;
                        color:#000;
                        padding:8px 14px;
                        border-radius:8px;
                        font-weight:bold;
                        cursor:pointer;
                    ">Salvar</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const dataInputEl = modal.querySelector('#tmData');

            // ✅ CORREÇÃO DO DATE PICKER
            dataInputEl.addEventListener('click', () => {
                if (dataInputEl.showPicker) {
                    dataInputEl.showPicker();
                }
            });

            dataInputEl.focus();

            modal.querySelector('#tmCancel').onclick = () => overlay.remove();

            modal.querySelector('#tmSave').onclick = () => {
                const dataInput = dataInputEl.value;
                const motivo = modal.querySelector('#tmMotivo').value;

                if (!dataInput || !motivo.trim()) return;

                const dt = new Date(dataInput);
                const dataFormatada = dt.toLocaleString('pt-BR');
                const fotoContato = getFotoContatoAtual();

                window.addCliente({
                    nome: nomeContato,
                    data: dataFormatada,
                    motivo: motivo.trim(),
                    foto: fotoContato
                });

                overlay.remove();
            };
        });

        itemsContainer.appendChild(menuItem);
    }

})();
