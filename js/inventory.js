// ==================================================================
// MÓDULO ESTOQUE: Sequencial, Busca e Auditoria (FIXED)
// ==================================================================
(function() {
    const App = window.HBTech;
    let selectedImageFile = null;
    let allItemsCache = []; 

    window.loadInventory = function() {
        const searchInput = document.getElementById('inventory-search');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderItems(e.target.value);
            });
        }

        App.db.ref('inventory').on('value', snap => {
            allItemsCache = [];
            if(!snap.exists()) {
                renderItems('');
                return;
            }
            snap.forEach(c => allItemsCache.push({ ...c.val(), id: c.key }));
            allItemsCache.sort((a, b) => (b.seqId || 0) - (a.seqId || 0));
            renderItems(searchInput ? searchInput.value : '');
        });

        // Carrega o histórico imediatamente
        loadHistory();
    };

    function renderItems(searchTerm) {
        const list = document.getElementById('inventory-list');
        const isAdmin = App.userProfile.role === 'admin';
        list.innerHTML = '';

        const term = searchTerm.toLowerCase();
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

        filteredItems.forEach(item => {
            let statusBadge = '<span class="px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700">OK</span>';
            let borderClass = 'border-gray-100';
            
            if(item.qty == 0) {
                statusBadge = '<span class="px-2 py-1 rounded-md text-[10px] font-bold bg-red-100 text-red-700">ZERADO</span>';
                borderClass = 'border-red-200 bg-red-50/30';
            } else if (item.qty <= item.minQty) {
                statusBadge = '<span class="px-2 py-1 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700">BAIXO</span>';
                borderClass = 'border-orange-200';
            }

            const deleteHtml = isAdmin 
                ? `<button onclick="window.deleteItem('${item.id}')" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><i class='bx bx-trash text-lg'></i></button>` 
                : '';

            const imgHtml = item.image 
                ? `<img src="${item.image}" class="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:scale-105 transition shrink-0" onclick="window.open('${item.image}')">`
                : `<div class="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 shrink-0"><i class='bx bx-image text-2xl'></i></div>`;

            const seqDisplay = item.seqId ? `#${String(item.seqId).padStart(4, '0')}` : '---';

            list.innerHTML += `
                <div class="bg-white p-3 md:p-4 rounded-xl border ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        ${imgHtml}
                        <div class="flex-grow sm:w-48 lg:w-64 overflow-hidden">
                            <div class="flex justify-between items-center sm:block">
                                <h3 class="font-bold text-gray-800 text-sm md:text-base truncate leading-tight">${item.name}</h3>
                                <div class="sm:hidden">${statusBadge}</div>
                            </div>
                            <p class="text-xs text-blue-600 font-mono font-bold mt-0.5">${seqDisplay}</p>
                            <p class="text-xs text-gray-500 truncate">${item.category}</p>
                        </div>
                    </div>

                    <div class="flex-grow w-full sm:w-auto grid grid-cols-2 sm:flex sm:justify-center items-center gap-2 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                        <div class="text-left sm:text-center">
                            <p class="text-[10px] text-gray-400 uppercase">Patrimônio</p>
                            <p class="text-xs font-bold text-gray-700 truncate">${item.patrimony || '-'}</p>
                        </div>
                        <div class="text-right sm:text-center">
                            <p class="text-[10px] text-gray-400 uppercase">Local</p>
                            <p class="text-xs font-bold text-gray-700 truncate max-w-[100px] sm:max-w-none ml-auto sm:ml-0" title="${item.location || ''}">
                                <i class='bx bx-map text-gray-400'></i> ${item.location || '-'}
                            </p>
                        </div>
                        <div class="col-span-2 sm:col-span-1 text-center border-t sm:border-t-0 pt-2 sm:pt-0 mt-1 sm:mt-0">
                            <p class="text-[10px] text-gray-400 uppercase">Estoque</p>
                            <div class="flex items-center justify-center gap-2">
                                <span class="text-sm font-bold text-blue-900">${item.qty}</span>
                                <span class="hidden sm:inline-block">${statusBadge}</span>
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
    }

    function loadHistory() {
        const histDiv = document.getElementById('movements-list');
        App.db.ref('movements').limitToLast(100).on('value', snap => {
            const arr = [];
            snap.forEach(c => arr.push(c.val()));
            arr.reverse(); 

            histDiv.innerHTML = '';
            if(arr.length === 0) {
                histDiv.innerHTML = '<p class="text-center py-8 text-gray-400 italic text-sm">Nenhum registro de auditoria.</p>';
                return;
            }

            arr.forEach(m => {
                // VERIFICAÇÃO ROBUSTA DE TIPO
                const isOut = (m.type === 'out' || m.type === 'saida');
                
                const icon = isOut ? 'bx-down-arrow-circle text-orange-600' : 'bx-up-arrow-circle text-green-600';
                const typeText = isOut ? 'SAÍDA / BAIXA' : 'ENTRADA / REPOSIÇÃO';
                const typeBg = isOut ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
                const qtyClass = isOut ? 'text-orange-600' : 'text-green-600';
                const signal = isOut ? '-' : '+';
                
                histDiv.innerHTML += `
                    <div class="p-3 md:p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition flex gap-3 items-start last:border-0 relative">
                        <div class="mt-1 shrink-0">
                            <i class='bx ${icon} text-3xl'></i>
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex flex-col sm:flex-row justify-between items-start mb-1 gap-1">
                                <h4 class="font-bold text-gray-800 text-xs md:text-sm truncate pr-2">${m.itemName}</h4>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeBg}">${typeText}</span>
                            </div>
                            
                            <div class="text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1 p-1.5 rounded bg-gray-50 border border-gray-100">
                                <div class="truncate"><i class='bx bx-user text-gray-400'></i> <strong>Resp:</strong> ${m.userName}</div>
                                <div class="truncate"><i class='bx bx-map text-gray-400'></i> <strong>Destino:</strong> ${m.sector || 'N/A'}</div>
                            </div>

                            <p class="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2 break-words">
                                "${m.justification}"
                            </p>
                            <span class="text-[10px] text-gray-400 font-mono mt-1 block text-right">${new Date(m.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        
                        <div class="flex flex-col justify-center items-end h-full pl-2">
                            <span class="text-lg md:text-xl font-bold ${qtyClass}">
                                ${signal}${m.qty}
                            </span>
                        </div>
                    </div>
                `;
            });
        });
    }

    async function uploadImg(file) {
        const url = `https://api.cloudinary.com/v1_1/${window.AppConfig.CLOUDINARY_CLOUD_NAME}/upload`;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', window.AppConfig.CLOUDINARY_UPLOAD_PRESET);
        try {
            const r = await fetch(url, { method: 'POST', body: fd });
            const d = await r.json();
            return d.secure_url;
        } catch { throw new Error("Erro upload imagem"); }
    }

    // --- ACTIONS ---
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

    document.getElementById('move-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldHtml = btn.innerHTML; btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>'; btn.disabled = true;

        try {
            const id = document.getElementById('move-id').value;
            const type = document.getElementById('move-type').value;
            const qty = parseInt(document.getElementById('m-qty').value);
            const sector = document.getElementById('m-sector').value;
            const just = document.getElementById('m-just').value;

            const ref = App.db.ref(`inventory/${id}`);
            const snap = await ref.once('value');
            const item = snap.val();

            let newQty = item.qty || 0;
            if(type === 'out') {
                if(newQty < qty) throw new Error(`Estoque insuficiente. Disp: ${newQty}`);
                newQty -= qty;
            } else { newQty += qty; }

            await ref.update({ qty: newQty });
            
            await App.db.ref('movements').push({
                itemId: id, 
                itemName: item.name, 
                type: type, // 'in' ou 'out'
                qty: qty, 
                sector: sector,
                justification: just,
                userId: App.currentUser.uid, 
                userName: App.userProfile.name, 
                timestamp: new Date().toISOString()
            });

            window.closeModal('move-modal');
        } catch (err) { alert(err.message); }
        finally { btn.innerHTML = oldHtml; btn.disabled = false; }
    });

    window.openItemModal = () => {
        const m = document.getElementById('item-modal'); m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }, 10);
        document.getElementById('item-form').reset(); document.getElementById('item-id').value = '';
        document.getElementById('seq-display-field').classList.add('hidden');
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
        if(confirm("ATENÇÃO HOSPITALAR:\n\nExcluir o cadastro apaga o histórico.\nPara descarte, use SAÍDA.\n\nConfirmar exclusão?")) {
            App.db.ref(`inventory/${id}`).remove();
        }
    };

    document.getElementById('file-input').addEventListener('change', e => selectedImageFile = e.target.files[0]);
    document.getElementById('file-label').addEventListener('click', () => document.getElementById('file-input').click());

    document.getElementById('item-form').addEventListener('submit', async (e) => {
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
            
            if(selectedImageFile) d.image = await uploadImg(selectedImageFile);

            if(!id) {
                d.qty = 0;
                const seqRef = App.db.ref('config/seqCounter');
                const result = await seqRef.transaction((current) => {
                    return (current || 0) + 1;
                });
                d.seqId = result.snapshot.val();
                await App.db.ref('inventory').push(d);
            } else {
                await App.db.ref(`inventory/${id}`).update(d);
            }
            
            window.closeModal('item-modal'); selectedImageFile = null;
        } catch(e) { alert(e.message); } finally { btn.innerHTML = oldHtml; btn.disabled = false; }
    });
})();