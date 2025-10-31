// A URL base agora é APENAS o domínio do backend (sem /api)
const API_BASE_URL = 'https://api-dietafacil.onrender.com';

class DietAPI {
    // A URL construída será: https://api-dietafacil.onrender.com/api/register (CORRETO)
    static async register(userData) {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        return await response.json();
    }
    
    // A URL construída será: https://api-dietafacil.onrender.com/api/login (CORRETO)
    static async login(credentials) {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });
        return await response.json();
    }
    
    // A URL construída será: https://api-dietafacil.onrender.com/api/calculate-diet (CORRETO)
    static async calculateDiet(profileData) {
        const token = AuthManager.getToken();
        const response = await fetch(`${API_BASE_URL}/api/calculate-diet`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        return await response.json();
    }
    
    // A URL construída será: https://api-dietafacil.onrender.com/api/food-search (CORRETO)
    static async getFoodSearch(query) {
        const response = await fetch(`${API_BASE_URL}/api/food-search?q=${encodeURIComponent(query)}`);
        return await response.json();
    }
    
    // A URL construída será: https://api-dietafacil.onrender.com/api/user/budget (CORRETO)
    static async updateBudget(budget) {
        const token = AuthManager.getToken();
        const response = await fetch(`${API_BASE_URL}/api/user/budget`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ monthly_budget: budget })
        });
        return await response.json();
    }
    
    // A URL construída será: https://api-dietafacil.onrender.com/api/user/diet-plans (CORRETO)
    static async getDietPlans() {
        const token = AuthManager.getToken();
        const response = await fetch(`${API_BASE_URL}/api/user/diet-plans`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return await response.json();
    }
    
    // A URL construída será: https://api-dietafacil.onrender.com/api/health (CORRETO)
    static async healthCheck() {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return await response.json();
    }
}

class AuthManager {
    static isLoggedIn() {
        return localStorage.getItem('authToken') !== null;
    }
    
    static getToken() {
        return localStorage.getItem('authToken');
    }
    
    static setToken(token) {
        localStorage.setItem('authToken', token);
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
        
alocalStorage.setItem('userProfile', JSON.stringify(profile));
    }
}
