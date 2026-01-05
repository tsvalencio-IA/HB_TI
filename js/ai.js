// ==================================================================
// MÓDULO IA: Integração Gemini 1.5
// ==================================================================
(function() {
    const App = window.HBTech;
    
    window.callAI = async () => {
        const btn = document.getElementById('ask-ai-btn');
        const output = document.getElementById('ai-response');
        
        btn.disabled = true;
        btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Analisando Estoque...";
        output.innerHTML = "";
        output.classList.remove('hidden');

        try {
            // 1. Coleta dados do estoque atual
            const snap = await App.db.ref('inventory').once('value');
            let stockData = "LISTA DE ESTOQUE ATUAL:\n";
            let criticalItems = [];

            snap.forEach(c => {
                const i = c.val();
                stockData += `- ${i.name} (Qtd: ${i.qty}, Mínimo Ideal: ${i.minQty})\n`;
                if(i.qty <= i.minQty) criticalItems.push(i.name);
            });

            // 2. Monta o Prompt Especializado
            const prompt = `
                Você é o Gestor de TI Sênior do ${window.AppConfig.HOSPITAL_INFO.nome}.
                Sua missão é garantir que nunca faltem equipamentos para salvar vidas.
                
                Analise os dados abaixo e gere um relatório técnico:
                1. Liste itens críticos (abaixo do mínimo) com urgência de compra.
                2. Sugira ações para a equipe técnica baseadas no estado atual.
                3. Use linguagem formal, técnica e direta.
                
                ${stockData}
            `;

            // 3. Chama a API do Gemini
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${window.AppConfig.GEMINI_MODEL}:generateContent?key=${window.AppConfig.API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;

            // 4. Formata a resposta (Markdown simples para HTML)
            output.innerHTML = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

        } catch (error) {
            output.innerHTML = `<span class="text-red-500">Erro na IA: ${error.message}</span>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = "<i class='bx bxs-brain'></i> Gerar Relatório Gerencial";
        }
    };
})();
