(function () {
    'use strict';

    const scripts = [
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/resize2/janela.js',
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/resize2/botao.js'
    ];

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            console.log(`[WhatsReminder] Baixando: ${url}`);
            fetch(url + "?t=" + new Date().getTime())
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.text();
                })
                .then(responseText => {
                    try {
                        const blob = new Blob([responseText], { type: 'text/javascript' });
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
                })
                .catch(err => {
                    console.error(`[WhatsReminder] Erro de rede ao baixar ${url}:`, err);
                    reject(err);
                });
        });
    }

    async function init() {
        for (const url of scripts) {
            try {
                await loadScript(url);
            } catch (e) {
                console.error(`[WhatsReminder] Falha crítica ao carregar ${url}. Interrompendo.`);
                console.error(e);
                break;
            }
        }
        console.log('[WhatsReminder] Processo de carregamento finalizado');
    }

    init();
})();
