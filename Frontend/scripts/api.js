/**
 * Arquivo: Frontend/scripts/api.js
 * Descrição: Contém a classe principal para comunicação com o backend (DietAPI).
 * Responsabilidade: Fazer requisições HTTP e tratar respostas/erros de rede (apenas).
 */

// Classe para gerenciar a comunicação com a API (Backend)
class DietAPI {
    // Definindo a URL base da API
    // Certifique-se de que esta URL está correta.
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
            const response = await fetch(`${DietAPI.API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, monthly_budget: monthlyBudget })
            });

            if (!response.ok) {
                // Tenta ler o erro do corpo da resposta para dar uma mensagem amigável
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na API.' }));
                throw new Error(errorData.message || 'Falha ao registrar.');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Erro de registro:', error);
            throw new Error(`Erro de rede ou servidor: ${error.message}`);
        }
    }
    
    /**
     * Tenta logar um usuário existente no backend.
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>} Objeto de resposta da API (token e dados do usuário).
     */
    async login(email, password) {
         try {
            const response = await fetch(`${DietAPI.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido na API.' }));
                throw new Error(errorData.message || 'Falha ao logar. Verifique suas credenciais.');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Erro de login:', error);
            throw new Error(`Erro de rede ou servidor: ${error.message}`);
        }
    }
    
    // Adicionar outros métodos para perfil, dietas, etc., aqui.
}

// -------------------------------------------------------------
// EXPORTAÇÃO GLOBAL (CRÍTICO PARA OUTROS SCRIPTS)
// -------------------------------------------------------------
// Cria uma instância da API e a anexa à janela (window) para que auth.js possa acessá-la.
window.DietAPI = new DietAPI();
