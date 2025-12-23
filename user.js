// ==UserScript==
// @name         Whats Reminder
// @namespace    https://github.com/raibmartins
// @version      1.1.0
// @description  Loader dinâmico do WhatsApp Reminder

// @updateURL    https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/user.js
// @downloadURL  https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/user.js

// @match        https://web.whatsapp.com/*

// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPTS_LIST_URL = 'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/scripts.json';

    function fetchScriptList() {
        return new Promise((resolve, reject) => {
            console.log(`[WhatsReminder] Buscando lista de scripts: ${SCRIPTS_LIST_URL}`);
            GM_xmlhttpRequest({
                method: "GET",
                url: SCRIPTS_LIST_URL + "?t=" + new Date().getTime(),
                onload: function (response) {
                    try {
                        const list = JSON.parse(response.responseText);
                        if (Array.isArray(list)) {
                            resolve(list);
                        } else {
                            reject(new Error("Formato de lista inválido"));
                        }
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function (err) {
                    reject(err);
                }
            });
        });
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            console.log(`[WhatsReminder] Baixando: ${url}`);
            GM_xmlhttpRequest({
                method: "GET",
                url: url + "?t=" + new Date().getTime(),
                onload: function (response) {
                    try {
                        const blob = new Blob([response.responseText], { type: 'text/javascript' });
                        const blobUrl = URL.createObjectURL(blob);
                        const script = document.createElement('script');
                        script.src = blobUrl;
                        script.onload = () => {
                            URL.revokeObjectURL(blobUrl);
                            console.log(`[WhatsReminder] Carregado com sucesso: ${url}`);
                            resolve();
                        };
                        script.onerror = (err) => {
                            console.error(`[WhatsReminder] Erro ao carregar script via Blob ${url}:`, err);
                            reject(err);
                        };
                        document.head.appendChild(script);
                    } catch (e) {
                        console.error(`[WhatsReminder] Erro ao processar script ${url}:`, e);
                        reject(e);
                    }
                },
                onerror: function (err) {
                    console.error(`[WhatsReminder] Erro de rede ao baixar ${url}:`, err);
                    reject(err);
                }
            });
        });
    }

    async function init() {
        try {
            const scripts = await fetchScriptList();
            for (const url of scripts) {
                try {
                    await loadScript(url);
                } catch (e) {
                    console.error(`[WhatsReminder] Falha ao carregar script individual ${url}:`, e);
                }
            }
        } catch (e) {
            console.error(`[WhatsReminder] Falha crítica ao buscar lista de scripts:`, e);
        }
        console.log('[WhatsReminder] Processo de carregamento finalizado');
    }

    init();
})();
