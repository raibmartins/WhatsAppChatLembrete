(function () {
    'use strict';

    console.log('[WhatsLembrete] Loader remoto iniciado');

    const COMPONENTS = [
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/janela.js',
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/botao.js'
    ];

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = () => reject(`Erro ao carregar ${url}`);
            document.head.appendChild(script);
        });
    }

    async function loadComponents() {
        for (const url of COMPONENTS) {
            await loadScript(url);
            console.log('[WhatsLembrete] Componente carregado:');
        }
    }

    loadComponents().catch(console.error);

})();
