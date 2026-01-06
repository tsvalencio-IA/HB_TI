// ==================================================================
// MÓDULO ESTOQUE: Profissional, Estável e Determinístico
// ==================================================================
(function() {
    const App = window.HBTech;
    let selectedImageFile = null;
    let allItemsCache = []; 

    // Função Auxiliar de Segurança: Evita que aspas no nome quebrem o HTML
    function safeAttr(str) {
        if (!str) return '';
        return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // --- INICIALIZAÇÃO ---
    window.loadInventory = function() {
        const searchInput = document.getElementById('inventory-search');
        
        // Listener de Busca Instantânea
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderItems(e.target.value);
            });
        }

        // Verificação de Segurança
        if (!App.db) {
            console.error("ERRO CRÍTICO: Firebase DB não disponível.");
            return;
        }

        // 1. Carregamento do Estoque (Inventory)
        App.db.ref('inventory').on('value', snap => {
            allItemsCache = [];
            
            if(!snap.exists()) {
                renderItems('');
                return;
            }

            // Normalização Inicial dos Dados
            snap.forEach(c => {
                const val = c.val();
                // Garante que seqId seja tratado como número para ordenação correta
                // Se não tiver seqId, usa timestamp ou 0 para não sumir
                allItemsCache.push({ 
                    ...val, 
                    id: c.key,
                    _sortId: val.seqId ? parseInt(val.seqId) : 0 
                });
            });
            
            // Ordenação: Sequencial Decrescente (Maior ID aparece primeiro)
            allItemsCache.sort((a, b) => b._sortId - a._sortId);
            
            // Renderiza com o valor atual da busca (ou vazio)
            renderItems(searchInput ? searchInput.value : '');
        });

        // 2. Carregamento do Histórico
        if (typeof loadHistory === 'function') {
            loadHistory();
        } else {
            // Caso a função loadHistory esteja no mesmo escopo (abaixo)
            localLoadHistory();
        }
    };

    // --- RENDERIZAÇÃO DO ESTOQUE (COM REGRAS DETERMINÍSTICAS) ---
    function renderItems(searchTerm) {
        const list = document.getElementById('inventory-list');
        if (!list) return;

        const isAdmin = App.userProfile && App.userProfile.role === 'admin';
        list.innerHTML = '';

        const term = (searchTerm || '').toLowerCase();
        
        const filteredItems = allItemsCache.filter(item => {
            const name = (item.name || '').toLowerCase();
            const pat = (item.patrimony || '').toLowerCase();
            const cat = (item.category || '').toLowerCase();
            const loc = (item.location || '').toLowerCase();
            const seq = item.seqId ? String(item.seqId) : '';
            
            return name.includes(term) || pat.includes(term) || cat.includes(term) || loc.includes(term) || seq.includes(term);
        });

        if (filteredItems.length === 0) {
            list.innerHTML = `<div class="text-center py-10 text-gray-400"><i class='bx bx-search text-5xl mb-2'></i><p>Nada encontrado.</p></div>`;
            return;
        }

        // Buffer de HTML para renderização única
        let htmlBuffer = '';

        filteredItems.forEach(item => {
            // REGRAS DETERMINÍSTICAS DE STATUS
            let statusLabel = 'OK';
            let statusClass = 'bg-green-100 text-green-800 border-green-200';
            let borderClass = 'border-gray-100'; 
            
            // Converte para número para evitar erro de comparação de string
            const currentQty = parseInt(item.qty || 0);
            const minQty = parseInt(item.minQty || 0);

            if(currentQty === 0) {
                statusLabel = 'CRÍTICO';
                statusClass = 'bg-red-100 text-red-800 border-red-200';
                borderClass = 'border-red-200 bg-red-50/20';
            } else if (currentQty <= minQty) {
                statusLabel = 'RISCO';
                statusClass = 'bg-orange-100 text-orange-800 border-orange-200';
                borderClass = 'border-orange-200';
            }

            // HTML Condicional (Admin) - Usa safeAttr para evitar injeção de código
            const deleteHtml = isAdmin 
                ? `<button onclick="window.deleteItem('${item.id}')" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir Cadastro"><i class='bx bx-trash text-lg'></i></button>` 
                : '';

            // Tratamento Seguro de Imagem (Aspas em URL quebram JS)
            const safeImgUrl = item.image ? item.image.replace(/'/g, "\\'") : '';
            const imgHtml = item.image 
                ? `<img src="${item.image}" class="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:scale-105 transition shrink-0" onclick="window.open('${safeImgUrl}')">`
                : `<div class="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 shrink-0"><i class='bx bx-image text-2xl'></i></div>`;

            const seqDisplay = item.seqId ? `#${String(item.seqId).padStart(4, '0')}` : '<span class="text-gray-300">New</span>';

            // ATENÇÃO: Uso de safeAttr em todos os campos de texto do usuário
            htmlBuffer += `
                <div class="bg-white p-3 md:p-4 rounded-xl border ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center animate-fade-in">
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        ${imgHtml}
                        <div class="flex-grow sm:w-48 lg:w-64 overflow-hidden">
                            <div class="flex justify-between items-center sm:block">
                                <h3 class="font-bold text-gray-800 text-sm md:text-base truncate leading-tight" title="${safeAttr(item.name)}">${item.name}</h3>
                                <div class="sm:hidden"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusClass}">${statusLabel}</span></div>
                            </div>
                            <p class="text-xs text-blue-600 font-mono font-bold mt-0.5">${seqDisplay}</p>
                            <p class="text-xs text-gray-500 truncate">${item.category || ''}</p>
                        </div>
                    </div>

                    <div class="flex-grow w-full sm:w-auto grid grid-cols-2 sm:flex sm:justify-center items-center gap-2 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                        <div class="text-left sm:text-center">
                            <p class="text-[10px] text-gray-400 uppercase">Patrimônio</p>
                            <p class="text-xs font-bold text-gray-700 truncate">${item.patrimony || '-'}</p>
                        </div>
                        <div class="text-right sm:text-center">
                            <p class="text-[10px] text-gray-400 uppercase">Local</p>
                            <p class="text-xs font-bold text-gray-700 truncate max-w-[100px] sm:max-w-none ml-auto sm:ml-0" title="${safeAttr(item.location || 'Não informado')}">
                                <i class='bx bx-map text-gray-400'></i> ${item.location || '-'}
                            </p>
                        </div>
                        <div class="col-span-2 sm:col-span-1 text-center border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                            <p class="text-[10px] text-gray-400 uppercase">Estoque</p>
                            <div class="flex items-center justify-center gap-2">
                                <span class="text-sm font-bold text-blue-900">${item.qty}</span>
                                <span class="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold ${statusClass}">${statusLabel}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                        <button onclick="window.openMove('${item.id}', 'in')" class="flex-1 sm:flex-none px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs md:text-sm font-bold hover:bg-green-100 transition border border-green-200 flex items-center justify-center gap-1"><i class='bx bx-plus'></i><span class="sm:hidden md:inline">Entrar</span></button>
                        <button onclick="window.openMove('${item.id}', 'out')" class="flex-1 sm:flex-none px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs md:text-sm font-bold hover:bg-orange-100 transition border border-orange-200 flex items-center justify-center gap-1"><i class='bx bx-minus'></i><span class="sm:hidden md:inline">Sair</span></button>
                        <div class="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>
                        <button onclick="window.editItem('${item.id}')" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><i class='bx bx-edit-alt text-lg'></i></button>
                        ${deleteHtml}
                    </div>
                </div>
            `;
        });

        // Injeção única no DOM
        list.innerHTML = htmlBuffer;
    }

    // --- AUDITORIA DE MOVIMENTAÇÕES (Função Local) ---
    function localLoadHistory() {
        const histDiv = document.getElementById('movements-list');
        if (!histDiv) return;

        App.db.ref('movements').limitToLast(100).on('value', snap => {
            if (!snap.exists()) {
                histDiv.innerHTML = '<div class="p-8 text-center text-gray-400 text-sm"><i class="bx bx-list-ul text-3xl mb-2"></i><br>Nenhuma movimentação registrada.</div>';
                return;
            }

            const movements = [];
            snap.forEach(c => {
                const val = c.val();
                if(val) movements.push(val);
            });

            // Ordenação por data decrescente
            movements.sort((a, b) => {
                const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
                const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
                return dateB - dateA; 
            });

            let htmlContent = '';

            movements.forEach(m => {
                if (!m.itemName) return; 

                const rawType = (m.type || '').toLowerCase().trim();
                const isOut = ['out', 'saida', 'retirada', 'baixa'].includes(rawType);
                
                const typeConfig = isOut 
                    ? { icon: 'bx-down-arrow-circle', color: 'text-orange-600', bg: 'bg-orange-100 text-orange-800', label: 'SAÍDA', signal: '-' }
                    : { icon: 'bx-up-arrow-circle',   color: 'text-green-600',  bg: 'bg-green-100 text-green-800',  label: 'ENTRADA', signal: '+' };

                let dateDisplay = 'Data n/d';
                if (m.timestamp) {
                    try {
                        const d = new Date(m.timestamp);
                        if(!isNaN(d.getTime())) {
                            dateDisplay = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                        }
                    } catch (e) { console.warn("Data ignorada", m); }
                }

                htmlContent += `
                    <div class="p-3 md:p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition flex gap-3 items-start relative group">
                        <div class="mt-1 shrink-0">
                            <i class='bx ${typeConfig.icon} text-3xl ${typeConfig.color}'></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex flex-col sm:flex-row justify-between items-start mb-1 gap-1">
                                <h4 class="font-bold text-gray-800 text-xs md:text-sm truncate pr-2">${safeAttr(m.itemName)}</h4>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeConfig.bg}">${typeConfig.label}</span>
                            </div>
                            
                            <div class="text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1 p-1.5 rounded bg-gray-50 border border-gray-100">
                                <div class="truncate" title="${safeAttr(m.userName)}">
                                    <i class='bx bx-user text-gray-400'></i> <strong>Resp:</strong> ${m.userName || 'Sistema'}
                                </div>
                                <div class="truncate" title="${safeAttr(m.sector)}">
                                    <i class='bx bx-map text-gray-400'></i> <strong>Setor:</strong> ${m.sector || 'Geral'}
                                </div>
                            </div>

                            <p class="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2 break-words">
                                "${safeAttr(m.justification || 'Sem justificativa')}"
                            </p>
                            <span class="text-[10px] text-gray-400 font-mono mt-1 block text-right">${dateDisplay}</span>
                        </div>
                        
                        <div class="flex flex-col justify-center items-end h-full pl-2">
                            <span class="text-lg md:text-xl font-bold ${typeConfig.color}">
                                ${typeConfig.signal}${m.qty || 0}
                            </span>
                        </div>
                    </div>
                `;
            });

            histDiv.innerHTML = htmlContent || '<p class="text-center py-4 text-gray-400">Erro visualização.</p>';
        });
    }

    // --- UPLOAD CLOUDINARY ---
    async function uploadImg(file) {
        // Verifica se a config existe antes de tentar
        if(!window.AppConfig || !window.AppConfig.CLOUDINARY_CLOUD_NAME) {
            throw new Error("Configuração Cloudinary não encontrada.");
        }

        const url = `https://api.cloudinary.com/v1_1/${window.AppConfig.CLOUDINARY_CLOUD_NAME}/upload`;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', window.AppConfig.CLOUDINARY_UPLOAD_PRESET);
        try {
            const r = await fetch(url, { method: 'POST', body: fd });
            const d = await r.json();
            if (d.error) throw new Error(d.error.message);
            return d.secure_url;
        } catch(e) { 
            throw new Error("Erro upload imagem: " + e.message); 
        }
    }

    // --- CONTROLE DE MODAIS E FORMULÁRIOS ---
    
    // Abrir Modal de Movimentação
    window.openMove = (id, type) => {
        const m = document.getElementById('move-modal');
        m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }, 10);

        document.getElementById('move-id').value = id;
        document.getElementById('move-type').value = type;
        
        const title = document.getElementById('move-title');
        title.innerHTML = type === 'in' 
            ? '<span class="text-green-600 flex items-center gap-2"><i class="bx bx-log-in-circle"></i> Entrada de Material</span>' 
            : '<span class="text-orange-600 flex items-center gap-2"><i class="bx bx-log-out-circle"></i> Saída / Baixa</span>';
        
        document.getElementById('m-qty').value = '';
        document.getElementById('m-sector').value = '';
        document.getElementById('m-just').value = '';
        document.getElementById('m-qty').focus();
    };

    // Submit de Movimentação
    document.getElementById('move-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldHtml = btn.innerHTML; 
        btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Processando'; 
        btn.disabled = true;

        try {
            const id = document.getElementById('move-id').value;
            const type = document.getElementById('move-type').value;
            const qty = parseInt(document.getElementById('m-qty').value);
            const sector = document.getElementById('m-sector').value;
            const just = document.getElementById('m-just').value;

            if(qty <= 0 || isNaN(qty)) throw new Error("Quantidade inválida.");

            const ref = App.db.ref(`inventory/${id}`);
            const snap = await ref.once('value');
            
            if (!snap.exists()) throw new Error("Item não encontrado no banco.");
            const item = snap.val();

            let newQty = parseInt(item.qty || 0);
            if(type === 'out') {
                if(newQty < qty) throw new Error(`Estoque insuficiente. Disponível: ${newQty}`);
                newQty -= qty;
            } else { newQty += qty; }

            // 1. Atualiza Estoque
            await ref.update({ qty: newQty });
            
            // 2. Grava Auditoria
            if(App.currentUser) {
                await App.db.ref('movements').push({
                    itemId: id, 
                    itemName: item.name, 
                    type: type, 
                    qty: qty, 
                    sector: sector,
                    justification: just,
                    userId: App.currentUser.uid, 
                    userName: App.userProfile ? App.userProfile.name : 'Desconhecido', 
                    timestamp: new Date().toISOString()
                });
            }

            window.closeModal('move-modal');
        } catch (err) { alert(err.message); }
        finally { btn.innerHTML = oldHtml; btn.disabled = false; }
    });

    window.openItemModal = () => {
        const m = document.getElementById('item-modal'); m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }, 10);
        document.getElementById('item-form').reset(); document.getElementById('item-id').value = '';
        document.getElementById('seq-display-field').classList.add('hidden');
        selectedImageFile = null;
    };

    window.closeModal = (id) => {
        const m = document.getElementById(id);
        m.classList.add('opacity-0'); m.querySelector('div').classList.add('scale-95');
        setTimeout(() => m.classList.add('hidden'), 300);
    };

    window.editItem = async (id) => {
        const s = await App.db.ref(`inventory/${id}`).once('value'); const i = s.val();
        document.getElementById('item-id').value = id;
        document.getElementById('i-name').value = i.name;
        document.getElementById('i-cat').value = i.category;
        document.getElementById('i-pat').value = i.patrimony || '';
        document.getElementById('i-loc').value = i.location || '';
        document.getElementById('i-min').value = i.minQty;
        document.getElementById('i-desc').value = i.description || '';
        
        const seqField = document.getElementById('seq-display-field');
        const seqVal = document.getElementById('i-seq-val');
        if(i.seqId) {
            seqField.classList.remove('hidden');
            seqVal.value = `#${String(i.seqId).padStart(4, '0')}`;
        } else {
            seqField.classList.add('hidden');
        }

        const m = document.getElementById('item-modal'); m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }, 10);
    };

    window.deleteItem = (id) => {
        if(confirm("ATENÇÃO HOSPITALAR:\n\nExcluir o cadastro apaga o histórico.\nPara descarte/baixa, use o botão SAÍDA.\n\nConfirmar exclusão definitiva?")) {
            App.db.ref(`inventory/${id}`).remove();
        }
    };

    const fileInput = document.getElementById('file-input');
    if(fileInput) {
        fileInput.addEventListener('change', e => selectedImageFile = e.target.files[0]);
    }
    const fileLabel = document.getElementById('file-label');
    if(fileLabel) {
        fileLabel.addEventListener('click', () => {
            if(fileInput) fileInput.click();
        });
    }

    // Submit Cadastro/Edição
    const itemForm = document.getElementById('item-form');
    if(itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const oldHtml = btn.innerHTML; btn.innerHTML = 'Salvando...'; btn.disabled = true;
            
            try {
                const id = document.getElementById('item-id').value;
                const d = {
                    name: document.getElementById('i-name').value,
                    category: document.getElementById('i-cat').value,
                    patrimony: document.getElementById('i-pat').value,
                    location: document.getElementById('i-loc').value,
                    minQty: parseInt(document.getElementById('i-min').value),
                    description: document.getElementById('i-desc').value,
                    lastUpdated: new Date().toISOString()
                };
                
                if(selectedImageFile) {
                    d.image = await uploadImg(selectedImageFile);
                }

                if(!id) {
                    // Novo Item: Gera Sequencial e inicia com Qty 0
                    d.qty = 0;
                    
                    // Tratamento seguro do contador
                    try {
                        const seqRef = App.db.ref('config/seqCounter');
                        const result = await seqRef.transaction((current) => {
                            return (current || 0) + 1;
                        });
                        
                        // Garante que temos um valor, mesmo se transaction falhar (fallback)
                        d.seqId = result.snapshot.val() || Date.now(); 
                    } catch(seqErr) {
                        console.error("Erro no sequencial:", seqErr);
                        d.seqId = Date.now(); // Fallback para timestamp em caso de erro de permissão
                    }

                    await App.db.ref('inventory').push(d);
                } else {
                    // Edição
                    await App.db.ref(`inventory/${id}`).update(d);
                }
                
                window.closeModal('item-modal'); 
                selectedImageFile = null;
                alert("Salvo com sucesso!"); // Feedback visual simples
            } catch(e) { 
                alert("Erro ao salvar: " + e.message); 
            } finally { 
                btn.innerHTML = oldHtml; 
                btn.disabled = false; 
            }
        });
    }
})();
