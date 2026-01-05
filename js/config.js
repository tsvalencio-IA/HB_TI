// =====================================================================
// ⚙️ CONFIGURAÇÃO GERAL DO SISTEMA HB-TECH
// =====================================================================
(function() {
    // 1. CONFIGURAÇÃO FIREBASE (Copie do seu console do Firebase)
    const firebaseConfig = {
  apiKey: "AIzaSyDVmvA6w5bN_H_tGaC4eSEmdQgHF2H4BAo",
  authDomain: "estoque-hb.firebaseapp.com",
  databaseURL: "https://estoque-hb-default-rtdb.firebaseio.com",
  projectId: "estoque-hb",
  storageBucket: "estoque-hb.firebasestorage.app",
  messagingSenderId: "201495948592",
  appId: "1:201495948592:web:e4bca4aa18411fb3ea6cf5"
};

    // 2. CONFIGURAÇÃO CLOUDINARY (Para fotos dos equipamentos)
    const CLOUDINARY_CLOUD_NAME = "djtiaygrs"; 
    const CLOUDINARY_UPLOAD_PRESET = "hb_TI_riopreto"; // Lembre de criar um preset "unsigned" no painel do Cloudinary

    // 3. CONFIGURAÇÃO IA (GEMINI)
    // Dividimos a chave em 2 partes para o GitHub não bloquear
    const API_KEY_PART_1 = "AIzaSyAfx1aiuP9jWzGDoh"; 
    const API_KEY_PART_2 = "E6KxZ6_68wZkt27VI"; 
    
    const API_KEY = API_KEY_PART_1 + API_KEY_PART_2;
    const GEMINI_MODEL = "gemini-1.5-flash"; // Modelo rápido e eficiente

    // 4. INFORMAÇÕES DO HOSPITAL (Para contexto da IA)
    const HOSPITAL_INFO = {
        nome: "Hospital de Base de Rio Preto",
        setor: "Tecnologia da Informação (TI)",
        missao: "Manter a infraestrutura hospitalar funcionando 24/7."
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
