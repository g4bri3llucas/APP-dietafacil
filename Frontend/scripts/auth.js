/**
 * Arquivo: Frontend/scripts/auth.js
 * Descrição: Gerencia o estado de autenticação (token/perfil), a manipulação da UI e a navegação entre telas.
 * Dependências: Requer que window.DietAPI esteja definida (carregada via api.js).
 */

// -------------------------------------------------------------
// Funções de Gerenciamento de Autenticação (Local Storage)
// -------------------------------------------------------------

class AuthManager {
    /** Retorna o token de autenticação salvo no Local Storage. */
    static getToken() {
        return localStorage.getItem('authToken');
    }

    /** Salva o token de autenticação. */
    static setToken(token) {
        localStorage.setItem('authToken', token);
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

    /** Salva o perfil completo. */
    static setProfile(profile) {
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }

    /** Verifica se o usuário tem um token salvo. */
    static isLoggedIn() {
        return !!AuthManager.getToken();
    }
}

// -------------------------------------------------------------
// Funções de UI
// -------------------------------------------------------------

// Controle de telas
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden'); // Adicionado 'hidden' para melhor controle de exibição
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        targetScreen.classList.remove('hidden');
    }
}

/** Exibe uma mensagem de erro ou sucesso para o usuário. (Substitui alert()) */
const showMessage = (message, isError = false) => {
    // Implementação temporária: use console e alert (deve ser substituído por um modal customizado)
    if (isError) {
        console.error(message);
    } else {
        console.log(message);
    }
    // Mantido alert() para feedback imediato no navegador
    alert(message); 
};


// Carregar dados do perfil se existirem
function loadProfileData(profile) {
    if (profile.name) document.getElementById('userName').value = profile.name;
    if (profile.age) document.getElementById('userAge').value = profile.age;
    if (profile.gender) document.getElementById('userGender').value = profile.gender;
    if (profile.height) document.getElementById('userHeight').value = profile.height;
    if (profile.weight) document.getElementById('userWeight').value = profile.weight;
    if (profile.activityLevel) document.getElementById('userActivity').value = profile.activityLevel;
    if (profile.goal) document.getElementById('userGoal').value = profile.goal;
    // CRÍTICO: O orçamento deve sempre ser carregado, mesmo que seja 0, para evitar NaN no formulário.
    document.getElementById('userBudget').value = profile.monthly_budget || 0; 
}

// Exibir resultado da dieta (função mantida como estava)
function displayDietResult(dietPlan) {
    const resultDiv = document.getElementById('result');
    let html = `
        <div class="diet-result">
            <h3>🎉 Sua Dieta Personalizada</h3>

            <div class="nutrition-summary">
                <h4>Resumo Nutricional Diário:</h4>
    
                <p><strong>Calorias:</strong> ${Math.round(dietPlan.daily_calories) || 'N/A'} kcal</p>
    
                <p><strong>Proteínas:</strong> ${dietPlan.total_proteins || 'N/A'} g</p> 
                <p><strong>Carboidratos:</strong> ${dietPlan.total_carbs || 'N/A'} g</p>
                <p><strong>Gorduras:</strong> ${dietPlan.total_fat || 'N/A'} g</p>
    
                <p><strong>Custo Diário:</strong> R$ ${dietPlan.total_daily_cost?.toFixed(2) || '0.00'}</p>
            </div>
    `;
    
    if (dietPlan.meals && dietPlan.meals.length > 0) {
        html += `<div class="meals-plan">`;
        dietPlan.meals.forEach(meal => {
            html += `
                <div class="meal">
                    <h4>${meal.name} (${meal.calories || '---'} kcal)</h4> 
                    <ul>
            `;
            
            if (meal.foods && meal.foods.length > 0) {
                meal.foods.forEach(food => {
                    html += `<li>• ${food.portion} de ${food.name}</li>`; 
                });
            } else {
                html += `<li>Detalhes das refeições serão fornecidos em breve</li>`;
            }
            
            html += `</ul></div>`;
        });
        html += `</div>`;
    }
    
    html += `</div>`;
    
    resultDiv.innerHTML = html;
    resultDiv.classList.remove('hidden');
}


