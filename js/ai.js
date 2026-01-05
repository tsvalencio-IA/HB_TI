// ==================================================================
// IA: Relatórios Executivos TI
// ==================================================================
(function() {
    const App = window.HBTech;

    window.callAI = async () => {
        const btn = document.getElementById('ask-ai-btn');
        const output = document.getElementById('ai-response');
        
        const oldHtml = btn.innerHTML;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Processando dados hospitalares...";
        btn.disabled = true;
        output.classList.add('hidden');

        try {
            const snap = await App.db.ref('inventory').once('value');
            let dataStr = "";
            snap.forEach(c => {
                const i = c.val();
                dataStr += `- ${i.name} (Cat: ${i.category}, Qtd: ${i.qty}, Mín: ${i.minQty})\n`;
            });

            const prompt = `
            CONTEXTO: Você é o Gestor Sênior de TI do Hospital de Base de Rio Preto.
            OBJETIVO: Gerar um relatório executivo de compras e manutenção.
            DADOS DO ESTOQUE:
            ${dataStr}
            
            DIRETRIZES:
            1. Priorize itens com Qtd <= Mínimo (Urgência Alta).
            2. Identifique categorias com excesso ou falta crítica.
            3. Use linguagem formal hospitalar.
            4. Formate a resposta em HTML simples (h3, ul, strong).
            `;

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${window.AppConfig.GEMINI_MODEL}:generateContent?key=${window.AppConfig.API_KEY}`;
            
            const res = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const json = await res.json();
            const text = json.candidates[0].content.parts[0].text
                .replace(/```html/g, '').replace(/```/g, ''); // Limpa markdown

            output.innerHTML = text;
            output.classList.remove('hidden');

        } catch (e) {
            alert("Erro na IA: " + e.message);
        } finally {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    };
})();
