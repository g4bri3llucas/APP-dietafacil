/**
 * Arquivo: Frontend/scripts/api.js
 * Descrição: Centraliza todas as chamadas de comunicação com o Backend (simulado).
 * Define a classe DietAPI e a expõe globalmente.
 */

class DietAPI {
    constructor(baseUrl) {
        // Assume-se que a URL do backend está definida na variável global __backend_url
        // Se __backend_url não existir, usa um placeholder que deve ser alterado em produção.
        this.baseUrl = baseUrl || typeof __backend_url !== 'undefined' ? __backend_url : 'http://localhost:3000/api';
        console.log(`DietAPI initialized with base URL: ${this.baseUrl}`);
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
     * Tenta fazer login.
     * @param {object} data - Objeto contendo { email, password }.
     * @returns {Promise<object>} O token e dados do usuário, ou uma mensagem de erro.
     */
    async login(data) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });
            return response.json();
        } catch (error) {
            throw new Error(`Falha na requisição de login: ${error.message}`);
        }
    }

    /**
     * Tenta fazer registro de um novo usuário.
     * @param {object} data - Objeto contendo { email, password, monthly_budget }.
     * @returns {Promise<object>} O token e dados do usuário, ou uma mensagem de erro.
     */
    async register(data) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data),
            });
            // O backend deve retornar um JSON com token ou erro.
            return response.json();
        } catch (error) {
            throw new Error(`Falha na requisição de registro: ${error.message}`);
        }
    }

    /**
     * Calcula e retorna um plano de dieta.
     * @param {object} profileData - Dados do perfil do usuário para cálculo.
     * @returns {Promise<object>} O plano de dieta gerado.
     */
    async calculateDiet(profileData) {
        // Esta função usa o LLM API (gemini) para gerar o plano de dieta.
        const systemPrompt = `Você é um nutricionista virtual e um assistente de planejamento financeiro.
        Seu objetivo é criar um plano de dieta semanal (7 dias) realista, saudável e detalhado, 
        que estritamente respeite o orçamento mensal do usuário. 
        A dieta deve ser baseada nos dados do perfil fornecidos.
        
        O plano deve ser estruturado em JSON com o seguinte schema:
        
        type: OBJECT
        properties: {
          daily_calories: { type: NUMBER, description: "Total de calorias diárias recomendado." },
          total_proteins: { type: NUMBER, description: "Total de Proteínas diárias em gramas." },
          total_carbs: { type: NUMBER, description: "Total de Carboidratos diários em gramas." },
          total_fat: { type: NUMBER, description: "Total de Gorduras diárias em gramas." },
          total_daily_cost: { type: NUMBER, description: "Custo diário total estimado para a dieta, respeitando o orçamento mensal." },
          meals: { 
            type: ARRAY,
            description: "Lista de 4 refeições (Café da Manhã, Almoço, Lanche, Jantar).",
            items: {
              type: OBJECT,
              properties: {
                name: { type: STRING, description: "Nome da refeição (e.g., 'Café da Manhã', 'Almoço')." },
                calories: { type: NUMBER, description: "Calorias totais desta refeição." },
                foods: { 
                  type: ARRAY,
                  items: {
                    type: OBJECT,
                    properties: {
                      name: { type: STRING, description: "Nome do alimento (e.g., 'Ovos mexidos', 'Frango grelhado')." },
                      portion: { type: STRING, description: "Tamanho da porção (e.g., '2 unidades', '150g', '1 copo')." }
                    },
                    propertyOrdering: ["name", "portion"]
                  }
                }
              },
              propertyOrdering: ["name", "calories", "foods"]
            }
          }
        }
        
        Instruções adicionais:
        1. Calcule a Taxa Metabólica Basal (TMB) e o Gasto Energético Total (GET) com base nos dados.
        2. Ajuste o consumo calórico (Calorias Diárias) em 500 kcal para mais (Ganho de Peso) ou para menos (Perda de Peso), conforme o objetivo.
        3. O Custo Diário Total (total_daily_cost) deve ser menor ou igual a (Orçamento Mensal / 30 dias).
        4. O plano de dieta deve ser para UM DIA, representando a estrutura semanal.
        5. Forneça gramas e porções realistas.
        6. A resposta deve ser APENAS o JSON, sem texto explicativo ou markdown fora do bloco JSON.
        `;

        const userQuery = `Gere um plano de dieta para o seguinte perfil:\n` + JSON.stringify(profileData, null, 2);

        const apiKey = "" 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        // Definindo o schema de resposta
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

            // Lógica para extrair o JSON puro da resposta do modelo
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!jsonText) {
                 throw new Error("A resposta da IA não contém um plano de dieta válido.");
            }

            const dietPlan = JSON.parse(jsonText);
            
            // Retorna o objeto diet_plan dentro de um envelope para consistência
            return { diet_plan: dietPlan, message: "Dieta gerada com sucesso!" };

        } catch (error) {
            console.error("Erro no cálculo da dieta (Gemini API):", error);
            // Simulação de erro de retorno (o frontend espera um objeto de erro)
            throw new Error(`Falha ao gerar o plano de dieta. Detalhes: ${error.message}`);
        }
    }
}

// Cria uma instância global da API para uso em auth.js
if (typeof window.DietAPI === 'undefined') {
    window.DietAPI = new DietAPI();
}
