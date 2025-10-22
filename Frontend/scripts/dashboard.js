
function loadDashboard(profile) {
    
    if (!profile || !profile.dietPlan) {
        console.error('Perfil ou plano de dieta não encontrado');
    
        return; 
    }
    
    const dietPlan = profile.dietPlan;
    
    // informações de orçamento
    updateBudgetInfo(dietPlan, profile.monthly_budget);
    
    // exibição das refeições
    generateMealPlan(dietPlan);
    
    // botão de regenerar dieta
    setupRegenerateButton(profile);
}

function updateBudgetInfo(dietPlan, monthlyBudget) {
    document.getElementById('monthly-budget').textContent = `R$ ${monthlyBudget}`;
    
    
    const dailyCost = dietPlan.total_daily_cost || dietPlan.daily_budget || 10;
    document.getElementById('daily-cost').textContent = `R$ ${dailyCost.toFixed(2)}`;
    
    const monthlyCost = dailyCost * 30;
    const savings = monthlyBudget - monthlyCost;
    document.getElementById('monthly-savings').textContent = `R$ ${savings.toFixed(2)}`;
    
    // barra de progresso
    const progressPercentage = Math.min((monthlyCost / monthlyBudget) * 100, 100);
    document.querySelector('.progress-fill').style.width = `${progressPercentage}%`;
    
    // estatísticas
    const progressStats = document.querySelector('.progress-stats');
    progressStats.innerHTML = `
        <div class="stat-item">
            <span>Gasto este mês</span>
            <span>R$ ${monthlyCost.toFixed(2)}</span>
        </div>
        <div class="stat-item">
            <span>Restante</span>
            <span>R$ ${Math.max(0, savings).toFixed(2)}</span>
        </div>
    `;
}

function generateMealPlan(dietPlan) {
    const mealsContainer = document.getElementById('ai-generated-meals');
    
    if (!dietPlan.meals || dietPlan.meals.length === 0) {
        mealsContainer.innerHTML = `
            <div class="meal-card">
                <h4>Plano em Geramento</h4>
                <p>Nossa IA está criando seu plano alimentar personalizado...</p>
            </div>
        `;
        return;
    }
    
    let mealsHTML = '';
    
    dietPlan.meals.forEach(meal => {
        let foodsHTML = '';
        
        if (meal.foods && meal.foods.length > 0) {
            meal.foods.forEach(food => {
                
                foodsHTML += `<p>• ${food.portion} de ${food.name}</p>`;
            });
        } else {
            foodsHTML = `<p>• Combinação balanceada de alimentos econômicos</p>`;
        }
        
        mealsHTML += `
            <div class="meal-card">
                <h4>${meal.name} (${meal.calories || '---'} kcal)</h4>
                <div class="meal-foods">
                    ${foodsHTML}
                </div>
                <p class="meal-cost">Custo: R$ ${meal.cost ? meal.cost.toFixed(2) : '---'}</p>
            </div>
        `;
    });
    
    // resumo do plano
    mealsHTML += `
        <div class="meal-card" style="border-left-color: var(--primary);">
            <h4>📊 Resumo do Plano</h4>
            
            <p><strong>Custo Diário:</strong> R$ ${dietPlan.total_daily_cost ? dietPlan.total_daily_cost.toFixed(2) : dietPlan.daily_budget.toFixed(2)}</p>
            <p><strong>Custo Mensal:</strong> R$ ${(dietPlan.total_daily_cost ? dietPlan.total_daily_cost * 30 : dietPlan.daily_budget * 30).toFixed(2)}</p>
            
            <p><strong>Calorias Diárias:</strong> ${dietPlan.daily_calories ? Math.round(dietPlan.daily_calories) : '---'} kcal</p>
            
            <p><strong>Proteínas:</strong> --- g</p>
            <p><strong>Carboidratos:</strong> --- g</p>
            <p><strong>Gorduras:</strong> --- g</p>
            
            <p><strong>Gerado por:</strong> ${dietPlan.generated_by === 'smart_algorithm' ? 'IA Inteligente' : 'Sistema Nutricional'}</p>
        </div>
    `;
    
    mealsContainer.innerHTML = mealsHTML;
}

function setupRegenerateButton(profile) {
    const regenerateBtn = document.getElementById('regenerate-diet');
    
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', async () => {
            const newBudget = prompt('Novo orçamento mensal (R$):', profile.monthly_budget || 300);
            
            if (newBudget && !isNaN(newBudget) && parseFloat(newBudget) >= 100) {
                try {
                    
                    
                    showLoading(true);
                    
                    // orçamento
                    await DietAPI.updateBudget(parseFloat(newBudget));
                    
                    // Regenerar dieta com novo orçamento
                    const result = await DietAPI.calculateDiet({
                        ...profile,
                        monthly_budget: parseFloat(newBudget)
                    });
                    
                    if (result.diet_plan) {
                        const updatedProfile = {
                            ...profile,
                            monthly_budget: parseFloat(newBudget),
                            
                            dietPlan: result.diet_plan 
                        };
                        
                        AuthManager.setProfile(updatedProfile);
                        loadDashboard(updatedProfile);
                        
                        alert('Dieta regenerada com sucesso!');
                    }
                } catch (error) {
                    alert('Erro ao regenerar dieta: ' + error.message);
                } finally {
                    showLoading(false);
                }
            } else if (newBudget) {
                alert('Por favor, insira um orçamento válido (mínimo R$ 100)');
            }
        });
    }
}

// Função para carregar histórico de planos
async function loadDietHistory() {
    try {
        const plans = await DietAPI.getDietPlans();
        console.log('Histórico de planos:', plans);
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

// Inicializar dashboard quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    if (AuthManager.isLoggedIn()) {
        const profile = AuthManager.getProfile();
        if (profile && profile.dietPlan) {
            loadDashboard(profile);
            loadDietHistory();
        }
    }
});