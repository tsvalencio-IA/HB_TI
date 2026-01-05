// ==================================================================
// MÓDULO ESTOQUE: CRUD e Movimentações
// ==================================================================
(function() {
    const App = window.HBTech;
    let selectedImageFile = null;

    // --- CARREGAMENTO INICIAL ---
    window.loadInventory = function() {
        const invList = document.getElementById('inventory-list');
        
        App.db.ref('inventory').on('value', snap => {
            invList.innerHTML = '';
            if(!snap.exists()) {
                invList.innerHTML = '<p class="text-gray-500 text-center p-4">Estoque vazio.</p>';
                return;
            }

            snap.forEach(itemSnap => {
                const item = itemSnap.val();
                const id = itemSnap.key;
                
                // Cálculo de status de estoque
                let statusClass = 'bg-green-100 text-green-800';
                if(item.qty == 0) statusClass = 'bg-red-100 text-red-800';
                else if(item.qty <= item.minQty) statusClass = 'bg-yellow-100 text-yellow-800';

                const imgHtml = item.image ? `<img src="${item.image}" class="w-12 h-12 object-cover rounded mr-3 cursor-pointer" onclick="window.openImage('${item.image}')">` : `<div class="w-12 h-12 bg-gray-200 rounded mr-3 flex items-center justify-center"><i class='bx bx-cube'></i></div>`;

                invList.innerHTML += `
                    <div class="bg-white p-4 rounded-lg shadow-sm mb-3 border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div class="flex items-center w-full sm:w-auto mb-3 sm:mb-0">
                            ${imgHtml}
                            <div>
                                <h3 class="font-bold text-gray-800">${item.name}</h3>
                                <p class="text-xs text-gray-500">${item.category} | Patrimônio: ${item.patrimony || 'N/A'}</p>
                                <span class="text-xs px-2 py-0.5 rounded-full font-bold ${statusClass}">Qtd: ${item.qty}</span>
                            </div>
                        </div>
                        <div class="flex gap-2 w-full sm:w-auto justify-end">
                            <button onclick="window.openMoveModal('${id}', 'in')" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"><i class='bx bx-plus'></i> Entr.</button>
                            <button onclick="window.openMoveModal('${id}', 'out')" class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700"><i class='bx bx-minus'></i> Saída</button>
                            <button onclick="window.editItem('${id}')" class="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"><i class='bx bx-edit'></i></button>
                        </div>
                    </div>
                `;
            });
        });

        loadMovementsHistory();
    };

    function loadMovementsHistory() {
        const histList = document.getElementById('movements-list');
        // Carrega últimas 50 movimentações
        App.db.ref('movements').limitToLast(50).on('value', snap => {
            const moves = [];
            snap.forEach(c => moves.push(c.val()));
            moves.reverse(); // Mais recente primeiro

            histList.innerHTML = '';
            moves.forEach(m => {
                const isOut = m.type === 'out';
                histList.innerHTML += `
                    <div class="text-sm border-l-4 ${isOut ? 'border-orange-500' : 'border-green-500'} bg-gray-50 p-3 mb-2 rounded shadow-sm">
                        <div class="flex justify-between font-bold">
                            <span>${m.itemName}</span>
                            <span class="${isOut ? 'text-orange-600' : 'text-green-600'}">${isOut ? '-' : '+'}${m.qty}</span>
                        </div>
                        <p class="text-xs text-gray-600 mt-1"><strong>${m.userName}</strong>: ${m.justification}</p>
                        <p class="text-[10px] text-gray-400 text-right mt-1">${new Date(m.timestamp).toLocaleString()}</p>
                    </div>
                `;
            });
        });
    }

    // --- UPLOAD CLOUDINARY ---
    async function uploadImage(file) {
        const url = `https://api.cloudinary.com/v1_1/${window.AppConfig.CLOUDINARY_CLOUD_NAME}/upload`;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', window.AppConfig.CLOUDINARY_UPLOAD_PRESET);

        try {
            const res = await fetch(url, { method: 'POST', body: fd });
            const data = await res.json();
            return data.secure_url;
        } catch (e) {
            console.error(e);
            throw new Error("Falha no upload da imagem");
        }
    }

    // --- AÇÕES DO USUÁRIO ---
    
    // 1. Adicionar/Editar Item
    window.openItemModal = () => {
        document.getElementById('item-modal').classList.remove('hidden');
        document.getElementById('item-form').reset();
        document.getElementById('item-id').value = '';
    };

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    document.getElementById('file-input').addEventListener('change', (e) => {
        selectedImageFile = e.target.files[0];
    });

    document.getElementById('item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const oldText = btn.innerText;
        btn.innerText = "Salvando...";
        btn.disabled = true;

        try {
            const id = document.getElementById('item-id').value;
            const name = document.getElementById('i-name').value;
            const cat = document.getElementById('i-cat').value;
            const pat = document.getElementById('i-pat').value;
            const min = parseInt(document.getElementById('i-min').value);
            const desc = document.getElementById('i-desc').value;

            let imageUrl = null;
            if(selectedImageFile) {
                imageUrl = await uploadImage(selectedImageFile);
            }

            const itemData = {
                name, category: cat, patrimony: pat, minQty: min, description: desc,
                lastUpdated: new Date().toISOString()
            };
            
            // Se for novo item, inicializa qtd com 0
            if(!id) itemData.qty = 0;
            if(imageUrl) itemData.image = imageUrl;

            if(id) {
                await App.db.ref(`inventory/${id}`).update(itemData);
            } else {
                await App.db.ref('inventory').push(itemData);
            }
            
            window.closeModal('item-modal');
            selectedImageFile = null;
        } catch(err) {
            alert("Erro: " + err.message);
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });

    window.editItem = async (id) => {
        const snap = await App.db.ref(`inventory/${id}`).once('value');
        const item = snap.val();
        document.getElementById('item-id').value = id;
        document.getElementById('i-name').value = item.name;
        document.getElementById('i-cat').value = item.category;
        document.getElementById('i-pat').value = item.patrimony || '';
        document.getElementById('i-min').value = item.minQty;
        document.getElementById('i-desc').value = item.description || '';
        document.getElementById('item-modal').classList.remove('hidden');
    };

    // 2. Movimentação (Entrada/Saída)
    window.openMoveModal = (id, type) => {
        document.getElementById('move-modal').classList.remove('hidden');
        document.getElementById('move-id').value = id;
        document.getElementById('move-type').value = type;
        
        const title = type === 'in' ? 'Entrada de Material' : 'Saída / Uso';
        document.getElementById('move-title').textContent = title;
        document.getElementById('m-qty').focus();
    };

    document.getElementById('move-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('move-id').value;
        const type = document.getElementById('move-type').value;
        const qty = parseInt(document.getElementById('m-qty').value);
        const just = document.getElementById('m-just').value;

        if(qty <= 0) return alert("Quantidade inválida");

        const itemRef = App.db.ref(`inventory/${id}`);
        const snap = await itemRef.once('value');
        const item = snap.val();
        
        let newQty = item.qty || 0;
        
        if(type === 'out') {
            if(newQty < qty) return alert(`Estoque insuficiente! Disponível: ${newQty}`);
            newQty -= qty;
        } else {
            newQty += qty;
        }

        // Atualiza quantidade
        await itemRef.update({ qty: newQty });

        // Registra log
        await App.db.ref('movements').push({
            itemId: id,
            itemName: item.name,
            type: type,
            qty: qty,
            justification: just,
            userId: App.currentUser.uid,
            userName: App.userProfile.name,
            timestamp: new Date().toISOString()
        });

        window.closeModal('move-modal');
        document.getElementById('move-form').reset();
    });

    window.openImage = (url) => window.open(url, '_blank');
})();