// -------------------------------------------------------------
// Lógica Principal (event listeners)
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    // Verificação de Dependência
    if (typeof window.DietAPI === 'undefined') {
        showMessage("ERRO CRÍTICO: DietAPI não está definida. Verifique se o api.js foi carregado corretamente.", true);
        return; 
    }

    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const profileForm = document.getElementById('profileForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loadingMessage = document.getElementById('loadingMessage');
    const resultDiv = document.getElementById('result');

    // Inicialização da aplicação (verifica se está logado)
    if (AuthManager.isLoggedIn()) {
        const profile = AuthManager.getProfile();
        if (profile) {
            loadProfileData(profile);
        }
        showScreen('profileScreen');
    } else {
        showScreen('loginScreen');
    }

    // ----------------------
    // Login
    // ----------------------
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                // CORREÇÃO: Chamando o método login da instância DietAPI
                const result = await window.DietAPI.login(email, password); 
                
                if (result.token) {
                    AuthManager.setToken(result.token);
                    // Salva os dados do perfil retornados pelo login
                    AuthManager.setProfile({ ...result.user, loggedIn: true, email: email });

                    // Carrega e exibe os dados
                    loadProfileData(result.user);
                    showMessage('Login realizado com sucesso!', false);
                    showScreen('profileScreen');
                } else {
                    showMessage('Erro no login: Credenciais inválidas', true);
                }
            } catch (error) {
                showMessage('Erro ao fazer login: ' + error.message, true);
            }
        });
    }

    // ----------------------
    // Registro
    // ----------------------
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const monthly_budget = parseFloat(document.getElementById('registerBudget').value);
            
            if (password.length < 6) {
                showMessage('A senha deve ter pelo menos 6 caracteres', true);
                return;
            }
            if (isNaN(monthly_budget) || monthly_budget <= 0) {
                 showMessage('O orçamento mensal deve ser um valor válido e positivo.', true);
                 return;
            }
            
            try {
                // CORREÇÃO: Chamando o método register com argumentos separados
                const result = await window.DietAPI.register(email, password, monthly_budget);
                
                if (result.token) {
                    AuthManager.setToken(result.token);
                    // Salva os dados do perfil (incluindo o orçamento)
                    AuthManager.setProfile({ ...result.user, loggedIn: true, email: email });

                    // Carrega e exibe os dados
                    loadProfileData(result.user);
                    showMessage('Cadastro realizado e login efetuado com sucesso!', false);
                    showScreen('profileScreen');
                } else {
                    showMessage('Erro no cadastro: ' + result.message, true);
                }
            } catch (error) {
                showMessage('Erro ao cadastrar: ' + error.message, true);
            }
        });
    }

    // ----------------------
    // Logout
    // ----------------------
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Não usamos confirm(), apenas deslogamos
            AuthManager.logout();
            showMessage('Você saiu da sua conta.', false);
            showScreen('loginScreen');
            // Limpa formulários
            if (loginForm) loginForm.reset();
            if (registerForm) registerForm.reset();
            if (profileForm) profileForm.reset();
        });
    }

    // ----------------------
    // Gerar Dieta (Profile Form Submission)
    // ----------------------
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Checa se a função calculateDiet existe na API antes de chamar
            if (typeof window.DietAPI.calculateDiet !== 'function') {
                showMessage('Erro: O método calculateDiet não está implementado na API.', true);
                return;
            }

            const profileData = {
                name: document.getElementById('userName').value,
                age: parseInt(document.getElementById('userAge').value),
                gender: document.getElementById('userGender').value,
                height: parseInt(document.getElementById('userHeight').value),
                weight: parseFloat(document.getElementById('userWeight').value),
                activityLevel: document.getElementById('userActivity').value,
                goal: document.getElementById('userGoal').value,
                monthly_budget: parseFloat(document.getElementById('userBudget').value)
            };
            
            // Validações básicas (mantidas)
            if (profileData.height < 100 || profileData.height > 250) {
                showMessage('Altura deve estar entre 100cm e 250cm', true);
                return;
            }
            
            if (profileData.weight < 30 || profileData.weight > 200) {
                showMessage('Peso deve estar entre 30kg e 200kg', true);
                return;
            }
            
            if (profileData.monthly_budget < 50) {
                showMessage('Orçamento mínimo é R$ 50,00', true);
                return;
            }

            // Exemplo de como obter o token para enviar em um cabeçalho (se o calculateDiet exigir)
            // const token = AuthManager.getToken();
            
            try {
                // Mostra loading
                if(loadingMessage) loadingMessage.classList.remove('hidden');
                if(resultDiv) resultDiv.classList.add('hidden');
                
                // Chamada da API para calcular a dieta
                const result = await window.DietAPI.calculateDiet(profileData);
                
                // Esconde loading
                if(loadingMessage) loadingMessage.classList.add('hidden');
                
                if (result.diet_plan) {
                    displayDietResult(result.diet_plan); 
                    
                    // Salva a dieta no perfil local
                    const currentProfile = AuthManager.getProfile();
                    AuthManager.setProfile({ ...currentProfile, dietPlan: result.diet_plan });
                    
                } else {
                    throw new Error(result.message || 'Erro ao gerar dieta');
                }
            } catch (error) {
                if(loadingMessage) loadingMessage.classList.add('hidden');
                showMessage('Erro ao gerar dieta: ' + error.message, true);
            }
        });
    }
});
