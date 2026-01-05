// ==================================================================
// MÓDULO CORE: Autenticação e Gestão de Usuários
// ==================================================================
(function() {
    window.HBTech = {
        db: null, auth: null, currentUser: null, userProfile: null,
        utils: {
            formatDate: d => new Date(d).toLocaleString('pt-BR'),
            getRef: (path) => firebase.database().ref(path)
        }
    };

    const App = window.HBTech;

    function init() {
        if (!firebase.apps.length) firebase.initializeApp(window.AppConfig.firebaseConfig);
        App.db = firebase.database();
        App.auth = firebase.auth();
        setupAuthListener();
        setupLoginUI();
    }

    // --- AUTENTICAÇÃO ---
    function setupAuthListener() {
        App.auth.onAuthStateChanged(async (user) => {
            if (user) {
                App.currentUser = user;
                const profileRef = App.db.ref(`users/${user.uid}`);
                const snap = await profileRef.once('value');
                
                if (snap.exists()) {
                    const profile = snap.val();
                    App.userProfile = profile;
                    
                    if (profile.status === 'approved') {
                        showAppInterface(profile);
                    } else {
                        showPendingScreen();
                    }
                } else {
                    // Se não existe perfil, é o primeiro login após criar conta?
                    // O perfil é criado no registro, então isso é raro.
                    App.auth.signOut();
                }
            } else {
                showLoginScreen();
            }
        });
    }

    // --- LÓGICA DE REGISTRO INTELIGENTE ---
    async function handleRegister(email, password, name) {
        try {
            // 1. Verifica se já existem usuários no sistema
            const usersSnap = await App.db.ref('users').once('value');
            const isFirstUser = !usersSnap.exists() || usersSnap.numChildren() === 0;

            // 2. Cria o usuário no Auth
            const userCred = await App.auth.createUserWithEmailAndPassword(email, password);
            const uid = userCred.user.uid;

            // 3. Define o papel (Primeiro = ADMIN, Resto = TECH pendente)
            const role = isFirstUser ? 'admin' : 'tech';
            const status = isFirstUser ? 'approved' : 'pending';

            // 4. Salva no Realtime Database
            await App.db.ref(`users/${uid}`).set({
                name: name,
                email: email,
                role: role,
                status: status,
                joinedAt: new Date().toISOString()
            });

            if(!isFirstUser) {
                alert("Cadastro realizado! Aguarde a liberação do Administrador.");
            }

        } catch (error) {
            alert("Erro no cadastro: " + error.message);
        }
    }

    // --- UI HELPERS ---
    function showLoginScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('pending-screen').classList.add('hidden');
    }

    function showPendingScreen() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('pending-screen').classList.remove('hidden');
    }

    function showAppInterface(profile) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('pending-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        
        document.getElementById('user-name-display').textContent = `${profile.name} (${profile.role === 'admin' ? 'Gestor' : 'Técnico'})`;
        
        // Se for admin, mostra aba de gestão
        if(profile.role === 'admin') {
            document.getElementById('nav-admin').classList.remove('hidden');
            loadAdminPanel();
        }

        // Carrega o estoque
        if(window.loadInventory) window.loadInventory();
    }

    function setupLoginUI() {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const toggleBtns = document.querySelectorAll('.toggle-auth');

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('l-email').value;
            const pass = document.getElementById('l-pass').value;
            App.auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
        });

        regForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('r-name').value;
            const email = document.getElementById('r-email').value;
            const pass = document.getElementById('r-pass').value;
            handleRegister(email, pass, name);
        });

        toggleBtns.forEach(btn => btn.addEventListener('click', () => {
            loginForm.parentElement.classList.toggle('hidden');
            regForm.parentElement.classList.toggle('hidden');
        }));

        document.getElementById('logout-btn').addEventListener('click', () => App.auth.signOut());
    }

    // --- FUNÇÕES DE ADMINISTRAÇÃO ---
    function loadAdminPanel() {
        const list = document.getElementById('admin-user-list');
        App.db.ref('users').on('value', snap => {
            list.innerHTML = '';
            snap.forEach(u => {
                const user = u.val();
                const uid = u.key;
                const isMe = uid === App.currentUser.uid;
                
                if(isMe) return; // Não mostra o próprio admin

                const statusColor = user.status === 'approved' ? 'text-green-600' : 'text-orange-600';
                const actionBtn = user.status === 'pending' 
                    ? `<button onclick="window.approveUser('${uid}')" class="bg-green-500 text-white px-2 py-1 rounded text-xs">Aprovar</button>`
                    : `<button onclick="window.blockUser('${uid}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs">Bloquear</button>`;

                list.innerHTML += `
                    <div class="flex justify-between items-center p-3 border-b">
                        <div>
                            <p class="font-bold">${user.name}</p>
                            <p class="text-xs text-gray-500">${user.email}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-bold ${statusColor} mb-1">${user.status === 'approved' ? 'Ativo' : 'Pendente'}</p>
                            ${actionBtn}
                        </div>
                    </div>
                `;
            });
        });
    }

    // Exporta funções globais para o HTML usar
    window.approveUser = (uid) => App.db.ref(`users/${uid}`).update({ status: 'approved' });
    window.blockUser = (uid) => App.db.ref(`users/${uid}`).update({ status: 'pending' });

    document.addEventListener('DOMContentLoaded', init);
})();
