// =====================================================================
// ⚙️ CONFIGURAÇÃO HB-TECH INVENTORY
// =====================================================================
(function() {
    // 1. FIREBASE CONFIG (Pegue no Console do Firebase)
    const firebaseConfig = {
  apiKey: "AIzaSyDVmvA6w5bN_H_tGaC4eSEmdQgHF2H4BAo",
  authDomain: "estoque-hb.firebaseapp.com",
  databaseURL: "https://estoque-hb-default-rtdb.firebaseio.com",
  projectId: "estoque-hb",
  storageBucket: "estoque-hb.firebasestorage.app",
  messagingSenderId: "201495948592",
  appId: "1:201495948592:web:e4bca4aa18411fb3ea6cf5"
    };

    // 2. CLOUDINARY CONFIG (Para imagens)
    const CLOUDINARY_CLOUD_NAME = "djtiaygrs"; 
    const CLOUDINARY_UPLOAD_PRESET = "hb_TI_riopreto"; 

    // 3. GEMINI AI CONFIG
    const API_KEY_PART_1 = "AIzaSyAfx1aiuP9jWzGDoh"; 
    const API_KEY_PART_2 = "E6KxZ6_68wZkt27VI"; 
    
    const API_KEY = API_KEY_PART_1 + API_KEY_PART_2;
    const GEMINI_MODEL = "gemini-2.0-flash"; 

    const HOSPITAL_INFO = {
        nome: "Hospital de Base de Rio Preto",
        setor: "Tecnologia da Informação",
        contexto: "Ambiente crítico hospitalar. Precisão absoluta exigida."
    };

    window.AppConfig = {
        firebaseConfig,
        CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_UPLOAD_PRESET,
        API_KEY,
        GEMINI_MODEL,
        HOSPITAL_INFO
    };
})();
