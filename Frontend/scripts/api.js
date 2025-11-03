// Arquivo: Frontend/scripts/api.js
// Descrição: Centraliza todas as chamadas de comunicação com o Backend (simulado).

// **DEFINIÇÃO CRÍTICA DA URL DO BACKEND**
// Esta é a sua URL do backend no Render.
const API_BASE_URL = 'https://app-dietafacil-backend.onrender.com'; 

class DietAPI {
    constructor(baseURL) {
        this.baseURL = baseURL;
        console.log(`DietAPI initialized with base URL: ${this.baseURL}`);
    }

    /**
     * Retorna os cabeçalhos padrão para requisições JSON, incluindo o token de autenticação.
     */
    getHeaders() {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Método genérico para fazer requisições à API e tratar erros.
     */
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: method,
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : null,
        };

        let response;
        try {
            response = await fetch(url, config);
        } catch (error) {
            console.error('Erro de Rede/CORS (fetch falhou):', error);
            throw new Error(`Falha na comunicação com o servidor. Verifique o CORS ou a URL: ${error.message}`);
        }
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
            throw new Error(errorData.message || `Erro do servidor: ${response.status}`);
        }

        try {
            return await response.json();
        } catch {
            return { message: 'Operação bem-sucedida, sem conteúdo de retorno.' };
        }
    }

    // --- Métodos de Autenticação ---
    async login(email, password) {
        const data = { email, password };
        // Rota corrigida: O Backend espera /api/login, não /auth/login
        return this.request('/api/login', 'POST', data);
    }

    async register(email, password, monthlyBudget) {
        const data = { 
            email, 
            password, 
            monthly_budget: parseFloat(monthlyBudget)
        };
        // Rota corrigida: O Backend espera /api/register, não /auth/register
        return this.request('/api/register', 'POST', data);
    }
    
    // --- Métodos de Comida e Plano ---

    async getFoods() {
        // Assumindo que o backend usa /api/food-list ou similar, e não /food/list
        // Por favor, verifique a rota correta no backend.
        // Vou usar /api/foods, que é um padrão comum. Se o seu for diferente, ajuste-o.
        return this.request('/api/foods'); 
    }

    async addFood(name, calories, protein, carb, fat) {
        const data = { 
            name, 
            calories: parseInt(calories),
            protein: parseFloat(protein),
            carb: parseFloat(carb),
            fat: parseFloat(fat)
        };
        // Assumindo que o backend usa /api/food/add ou similar, e não /food/add
        // Por favor, verifique a rota correta no backend.
        return this.request('/api/food/add', 'POST', data); 
    }

    // ... (Mantenha o método calculateDiet)
    async calculateDiet(profileData) {
        const systemPrompt = `Você é um nutricionista virtual e um assistente de planejamento financeiro. Seu objetivo é criar um plano de dieta semanal (7 dias) realista, saudável e detalhado, que estritamente respeite o orçamento mensal do usuário...`;

        const userQuery = `Gere um plano de dieta para o seguinte perfil:\n` + JSON.stringify(profileData, null, 2);

        const apiKey = "" 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                     type: "OBJECT",
                     properties: {
                         "daily_calories": { "type": "NUMBER" },
                         "total_proteins": { "type": "NUMBER" },
                         "total_carbs": { "type": "NUMBER" },
                         "total_fat": { "type": "NUMBER" },
                         "total_daily_cost": { "type": "NUMBER" },
                         "meals": {
                             "type": "ARRAY",
                             "items": {
                                 "type": "OBJECT",
                                 "properties": {
                                     "name": { "type": "STRING" },
                                     "calories": { "type": "NUMBER" },
                                     "foods": {
                                         "type": "ARRAY",
                                         "items": {
                                             "type": "OBJECT",
                                             "properties": {
                                                 "name": { "type": "STRING" },
                                                 "portion": { "type": "STRING" }
                                             },
                                             "propertyOrdering": ["name", "portion"]
                                         }
                                     }
                                 },
                                 "propertyOrdering": ["name", "calories", "foods"]
                             }
                         }
                     },
                     "propertyOrdering": ["daily_calories", "total_proteins", "total_carbs", "total_fat", "total_daily_cost", "meals"]
                 }
            }
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!jsonText) {
                throw new Error("A resposta da IA não contém um plano de dieta válido.");
            }

            const dietPlan = JSON.parse(jsonText);
            return { diet_plan: dietPlan, message: "Dieta gerada com sucesso!" };

        } catch (error) {
            console.error("Erro no cálculo da dieta (Gemini API):", error);
            throw new Error(`Falha ao gerar o plano de dieta. Detalhes: ${error.message}`);
        }
    }
}

// Inicializa a instância da API usando a URL correta e a expõe
const dietAPI = new DietAPI(API_BASE_URL);
window.DietAPI = dietAPI;
