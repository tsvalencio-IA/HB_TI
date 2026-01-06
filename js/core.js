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
                    // Se o usuário foi deletado do banco mas existe no Auth, desloga
                    // Isso evita loops se o admin apagar o usuário manualmente
                    if (user.metadata.creationTime === user.metadata.lastSignInTime) {
                        // É um usuário novo acabou de ser criado, não desloga, aguarda o registro completar
                    } else {
                        App.auth.signOut();
                        showScreen('auth-screen');
                    }
                }
            } else {
                showScreen('auth-screen');
            }
        });
    }

    async function handleRegister(email, password, name) {
        try {
            // CORREÇÃO: Cria o usuário no Authentication PRIMEIRO.
            // Isso garante que ele tenha um UID e esteja logado antes de tentar ler/escrever no banco.
            const userCred = await App.auth.createUserWithEmailAndPassword(email, password);
            
            // Variável de controle para definir se é admin
            let isFirstUser = false;

            try {
                // Agora que está logado, tenta verificar se o banco está vazio
                const usersSnap = await App.db.ref('users').once('value');
                isFirstUser = !usersSnap.exists() || usersSnap.numChildren() === 0;
            } catch (permError) {
                // Se der erro de permissão ao ler a lista (regras de segurança restritas),
                // assume que NÃO é o primeiro usuário (segurança por padrão)
                console.warn("Permissão de leitura da lista negada na criação. Definindo como Tech.", permError);
                isFirstUser = false;
            }
            
            // Grava o perfil no Realtime Database usando o UID gerado
            await App.db.ref(`users/${userCred.user.uid}`).set({
                name: name,
                email: email,
                role: isFirstUser ? 'admin' : 'tech',
                status: isFirstUser ? 'approved' : 'pending',
                joinedAt: new Date().toISOString()
            });
            
            // O listener authStateChanged vai pegar a mudança e redirecionar
            
        } catch (error) {
            alert("Erro no cadastro: " + error.message);
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
        document.getElementById('user-name-display').textContent = `${profile.name}`;
        
        // Libera aba Admin se for Admin
        if(profile.role === 'admin') {
            document.getElementById('nav-admin').classList.remove('hidden');
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

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const oldHtml = btn.innerHTML; btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i>";
            
            App.auth.signInWithEmailAndPassword(
                document.getElementById('l-email').value,
                document.getElementById('l-pass').value
            ).catch(e => { alert(e.message); btn.innerHTML = oldHtml; });
        });

        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Feedback visual no botão de cadastro
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

        document.getElementById('logout-btn').addEventListener('click', () => App.auth.signOut());
    }

    // --- Painel Admin ---
    function loadAdminPanel() {
        const list = document.getElementById('admin-user-list');
        App.db.ref('users').on('value', snap => {
            list.innerHTML = '';
            snap.forEach(u => {
                const user = u.val();
                if(u.key === App.currentUser.uid) return; // Não mostra a si mesmo

                const isPending = user.status === 'pending';
                // Layout responsivo para lista de usuários
                list.innerHTML += `
                    <div class="p-3 md:p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg shrink-0">
                                ${user.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="overflow-hidden">
                                <p class="font-bold text-gray-800 text-sm truncate">${user.name}</p>
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
