// ==================================================================
// MÓDULO ESTOQUE: Lógica de Negócio e Auditoria
// ==================================================================
(function() {
    const App = window.HBTech;
    let selectedImageFile = null;

    window.loadInventory = function() {
        const list = document.getElementById('inventory-list');
        const isAdmin = App.userProfile.role === 'admin';

        App.db.ref('inventory').on('value', snap => {
            list.innerHTML = '';
            if(!snap.exists()) {
                list.innerHTML = `<div class="text-center py-10 text-gray-400"><i class='bx bx-box text-5xl mb-2'></i><p>Estoque vazio.</p></div>`;
                return;
            }

            snap.forEach(c => {
                const item = c.val();
                const id = c.key;
                
                // Lógica de Status (Badges)
                let statusBadge = '<span class="px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700">OK</span>';
                let borderClass = 'border-gray-100';
                
                if(item.qty == 0) {
                    statusBadge = '<span class="px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">ZERADO</span>';
                    borderClass = 'border-red-200 bg-red-50/50';
                } else if (item.qty <= item.minQty) {
                    statusBadge = '<span class="px-2 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-700">BAIXO</span>';
                    borderClass = 'border-orange-200';
                }

                // Renderização condicional do botão de Delete
                const deleteHtml = isAdmin 
                    ? `<button onclick="window.deleteItem('${id}')" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Excluir Cadastro"><i class='bx bx-trash text-lg'></i></button>` 
                    : '';

                const imgHtml = item.image 
                    ? `<img src="${item.image}" class="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:scale-105 transition" onclick="window.open('${item.image}')">`
                    : `<div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200"><i class='bx bx-image text-2xl'></i></div>`;

                list.innerHTML += `
                    <div class="bg-white p-4 rounded-xl border ${borderClass} shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center">
                        ${imgHtml}
                        <div class="flex-grow">
                            <div class="flex justify-between items-start">
                                <h3 class="font-bold text-gray-800 text-lg">${item.name}</h3>
                                ${statusBadge}
                            </div>
                            <p class="text-sm text-gray-500 mb-1">${item.category} • Pat: <strong class="text-gray-700">${item.patrimony || 'S/N'}</strong></p>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Mín: ${item.minQty}</span>
                                <span class="text-sm font-bold text-blue-900">Estoque Atual: ${item.qty}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-end">
                            <button onclick="window.openMove('${id}', 'in')" class="flex-1 md:flex-none px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition border border-green-200"><i class='bx bx-plus'></i> Entrar</button>
                            <button onclick="window.openMove('${id}', 'out')" class="flex-1 md:flex-none px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-100 transition border border-orange-200"><i class='bx bx-minus'></i> Sair</button>
                            <div class="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>
                            <button onclick="window.editItem('${id}')" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><i class='bx bx-edit-alt text-lg'></i></button>
                            ${deleteHtml}
                        </div>
                    </div>
                `;
            });
        });
        loadHistory();
    };

    function loadHistory() {
        const histDiv = document.getElementById('movements-list');
        App.db.ref('movements').limitToLast(50).on('value', snap => {
            const arr = [];
            snap.forEach(c => arr.push(c.val()));
            arr.reverse();

            histDiv.innerHTML = '';
            if(arr.length === 0) {
                histDiv.innerHTML = '<p class="text-center py-8 text-gray-400 italic">Nenhum registro de auditoria.</p>';
                return;
            }

            arr.forEach(m => {
                const isOut = m.type === 'out';
                const icon = isOut ? 'bx-down-arrow-circle text-orange-500' : 'bx-up-arrow-circle text-green-500';
                const bg = isOut ? 'bg-orange-50' : 'bg-green-50';

                histDiv.innerHTML += `
                    <div class="p-4 hover:bg-gray-50 transition flex gap-4 items-start">
                        <div class="mt-1"><i class='bx ${icon} text-3xl'></i></div>
                        <div class="flex-grow">
                            <div class="flex justify-between items-start">
                                <h4 class="font-bold text-gray-800 text-sm">${m.itemName}</h4>
                                <span class="text-xs text-gray-400 font-mono">${new Date(m.timestamp).toLocaleString('pt-BR')}</span>
                            </div>
                            <div class="text-xs text-gray-600 mt-1 grid grid-cols-2 gap-2">
                                <div><span class="font-bold">Responsável:</span> ${m.userName}</div>
                                <div><span class="font-bold">Setor:</span> ${m.sector || 'N/A'}</div>
                            </div>
                            <p class="text-xs text-gray-500 mt-1 italic border-l-2 border-gray-200 pl-2">"${m.justification}"</p>
                        </div>
                        <div class="text-right">
                            <span class="block text-lg font-bold ${isOut ? 'text-orange-600' : 'text-green-600'}">${isOut ? '-' : '+'}${m.qty}</span>
                            <span class="text-[10px] uppercase font-bold text-gray-400">${isOut ? 'Saída' : 'Entrada'}</span>
                        </div>
                    </div>
                `;
            });
        });
    }

    // --- UPLOAD ---
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
        // Reset classes para garantir transição
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
                itemId: id, itemName: item.name, type, qty, sector, justification: just,
                userId: App.currentUser.uid, userName: App.userProfile.name, timestamp: new Date().toISOString()
            });

            window.closeModal('move-modal');
        } catch (err) { alert(err.message); }
        finally { btn.innerHTML = oldHtml; btn.disabled = false; }
    });

    // --- Item CRUD (Similar logic, condensed for brevity but full function) ---
    window.openItemModal = () => {
        const m = document.getElementById('item-modal'); m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }, 10);
        document.getElementById('item-form').reset(); document.getElementById('item-id').value = '';
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
        document.getElementById('i-min').value = i.minQty;
        document.getElementById('i-desc').value = i.description || '';
        const m = document.getElementById('item-modal'); m.classList.remove('hidden');
        setTimeout(() => { m.classList.remove('opacity-0'); m.querySelector('div').classList.remove('scale-95'); }, 10);
    };

    window.deleteItem = (id) => {
        if(confirm("ATENÇÃO HOSPITALAR:\n\nExcluir o cadastro apaga o histórico de rastreabilidade.\nPara descarte, use SAÍDA.\n\nConfirmar exclusão?")) {
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
                minQty: parseInt(document.getElementById('i-min').value),
                description: document.getElementById('i-desc').value,
                lastUpdated: new Date().toISOString()
            };
            if(!id) d.qty = 0;
            if(selectedImageFile) d.image = await uploadImg(selectedImageFile);

            if(id) await App.db.ref(`inventory/${id}`).update(d);
            else await App.db.ref('inventory').push(d);
            window.closeModal('item-modal'); selectedImageFile = null;
        } catch(e) { alert(e.message); } finally { btn.innerHTML = oldHtml; btn.disabled = false; }
    });
})();
