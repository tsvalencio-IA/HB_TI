// ==================================================================
// IA: Relatórios Executivos TI (Gemini 2.0 Flash Exp)
// ==================================================================
(function() {
    const App = window.HBTech;

    window.callAI = async () => {
        const btn = document.getElementById('ask-ai-btn');
        const output = document.getElementById('ai-response');
        
        const oldHtml = btn.innerHTML;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Processando com Gemini 2.0...";
        btn.disabled = true;
        output.classList.add('hidden');
        output.innerHTML = '';

        try {
            const snap = await App.db.ref('inventory').once('value');
            if (!snap.exists()) throw new Error("Estoque vazio.");

            let dataStr = "";
            snap.forEach(c => {
                const i = c.val();
                const seq = i.seqId ? `#${String(i.seqId).padStart(4, '0')}` : 'N/A';
                dataStr += `ID: ${seq} | Item: ${i.name} | Local: ${i.location || 'N/A'} | Qtd: ${i.qty} (Mín: ${i.minQty})\n`;
            });

            const prompt = `
            Você é o Gestor de TI do Hospital de Base.
            Analise o estoque abaixo e gere um relatório técnico curto e direto em HTML.
            
            ESTOQUE ATUAL:
            ${dataStr}
            
            REGRAS:
            - Liste itens CRÍTICOS (Qtd <= Mínimo) em negrito.
            - Sugira reposição imediata se necessário.
            - Verifique itens sem local definido.
            - Use tags HTML simples: <b>, <ul>, <li>, <br>.
            `;

            // URL PARA O MODELO 2.0 FLASH EXPERIMENTAL
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${window.AppConfig.GEMINI_MODEL}:generateContent?key=${window.AppConfig.API_KEY}`;
            
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if(!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || res.statusText);
            }

            const json = await res.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

            if(!text) throw new Error("A IA não retornou texto.");

            const cleanText = text.replace(/```html/g, '').replace(/```/g, '');

            output.innerHTML = cleanText;
            output.classList.remove('hidden');

        } catch (e) {
            output.innerHTML = `<div class="bg-red-50 text-red-600 p-3 rounded text-sm"><strong>Erro na IA:</strong> ${e.message}</div>`;
            output.classList.remove('hidden');
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    };
})();