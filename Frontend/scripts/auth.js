// Controle de telas
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Elementos do DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const profileForm = document.getElementById('profileForm');
const logoutBtn = document.getElementById('logoutBtn');
const loadingMessage = document.getElementById('loadingMessage');
const resultDiv = document.getElementById('result');

// Login
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const result = await DietAPI.login({ email, password });
        
        if (result.token) {
            AuthManager.setToken(result.token);
            if (result.profile) {
                loadProfileData(result.profile);
            }
            showScreen('profileScreen');
        } else {
            alert('Erro no login: ' + (result.message || 'Credenciais inválidas'));
        }
    } catch (error) {
        alert('Erro ao fazer login: ' + error.message);
    }
});

// Registro
registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const monthly_budget = parseFloat(document.getElementById('registerBudget').value);
    
    if (password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres');
        return;
    }
    
    try {
        const result = await DietAPI.register({ 
            email, 
            password, 
            monthly_budget 
        });
        
        if (result.token) {
            AuthManager.setToken(result.token);
            showScreen('profileScreen');
            // Preenche o orçamento no perfil
            document.getElementById('userBudget').value = monthly_budget;
        } else {
            alert('Erro no cadastro: ' + result.message);
        }
    } catch (error) {
        alert('Erro ao cadastrar: ' + error.message);
    }
});

// Logout
logoutBtn.addEventListener('click', function() {
    if (confirm('Deseja realmente sair?')) {
        AuthManager.logout();
        showScreen('loginScreen');
        // Limpa formulários
        loginForm.reset();
        registerForm.reset();
    }
});

// Gerar Dieta
profileForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
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
    
    // Validações básicas
    if (profileData.height < 100 || profileData.height > 250) {
        alert('Altura deve estar entre 100cm e 250cm');
        return;
    }
    
    if (profileData.weight < 30 || profileData.weight > 200) {
        alert('Peso deve estar entre 30kg e 200kg');
        return;
    }
    
    if (profileData.monthly_budget < 50) {
        alert('Orçamento mínimo é R$ 50,00');
        return;
    }
    
    try {
        // Mostra loading
        loadingMessage.classList.remove('hidden');
        resultDiv.classList.add('hidden');
        
        const result = await DietAPI.calculateDiet(profileData);
        
        // Esconde loading
        loadingMessage.classList.add('hidden');
        
        if (result.diet_plan) {
            
            displayDietResult(result.diet_plan); 
            
            
            const currentProfile = AuthManager.getProfile();
            AuthManager.setProfile({ ...currentProfile, dietPlan: result.diet_plan });
            
        } else {
            throw new Error(result.message || 'Erro ao gerar dieta');
        }
    } catch (error) {
        loadingMessage.classList.add('hidden');
        alert('Erro ao gerar dieta: ' + error.message);
    }
});

// Carregar dados do perfil se existirem
function loadProfileData(profile) {
    if (profile.name) document.getElementById('userName').value = profile.name;
    if (profile.age) document.getElementById('userAge').value = profile.age;
    if (profile.gender) document.getElementById('userGender').value = profile.gender;
    if (profile.height) document.getElementById('userHeight').value = profile.height;
    if (profile.weight) document.getElementById('userWeight').value = profile.weight;
    if (profile.activityLevel) document.getElementById('userActivity').value = profile.activityLevel;
    if (profile.goal) document.getElementById('userGoal').value = profile.goal;
    if (profile.monthly_budget) document.getElementById('userBudget').value = profile.monthly_budget;
}

// Exibir resultado da dieta
function displayDietResult(dietPlan) {
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

// ...
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

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    if (AuthManager.isLoggedIn()) {
        const profile = AuthManager.getProfile();
        
        if (profile) {
            loadProfileData(profile);
        }
        showScreen('profileScreen');
    } else {
        showScreen('loginScreen');
    }
});