// ==UserScript==
// @name         Botão de lembrete
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Injeta opção "Marcar lembrete" com Toast grande + datepicker corrigido
// @match        https://web.whatsapp.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    console.log('Iniciando script botao.js versão 1.8...');
    const REMINDER_ATTR = 'data-reminder';
    let lastContextTarget = null;
    let lastContextPoint = { x: 0, y: 0 };
    let scanTimer = null;
    let menuObserver = null;
    let menuObserverTimer = null;

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

    function getElementText(element) {
        if (!element) return '';
        return (element.getAttribute('title') || element.textContent || '').trim();
    }

    function isVisible(element) {
        if (!element || !(element instanceof Element)) return false;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function getNomeContatoAtualFromTarget(target) {
        if (!target || !(target instanceof Element)) return null;

        const selectors = [
            'header span[title]',
            '[data-testid="conversation-info-header-chat-title"] span[title]',
            'span[title]'
        ].join(', ');

        let current = target;
        while (current && current !== document.body) {
            const titleNode = current.matches('span[title]') ? current : current.querySelector(selectors);
            const nome = getElementText(titleNode);
            if (nome) return nome;
            current = current.parentElement;
        }

        return null;
    }

    function getFotoContatoAtualFromTarget(target) {
        if (!target || !(target instanceof Element)) return null;

        let current = target;
        while (current && current !== document.body) {
            const img = current.querySelector('img');
            if (img && img.src) return img.src;
            current = current.parentElement;
        }

        const headerImg = document.querySelector('header img');
        return headerImg ? headerImg.src : null;
    }

    function getContatoAtual() {
        const fromContextTarget = getNomeContatoAtualFromTarget(lastContextTarget);
        if (fromContextTarget) {
            return {
                nome: fromContextTarget,
                foto: getFotoContatoAtualFromTarget(lastContextTarget)
            };
        }

        const selecionado = document.querySelector('div[aria-selected="true"], [role="row"][aria-selected="true"], [role="gridcell"][aria-selected="true"]');
        if (selecionado) {
            const nome = getNomeContatoAtualFromTarget(selecionado);
            if (nome) {
                return {
                    nome,
                    foto: getFotoContatoAtualFromTarget(selecionado)
                };
            }
        }

        const headerNome = getElementText(document.querySelector('header span[title], [data-testid="conversation-info-header-chat-title"] span[title]'));
        if (headerNome) {
            return {
                nome: headerNome,
                foto: getFotoContatoAtualFromTarget(document.querySelector('header') || document.body)
            };
        }

        return null;
    }

    function buildReminderItem(referenceElement) {
        const itemTag = referenceElement && referenceElement.tagName ? referenceElement.tagName.toLowerCase() : 'li';
        const item = document.createElement(itemTag);
        item.setAttribute(REMINDER_ATTR, 'true');
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.style.opacity = '1';

        if (referenceElement && referenceElement.className) {
            item.className = referenceElement.className;
        }

        item.innerHTML = `
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

        item.addEventListener('mousedown', (event) => {
            event.stopPropagation();
        });

        item.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const contato = getContatoAtual();
            if (!contato || !contato.nome) {
                showToast('Entre na conversa com o cliente para gerar um lembrete');
                return;
            }

            openReminderModal(contato);
        });

        item.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                item.click();
            }
        });

        return item;
    }

    function findMenuRoot() {
        const selectors = [
            '[role="menu"]',
            'ul[role="menu"]',
            'ul[role="listbox"]',
            'div[role="menu"]',
            'div[role="application"] ul'
        ];

        const candidates = [];
        for (const selector of selectors) {
            document.querySelectorAll(selector).forEach((element) => {
                if (isVisible(element)) {
                    candidates.push(element);
                }
            });
        }

        if (candidates.length === 0) return null;

        const scored = candidates.map((element) => {
            const rect = element.getBoundingClientRect();
            const itemCount = element.querySelectorAll('li, [role="button"], [tabindex="0"]').length;
            const distanceToPointer = Math.hypot(
                Math.max(0, Math.max(rect.left - lastContextPoint.x, lastContextPoint.x - rect.right)),
                Math.max(0, Math.max(rect.top - lastContextPoint.y, lastContextPoint.y - rect.bottom))
            );

            if (rect.width > 600 || rect.height > 700 || itemCount > 40) {
                return { element, score: -1000 };
            }

            let score = 0;
            if (distanceToPointer < 140) score += 1000;
            if (element.querySelector(`[${REMINDER_ATTR}="true"]`)) score += 500;
            score += Math.min(itemCount, 30);
            score += Math.min(rect.width + rect.height, 200);

            return { element, score };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored[0] ? scored[0].element : null;
    }

    function stopMenuObserver() {
        if (menuObserver) {
            menuObserver.disconnect();
            menuObserver = null;
        }
        if (menuObserverTimer) {
            clearTimeout(menuObserverTimer);
            menuObserverTimer = null;
        }
    }

    function observeMenuUntilFound() {
        if (menuObserver || !document.body) return;

        menuObserver = new MutationObserver(() => {
            if (injectReminderOption()) {
                stopMenuObserver();
            }
        });

        menuObserver.observe(document.body, { childList: true, subtree: true });
        menuObserverTimer = setTimeout(stopMenuObserver, 2000);
    }

    function scheduleMenuInjection() {
        stopMenuObserver();
        if (scanTimer) {
            clearTimeout(scanTimer);
        }

        scanTimer = setTimeout(() => {
            if (!injectReminderOption()) {
                observeMenuUntilFound();
            }
        }, 60);
    }

    function injectReminderOption() {
        const menuContainer = findMenuRoot();
        if (!menuContainer) return false;
        if (menuContainer.querySelector(`[${REMINDER_ATTR}="true"]`)) return true;

        const referenceElement = menuContainer.querySelector('li, [role="button"], [tabindex="0"]');
        const reminderItem = buildReminderItem(referenceElement);

        menuContainer.appendChild(reminderItem);
        return true;
    }

    function openReminderModal(contato) {
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
                Para: ${contato.nome}
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

            window.addCliente({
                nome: contato.nome,
                data: dataFormatada,
                motivo: motivo.trim(),
                foto: contato.foto
            });

            overlay.remove();
        };
    }

    window.addEventListener('contextmenu', (event) => {
        lastContextTarget = event.target instanceof Element ? event.target : null;
        lastContextPoint = { x: event.clientX, y: event.clientY };
        scheduleMenuInjection();
    }, true);
})();
