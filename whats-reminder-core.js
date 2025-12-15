(function () {
    'use strict';

    const scripts = [
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/botao.js',
        'https://raw.githubusercontent.com/raibmartins/WhatsAppChatLembrete/main/janela.js'
    ];

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                onload: function (response) {
                    try {
                        const script = document.createElement('script');
                        script.textContent = response.responseText;
                        document.head.appendChild(script);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    (async function () {
        for (const url of scripts) {
            await loadScript(url);
        }
        console.log('Scripts carregados dinamicamente');
    })();
})();
