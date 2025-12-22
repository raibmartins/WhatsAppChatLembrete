(function () {
    'use strict';

    const scripts = [
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/resize2/janela.js',
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/resize2/botao.js'
    ];

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
        for (const url of scripts) {
            try {
                await loadScript(url);
            } catch (e) {
                console.error(`[WhatsReminder] Falha crítica ao carregar ${url}. Interrompendo.`);
                break;
            }
        }
        console.log('[WhatsReminder] Processo de carregamento finalizado');
    }

    init();
})();
