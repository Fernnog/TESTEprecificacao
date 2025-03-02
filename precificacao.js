--- START OF FILE precificacao.js ---
// ==== INÍCIO SEÇÃO - IMPORTS FIREBASE SDKS ====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// ==== FIM SEÇÃO - IMPORTS FIREBASE SDKS ====

// ==== INÍCIO SEÇÃO - CONFIGURAÇÃO FIREBASE ====
const firebaseConfig = {
    apiKey: "AIzaSyAydkMsxydduoAFD9pdtg_KIFuckA_PIkE",
    authDomain: "precificacao-64b06.firebaseapp.com",
    databaseURL: "https://precificacao-64b06-default-rtdb.firebaseio.com",
    projectId: "precificacao-64b06",
    storageBucket: "precificacao-64b06.firebasestorage.app",
    messagingSenderId: "872035099760",
    appId: "1:872035099760:web:1c1c7d2ef0f442b366c0b5",
    measurementId: "G-6THHCNMHD6"
};
// ==== FIM SEÇÃO - CONFIGURAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - INICIALIZAÇÃO FIREBASE ====
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
// ==== FIM SEÇÃO - INICIALIZAÇÃO FIREBASE ====

// ==== INÍCIO SEÇÃO - VARIÁVEIS GLOBAIS ====
let materiais = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
let custosIndiretosPredefinidosBase = [
    { descricao: "Energia elétrica", valorMensal: 0 },
    { descricao: "Água", valorMensal: 0 },
    { descricao: "Gás", valorMensal: 0 },
    { descricao: "Aluguel do espaço", valorMensal: 0 },
    { descricao: "Depreciação de máquinas e equipamentos", valorMensal: 0 },
    { descricao: "Manutenção predial e de equipamentos", valorMensal: 0 },
    { descricao: "Despesas com segurança", valorMensal: 0 },
    { descricao: "Limpeza e conservação", valorMensal: 0 },
    { descricao: "Material de escritório", valorMensal: 0 },
    { descricao: "Impostos e taxas indiretos", valorMensal: 0 },
    { descricao: "Marketing institucional", valorMensal: 0 },
    { descricao: "Transporte e logística", valorMensal: 0 },
    { descricao: "Despesas com utilidades", valorMensal: 0 },
    { descricao: "Demais custos administrativos", valorMensal: 0 }
];
let custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase));
let custosIndiretosAdicionais = [];
let produtos = [];
let modoEdicaoMaoDeObra = false;
let itemEdicaoCustoIndireto = null;
let novoCustoIndiretoCounter = 0;
let taxaCredito = { percentual: 5, incluir: false };
let margemLucroPadrao = 50;
let precificacoesGeradas = [];
let proximoNumeroPrecificacao; // Inicializada em carregarDados()
let produtoEmEdicao = null;
let usuarioLogado = null;
let materialEmEdicao = null;
// ==== FIM SEÇÃO - VARIÁVEIS GLOBAIS ====

// ==== INÍCIO SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE ====
// (Nenhuma mudança necessária aqui)
async function registrarUsuario(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Registro bem-sucedido. Usuário logado.';
        document.getElementById('auth-message').style.color = 'green';
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        document.getElementById('auth-message').textContent = 'Erro ao registrar usuário: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

async function loginUsuario(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('auth-message').textContent = 'Login bem-sucedido.';
        document.getElementById('auth-message').style.color = 'green';
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        document.getElementById('auth-message').textContent = 'Erro ao fazer login: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

async function logoutUsuario() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        alert('Erro ao fazer logout.');
    }
}

async function enviarEmailRedefinicaoSenha(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        document.getElementById('auth-message').textContent = 'Email de redefinição de senha enviado.';
        document.getElementById('auth-message').style.color = 'blue';
    } catch (error) {
        console.error("Erro ao enviar email de redefinição de senha:", error);
        document.getElementById('auth-message').textContent = 'Erro ao enviar email de redefinição de senha: ' + error.message;
        document.getElementById('auth-message').style.color = 'red';
    }
}

function atualizarInterfaceUsuario(user) {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const userInfoDisplay = document.getElementById('user-info');
    const authMessageDisplay = document.getElementById('auth-message');

    if (user) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        userInfoDisplay.textContent = 'Usuário logado: ' + user.email;
        usuarioLogado = user;
        carregarDados();  // Carrega os dados ao logar
    } else {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
        userInfoDisplay.textContent = '';
        authMessageDisplay.textContent = 'Nenhum usuário autenticado';
        authMessageDisplay.style.color = '#555';
        usuarioLogado = null;
    }
+}
+// ==== FIM SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE ====

+// ==== INÍCIO SEÇÃO - FUNÇÕES GERAIS DA PÁGINA ====
+// (Nenhuma mudança necessária aqui)
+function mostrarSubMenu(submenuId) {
+    const conteudos = ['materiais-insumos', 'mao-de-obra', 'custos-indiretos', 'produtos-cadastrados', 'calculo-precificacao', 'precificacoes-geradas'];
+    conteudos.forEach(id => document.getElementById(id).style.display = 'none');
+    document.getElementById(submenuId).style.display = 'block';
+}
+
+function formatarMoeda(valor) {
+    if (typeof valor !== 'number') return 'R$ 0,00';
+    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
+}
+
+function limparFormulario(formId) {
+    const form = document.getElementById(formId);
+    if (form) form.reset();
 }
 // ==== FIM SEÇÃO - FUNÇÕES DE AUTENTICAÇÃO FIREBASE ====
 
@@ -1122,6 +1122,9 @@
             const viewButton = document.createElement('button');
             viewButton.textContent = 'Visualizar';
             viewButton.onclick = () => abrirPrecificacaoEmNovaJanela(precificacao.id);
+            const removeButton = document.createElement('button');
+            removeButton.textContent = 'Excluir';
+            removeButton.onclick = () => removerPrecificacao(precificacao.id);
             actionsCell.appendChild(viewButton);
         });
 
@@ -1149,6 +1152,9 @@
         const viewButton = document.createElement('button');
         viewButton.textContent = 'Visualizar';
         viewButton.onclick = () => abrirPrecificacaoEmNovaJanela(precificacao.id);
+        const removeButton = document.createElement('button');
+        removeButton.textContent = 'Excluir';
+        removeButton.onclick = () => removerPrecificacao(precificacao.id);
         actionsCell.appendChild(viewButton);
     });
 }
@@ -1266,6 +1272,23 @@
     } else {
         alert("Seu navegador pode ter bloqueado a abertura de uma nova janela. Permita pop-ups para este site.");
     }
+}
+
+async function removerPrecificacao(precificacaoId) {
+    if (confirm('Tem certeza que deseja excluir esta precificação? Esta ação não pode ser desfeita.')) {
+        try {
+            await deleteDoc(doc(db, "precificacoes-geradas", precificacaoId));
+            precificacoesGeradas = precificacoesGeradas.filter(p => p.id !== precificacaoId);
+            atualizarTabelaPrecificacoesGeradas();
+            alert('Precificação excluída com sucesso!');
+        } catch (error) {
+            console.error("Erro ao excluir precificação:", error);
+            alert('Erro ao excluir precificação. Tente novamente.');
+        }
+    }
+}
+
+
 }
 // ==== FIM SEÇÃO - FUNÇÕES PRECIFICAÇÕES GERADAS ====
 