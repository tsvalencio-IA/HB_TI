// ==================================================================
// CORE: Autenticação, Segurança e Gestão de Usuários
// ==================================================================
(function() {
    window.HBTech = {
        db: null, auth: null, currentUser: null, userProfile: null,
        utils: { getRef: (path) => firebase.database().ref(path) }
    };
    const App = window.HBTech;

    function init() {
        if (!firebase.apps.length) firebase.initializeApp(window.AppConfig.firebaseConfig);
        App.db = firebase.database();
        App.auth = firebase.auth();
        setupAuthListener();
        setupLoginUI();
    }

    function setupAuthListener() {
        App.auth.onAuthStateChanged(async (user) => {
            if (user) {
                App.currentUser = user;
                // Busca perfil extendido
                const snap = await App.db.ref(`users/${user.uid}`).once('value');
                
                if (snap.exists()) {
                    const profile = snap.val();
                    App.userProfile = profile;
                    
                    if (profile.status === 'approved') {
                        showAppInterface(profile);
                    } else {
                        showScreen('pending-screen');
                    }
                } else {
                    // Se o usuário existe no Auth mas não no Banco (ex: erro no meio do cadastro)
                    // Não desloga imediatamente para permitir tentativas de correção manual se necessário
                    console.warn("Usuário autenticado sem perfil no banco.");
                }
            } else {
                showScreen('auth-screen');
            }
        });
    }

    async function handleRegister(email, password, name) {
        try {
            // 1. PRIMEIRO: Cria o usuário no Authentication (Garante o Login)
            const userCred = await App.auth.createUserWithEmailAndPassword(email, password);
            const uid = userCred.user.uid;

            // 2. Tenta verificar se é o primeiro usuário (Lógica Blindada)
            let isFirstUser = false;
            try {
                const usersSnap = await App.db.ref('users').limitToFirst(1).once('value');
                isFirstUser = !usersSnap.exists(); // Se não existir nada, é o primeiro
            } catch (ignoredError) {
                // Se der erro de permissão aqui, IGNORA e assume que NÃO é admin.
                // Isso garante que o cadastro prossiga.
                console.log("Verificação de admin pulada por segurança.");
                isFirstUser = false;
            }

            // 3. GRAVA O PERFIL (Isso agora deve funcionar pois o usuário já tem UID)
            await App.db.ref(`users/${uid}`).set({
                name: name,
                email: email,
                role: isFirstUser ? 'admin' : 'tech',
                status: isFirstUser ? 'approved' : 'pending',
                joinedAt: new Date().toISOString()
            });
            
            // Sucesso! O listener onAuthStateChanged vai cuidar do resto.
            
        } catch (error) {
            alert("Erro ao cadastrar: " + error.message);
            // Se o usuário foi criado no Auth mas falhou no banco, tentamos limpar
            if (App.auth.currentUser) {
                App.auth.currentUser.delete().catch(() => {});
            }
        }
    }

    // --- UI Logic ---
    function showScreen(screenId) {
        ['auth-screen', 'pending-screen', 'app-screen'].forEach(id => {
            const el = document.getElementById(id);
            if(id === screenId) {
                el.classList.remove('hidden');
                if(screenId === 'auth-screen') el.classList.add('flex');
            } else {
                el.classList.add('hidden');
                el.classList.remove('flex');
            }
        });
    }

    function showAppInterface(profile) {
        showScreen('app-screen');
        const nameDisplay = document.getElementById('user-name-display');
        if(nameDisplay) nameDisplay.textContent = `${profile.name}`;
        
        // Libera aba Admin se for Admin
        if(profile.role === 'admin') {
            const adminBtn = document.getElementById('nav-admin');
            if(adminBtn) adminBtn.classList.remove('hidden');
            loadAdminPanel();
        }

        if(window.loadInventory) window.loadInventory();
    }

    function setupLoginUI() {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const loginBox = document.getElementById('login-box');
        const regBox = document.getElementById('register-box');

        document.querySelectorAll('.toggle-auth').forEach(btn => btn.addEventListener('click', () => {
            loginBox.classList.toggle('hidden');
            regBox.classList.toggle('hidden');
        }));

        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                const oldHtml = btn.innerHTML; btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";
                
                App.auth.signInWithEmailAndPassword(
                    document.getElementById('l-email').value,
                    document.getElementById('l-pass').value
                ).catch(e => { alert(e.message); btn.innerHTML = oldHtml; });
            });
        }

        if(regForm) {
            regForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button');
                const oldHtml = btn.innerHTML; 
                btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Criando...";
                btn.disabled = true;

                handleRegister(
                    document.getElementById('r-email').value,
                    document.getElementById('r-pass').value,
                    document.getElementById('r-name').value
                ).finally(() => {
                    btn.innerHTML = oldHtml;
                    btn.disabled = false;
                });
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if(logoutBtn) logoutBtn.addEventListener('click', () => App.auth.signOut());
    }

    // --- Painel Admin ---
    function loadAdminPanel() {
        const list = document.getElementById('admin-user-list');
        if(!list) return;

        App.db.ref('users').on('value', snap => {
            list.innerHTML = '';
            if(!snap.exists()) return;

            snap.forEach(u => {
                const user = u.val();
                if(App.currentUser && u.key === App.currentUser.uid) return; 

                const isPending = user.status === 'pending';
                list.innerHTML += `
                    <div class="p-3 md:p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg shrink-0">
                                ${user.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div class="overflow-hidden">
                                <p class="font-bold text-gray-800 text-sm truncate">${user.name || 'Sem Nome'}</p>
                                <p class="text-xs text-gray-500 truncate">${user.email}</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-end gap-2 w-full sm:w-auto">
                            <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${isPending ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}">
                                ${isPending ? 'Pendente' : 'Ativo'}
                            </span>
                            ${isPending 
                                ? `<button onclick="window.updateUserStatus('${u.key}', 'approved')" class="bg-green-100 text-green-600 hover:bg-green-200 p-2 rounded-lg transition" title="Aprovar"><i class='bx bx-check text-xl'></i></button>`
                                : `<button onclick="window.updateUserStatus('${u.key}', 'pending')" class="bg-orange-100 text-orange-600 hover:bg-orange-200 p-2 rounded-lg transition" title="Bloquear"><i class='bx bx-block text-xl'></i></button>`
                            }
                            <button onclick="window.removeUser('${u.key}')" class="bg-red-100 text-red-600 hover:bg-red-200 p-2 rounded-lg transition" title="Remover Usuário"><i class='bx bx-trash text-xl'></i></button>
                        </div>
                    </div>
                `;
            });
        });
    }

    window.updateUserStatus = (uid, status) => App.db.ref(`users/${uid}`).update({ status });
    
    window.removeUser = (uid) => {
        if(confirm("ATENÇÃO GESTOR:\n\nTem certeza que deseja REMOVER este usuário?\nEle perderá o acesso imediatamente.")) {
            App.db.ref(`users/${uid}`).remove();
        }
    };

    document.addEventListener('DOMContentLoaded', init);
})();
