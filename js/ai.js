// ==================================================================
// IA: Relatórios Executivos TI (Corrigido e Completo)
// ==================================================================
(function() {
    const App = window.HBTech;

    window.callAI = async () => {
        const btn = document.getElementById('ask-ai-btn');
        const output = document.getElementById('ai-response');
        
        const oldHtml = btn.innerHTML;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Analisando Banco de Dados...";
        btn.disabled = true;
        output.classList.add('hidden');
        output.innerHTML = '';

        try {
            // 1. Busca dados frescos do banco
            const snap = await App.db.ref('inventory').once('value');
            
            if (!snap.exists()) throw new Error("Estoque vazio. Não há dados para analisar.");

            let dataStr = "";
            snap.forEach(c => {
                const i = c.val();
                const seq = i.seqId ? `#${String(i.seqId).padStart(4, '0')}` : 'N/A';
                // Agora enviamos LOCALIZAÇÃO e ID para a IA
                dataStr += `- [${seq}] ${i.name} | Local: ${i.location || 'Não def.'} | Qtd: ${i.qty} (Min: ${i.minQty})\n`;
            });

            // 2. Prompt Especializado Hospitalar
            const prompt = `
            ATUE COMO: Gestor Sênior de TI do Hospital de Base de Rio Preto.
            TAREFA: Analisar o inventário abaixo e recomendar ações de compra e organização.
            
            DADOS DO INVENTÁRIO ATUAL:
            ${dataStr}
            
            REGRAS DE RESPOSTA:
            1. Identifique itens Críticos (Qtd <= Min).
            2. Sugira compras agrupadas por Categoria.
            3. Verifique se há itens sem Localização definida e alerte.
            4. Use linguagem técnica e direta. Formato HTML simples (<b>, <ul>, <li>).
            `;

            // 3. Chamada API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${window.AppConfig.GEMINI_MODEL}:generateContent?key=${window.AppConfig.API_KEY}`;
            
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if(!res.ok) throw new Error("Falha na conexão com Gemini AI");

            const json = await res.json();
            
            if(!json.candidates || !json.candidates[0].content) {
                throw new Error("A IA não retornou conteúdo.");
            }

            const text = json.candidates[0].content.parts[0].text
                .replace(/```html/g, '').replace(/```/g, ''); 

            output.innerHTML = text;
            output.classList.remove('hidden');

        } catch (e) {
            output.innerHTML = `<p class="text-red-500 font-bold">Erro na IA: ${e.message}</p>`;
            output.classList.remove('hidden');
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    };
})();