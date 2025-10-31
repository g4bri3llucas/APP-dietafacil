/**
 * Arquivo: Frontend/scripts/api.js
 * Descrição: Gerencia a comunicação com o backend e a lógica de autenticação no frontend.
 */

// Classe para gerenciar a comunicação com a API (Backend)
class ApiManager {
    // Definindo a URL base da API
    // Utiliza o domínio do backend no Render.
    static API_BASE_URL = "https://app-dietafacil-backend.onrender.com"; 

    /**
     * Tenta registrar um novo usuário no backend.
     * @param {string} email
     * @param {string} password
     * @param {number} monthlyBudget
     * @returns {Promise<object>} Objeto de resposta da API (token e dados do usuário).
     */
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
                // Tenta ler o erro do corpo da resposta para dar uma mensagem amigável
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na API.' }));
                // O servidor Flask envia a chave 'message' para erros
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
    
    // Adicionar métodos de login, perfil, dietas, etc., aqui.
}

// -------------------------------------------------------------
// Funções de Gerenciamento de Autenticação (Local Storage)
// -------------------------------------------------------------

class AuthManager {
    /** Retorna o token de autenticação salvo no Local Storage. */
    static getToken() {
        return localStorage.getItem('authToken');
    }

    /** Salva o token de autenticação e um perfil básico. */
    static setToken(token) {
        localStorage.setItem('authToken', token);
        // Perfil simplificado (pode ser expandido com mais dados da resposta da API)
        localStorage.setItem('userProfile', JSON.stringify({ loggedIn: true })); 
    }

    /** Remove o token e o perfil, deslogando o usuário. */
    static logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
    }

    /** Retorna o perfil do usuário (ou null se não estiver logado). */
    static getProfile() {
        const profile = localStorage.getItem('userProfile');
        return profile ? JSON.parse(profile) : null;
    }

    /** Salva o perfil completo (após login/registro). */
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

    // Use uma função para exibir mensagens em vez de alert(), que é bloqueante
    const showMessage = (message, isError = false) => {
        // Implemente uma lógica de modal ou div de mensagem aqui. 
        // Por enquanto, vou usar alert() para simplicidade de código.
        if (isError) {
            console.error(message);
        } else {
            console.log(message);
        }
        alert(message); // Mantenho o alert temporariamente.
    };

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Coleta os dados do formulário de registro
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        // Pega o valor do orçamento e converte para número
        const monthlyBudget = parseFloat(document.getElementById('monthly-budget').value); 
        
        // Exemplo básico de validação
        if (!email || !password || isNaN(monthlyBudget) || monthlyBudget <= 0) {
            showMessage('Preencha todos os campos de registro corretamente.', true);
            return;
        }

        // Instancia a classe de comunicação com a API
        const api = new ApiManager();
        try {
            // 2. Chama a API para registrar
            const data = await api.register(email, password, monthlyBudget);

            // 3. Sucesso: Salva o token e redireciona
            AuthManager.setToken(data.token);
            
            // Salva dados do usuário (ajustar conforme a API retorna)
            AuthManager.setProfile({ 
                email: email, 
                monthly_budget: monthlyBudget,
                loggedIn: true,
                ...data.user // Inclui outros dados que o backend possa retornar
            });
            
            // Redireciona para o painel (Dashboard)
            window.location.href = 'dashboard.html'; 

        } catch (error) {
            // 4. Falha: Exibe a mensagem de erro da API
            showMessage(`Erro ao cadastrar: ${error.message}`, true);
        }
    });

    // Lógica para o formulário de login (apenas um placeholder)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMessage('Lógica de Login ainda não implementada.', true);
        });
    }
});
