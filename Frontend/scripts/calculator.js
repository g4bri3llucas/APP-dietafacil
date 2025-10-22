// Cálculos nutricionais (como fallback se a API não estiver disponível)
class DietCalculator {
    static calculateBMR(age, gender, height, weight) {
        // Fórmula de Mifflin-St Jeor
        if (gender === 'male') {
            return 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
            return 10 * weight + 6.25 * height - 5 * age - 161;
        }
    }
    
    static calculateTDEE(bmr, activityLevel) {
        const multipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        
        return bmr * multipliers[activityLevel];
    }
    
    static calculateGoalCalories(tdee, goal) {
        const adjustments = {
            weight_loss: -500,
            maintain: 0,
            gain_muscle: 300
        };
        
        return tdee + adjustments[goal];
    }
    
    static calculateMacros(calories, goal) {
        let proteinRatio, fatRatio, carbRatio;
        
        switch(goal) {
            case 'weight_loss':
                proteinRatio = 0.35;
                fatRatio = 0.25;
                carbRatio = 0.40;
                break;
            case 'gain_muscle':
                proteinRatio = 0.40;
                fatRatio = 0.25;
                carbRatio = 0.35;
                break;
            default: // maintain
                proteinRatio = 0.30;
                fatRatio = 0.25;
                carbRatio = 0.45;
        }
        
        // 1g protein = 4 kcal, 1g carb = 4 kcal, 1g fat = 9 kcal
        const proteinGrams = Math.round((calories * proteinRatio) / 4);
        const fatGrams = Math.round((calories * fatRatio) / 9);
        const carbGrams = Math.round((calories * carbRatio) / 4);
        
        return {
            protein: proteinGrams,
            fat: fatGrams,
            carbs: carbGrams
        };
    }
    
    static generateMealPlan(calories, macros) {
        // Distribuição de calorias por refeição
        const mealDistribution = {
            breakfast: 0.25,
            lunch: 0.35,
            dinner: 0.25,
            snack: 0.15
        };
        
        // Alimentos 
        const foodDatabase = {
            breakfast: [
                { name: "Ovos cozidos", calories: 140, portion: "2 unidades" },
                { name: "Pão integral", calories: 80, portion: "1 fatia" },
                { name: "Queijo cottage", calories: 100, portion: "4 colheres de sopa" }
            ],
            lunch: [
                { name: "Frango grelhado", calories: 165, portion: "100g" },
                { name: "Arroz integral", calories: 110, portion: "4 colheres de sopa" },
                { name: "Feijão", calories: 70, portion: "3 colheres de sopa" }
            ],
            
        };
        
        // Gerar plano de refeições (simplificado)
        const mealPlan = {};
        
        for (const [meal, ratio] of Object.entries(mealDistribution)) {
            const mealCalories = Math.round(calories * ratio);
            mealPlan[meal] = {
                calories: mealCalories,
                foods: this.selectFoodsForMeal(meal, mealCalories, foodDatabase)
            };
        }
        
        return mealPlan;
    }
    
    static selectFoodsForMeal(meal, targetCalories, foodDatabase) {
        // Algoritmo simplificado para selecionar alimentos
        const availableFoods = foodDatabase[meal] || [];
        const selectedFoods = [];
        let currentCalories = 0;
        
        
        for (const food of availableFoods) {
            if (currentCalories + food.calories <= targetCalories) {
                selectedFoods.push(food);
                currentCalories += food.calories;
            }
            
            if (currentCalories >= targetCalories * 0.9) {
                break;
            }
        }
        
        return selectedFoods;
    }
    
    static calculateDietPlan(profile) {
        const bmr = this.calculateBMR(profile.age, profile.gender, profile.height, profile.weight);
        const tdee = this.calculateTDEE(bmr, profile.activityLevel);
        const goalCalories = this.calculateGoalCalories(tdee, profile.goal);
        const macros = this.calculateMacros(goalCalories, profile.goal);
        const mealPlan = this.generateMealPlan(goalCalories, macros);
        
        return {
            dailyCalories: goalCalories,
            macros: macros,
            mealPlan: mealPlan,
            bmr: bmr,
            tdee: tdee
        };
    }
}