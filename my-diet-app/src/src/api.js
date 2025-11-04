/**
 * Módulo de Serviço da API para interagir com o backend Flask.
 * * Centraliza todas as chamadas de rede para facilitar a manutenção
 * e a troca do endpoint, se necessário.
 */

// URL base do seu servidor Flask.
// Adapte esta URL se o seu servidor estiver em um endereço diferente.
const BASE_URL = 'http://localhost:5000/api';

/**
 * Função utilitária para lidar com a resposta do fetch.
 * Lança um erro se a resposta não for HTTP 2xx.
 * @param {Response} response - O objeto de resposta do fetch.
 * @returns {Promise<any>} O corpo da resposta JSON.
 */
const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    // Se a API retornar um erro (ex: 401 Unauthorized), 
    // ele deve ser lançado aqui para ser capturado no try-catch.
    throw new Error(data.message || `Erro de API: ${response.status} ${response.statusText}`);
  }
  return data;
};

/**
 * Envia uma requisição de Login para o backend.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<object>} O objeto de resposta da API (espera-se um token e dados do usuário).
 */
export const loginUser = async (email, password) => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  return handleResponse(response);
};

/**
 * Envia uma requisição de Registro (Criação de Conta) para o backend.
 * @param {string} email - O email do novo usuário.
 * @param {string} password - A senha do novo usuário.
 * @returns {Promise<object>} O objeto de resposta da API.
 */
export const registerUser = async (email, password) => {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(response);
};

// Futuras funções de API (ex: `fetchUserData`, `postFinanceRecord`, etc.)
// serão adicionadas aqui.
