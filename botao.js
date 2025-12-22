// ==UserScript==
// @name         Botão de lembrete
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Injeta opção "Marcar lembrete" com Toast grande + datepicker corrigido
// @match        https://web.whatsapp.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    window.addEventListener('contextmenu', () => {
        setTimeout(injectReminderOption, 80);
    }, true);

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

    function injectReminderOption() {
        const menuContainer = document.querySelector('div[role="application"] ul > div');
        if (!menuContainer) return;
        if (menuContainer.querySelector('[data-reminder="true"]')) return;

        const wrapper = document.createElement('div');

        const li = document.createElement('li');
        li.setAttribute('tabindex', '0');
        li.setAttribute('role', 'button');
        li.setAttribute('data-reminder', 'true');
        li.className = '_aj-r _aj-q _aj-_ _asi6 _ap51 false';
        li.style.opacity = '1';

        li.innerHTML = `
            <div class="x1c4vz4f xs83m0k xdl72j9 x1g77sc7 x78zum5 xozqiw3 x1oa3qoh x12fk4p8 x2lwn1j x1nhvcw1 x1q0g3np x6s0dn4 x1ypdohk x5w4yej x1vqgdyp xh8yej3">
                <div class="x1c4vz4f xs83m0k xdl72j9 x1g77sc7 x78zum5 xozqiw3 x1oa3qoh x12fk4p8 x2lwn1j xl56j7k x1q0g3np x1cy8zhl xt4ypqs x13fj5qh x1sa5p1d">
                    <span aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #8696a0;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </span>
                </div>
                <span class="x1o2sk6j x6prxxf x6ikm8r x10wlt62 xlyipyv xuxw1ft xpwdb9g">
                    Marcar lembrete
                </span>
            </div>
        `;

        li.addEventListener('click', () => {

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

        wrapper.appendChild(li);
        menuContainer.appendChild(wrapper);
    }

})();
