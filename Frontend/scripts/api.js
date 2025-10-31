// Classe para gerenciar a comunicação com a API (Backend)
class ApiManager {
    // Definindo a URL base da API
    // Para produção no Render, é o próprio domínio do Backend seguido de /api
    // const API_BASE_URL = "http://127.0.0.1:5000/api"; // Linha original para testes locais
    static API_BASE_URL = "https://app-dietafacil-backend.onrender.com"; 

    // Métodos de autenticação
    async register(email, password, monthlyBudget) {
        try {
            const response = await fetch(`${ApiManager.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, monthly_budget: monthlyBudget })
            });

            if (!response.ok) {
                // Tenta ler o erro do corpo da resposta, se disponível
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na API.' }));
                throw new Error(errorData.message || 'Falha ao registrar.');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Erro de registro:', error);
            // Propagar o erro para ser capturado no handler do formulário
            throw new Error(`Erro de rede ou servidor: ${error.message}`);
        }
    }

    // (O restante do código da classe ApiManager)
    // ...
}

// -------------------------------------------------------------
// Funções de Gerenciamento de Autenticação (já existentes)
// -------------------------------------------------------------

class AuthManager {
    static getToken() {
        return localStorage.getItem('authToken');
    }

    static setToken(token) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('userProfile', '{"loggedIn": true}'); // Perfil simplificado
    }

    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
    }

    static getProfile() {
        const profile = localStorage.getItem('userProfile');
        return profile ? JSON.parse(profile) : null;
    }

    static setProfile(profile) {
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }
}

// -------------------------------------------------------------
// Lógica de manipulação de Formulário
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('register-form');
    
    // Verifica se o formulário existe (garantia de que estamos na página correta)
    if (!registrationForm) return;

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Coleta os dados do formulário de registro
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        // Pega o valor do orçamento e converte para número
        const monthlyBudget = parseFloat(document.getElementById('monthly-budget').value); 
        
        // Exemplo básico de validação
        if (!email || !password || isNaN(monthlyBudget) || monthlyBudget <= 0) {
            alert('Preencha todos os campos de registro corretamente.');
            return;
        }

        const api = new ApiManager();
        try {
            // 2. Chama a API para registrar
            const data = await api.register(email, password, monthlyBudget);

            // 3. Sucesso: Salva o token e redireciona (ou atualiza a UI)
            AuthManager.setToken(data.token);
            AuthManager.setProfile({ 
                email: email, 
                monthly_budget: monthlyBudget,
                loggedIn: true
            });
            
            // Redireciona para o painel (Dashboard)
            window.location.href = 'dashboard.html'; 

        } catch (error) {
            // 4. Falha: Exibe a mensagem de erro da API
            // A mensagem de erro agora inclui o erro de rede/servidor para melhor depuração
            alert(`Erro ao cadastrar: ${error.message}`);
        }
    });

    // Lógica para o formulário de login (opcional, mas bom ter)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // ... (implementar lógica de login similar ao registro)
            alert('Lógica de Login ainda não implementada.');
        });
    }
});
