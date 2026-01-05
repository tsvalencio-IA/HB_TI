// ==================================================================
// CORE: Autenticação e Segurança
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
                // Busca perfil extendido (role e status)
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
                    App.auth.signOut(); // Segurança extra
                }
            } else {
                showScreen('auth-screen');
            }
        });
    }

    async function handleRegister(email, password, name) {
        try {
            const usersSnap = await App.db.ref('users').once('value');
            const isFirstUser = !usersSnap.exists() || usersSnap.numChildren() === 0;

            const userCred = await App.auth.createUserWithEmailAndPassword(email, password);
            
            // Regra: Primeiro usuário é ADMIN, os outros são TECH (Pendente)
            await App.db.ref(`users/${userCred.user.uid}`).set({
                name: name,
                email: email,
                role: isFirstUser ? 'admin' : 'tech',
                status: isFirstUser ? 'approved' : 'pending',
                joinedAt: new Date().toISOString()
            });

        } catch (error) {
            alert("Erro: " + error.message);
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
            handleRegister(
                document.getElementById('r-email').value,
                document.getElementById('r-pass').value,
                document.getElementById('r-name').value
            );
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
                list.innerHTML += `
                    <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                                ${user.name.charAt(0)}
                            </div>
                            <div>
                                <p class="font-bold text-gray-800 text-sm">${user.name}</p>
                                <p class="text-xs text-gray-500">${user.email}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${isPending ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}">
                                ${isPending ? 'Pendente' : 'Ativo'}
                            </span>
                            ${isPending 
                                ? `<button onclick="window.updateUserStatus('${u.key}', 'approved')" class="text-green-500 hover:bg-green-50 p-2 rounded-lg" title="Aprovar"><i class='bx bx-check text-xl'></i></button>`
                                : `<button onclick="window.updateUserStatus('${u.key}', 'pending')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg" title="Bloquear"><i class='bx bx-block text-xl'></i></button>`
                            }
                        </div>
                    </div>
                `;
            });
        });
    }

    window.updateUserStatus = (uid, status) => App.db.ref(`users/${uid}`).update({ status });

    document.addEventListener('DOMContentLoaded', init);
})();
