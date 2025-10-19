import requests
import json
import random

class AIService:
    def __init__(self):
        self.fallback_foods = [
            {"name": "Arroz + Feijão + Frango", "cost": 8.50, "calories": 450},
            {"name": "Omelete de claras + pão integral", "cost": 4.00, "calories": 300},
            {"name": "Iogurte + aveia + frutas", "cost": 6.00, "calories": 250},
            {"name": "Salada + atum + batata doce", "cost": 10.00, "calories": 400},
            {"name": "Sopa de legumes + frango", "cost": 7.00, "calories": 350}
        ]
    
    def generate_diet_with_budget(self, user_data, monthly_budget, food_prices):
        """
        Gera plano alimentar considerando orçamento
        Usa IA gratuita ou fallback inteligente
        """
        try:
            # Tenta usar API Hugging Face
            return self._try_huggingface_ai(user_data, monthly_budget, food_prices)
        except:
            # Fallback para algoritmo inteligente
            return self._generate_smart_fallback(user_data, monthly_budget, food_prices)
    
    def _try_huggingface_ai(self, user_data, budget, food_prices):
        """Tenta usar IA gratuita do Hugging Face"""
        prompt = self._build_prompt(user_data, budget, food_prices)
        
        try:
            # API Hugging Face
            response = requests.post(
                "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
                headers={"Authorization": "Bearer hf_your_free_token_here"},
                json={"inputs": prompt}
            )
            
            if response.status_code == 200:
                return self._parse_ai_response(response.json())
        except:
            pass
        
        # Se falhar, usa fallback
        return self._generate_smart_fallback(user_data, budget, food_prices)
    
    def _build_prompt(self, user_data, budget, food_prices):
        """Constrói prompt para IA"""
        return f"""
        Como nutricionista IA, crie um plano alimentar econômico para:
        - Idade: {user_data['age']} anos, Gênero: {user_data['gender']}
        - Peso: {user_data['weight']}kg, Altura: {user_data['height']}cm
        - Objetivo: {user_data['goal']}, Atividade: {user_data['activityLevel']}
        - Orçamento mensal: R$ {budget}
        - Alimentos disponíveis: {', '.join([f"{f['name']} (R${f['average_price']})" for f in food_prices[:5]])}
        
        Forneça 3 opções de refeições diárias (café, almoço, jantar) que caibam no orçamento.
        """
    
    def _generate_smart_fallback(self, user_data, monthly_budget, food_prices):
        """Algoritmo inteligente para gerar dieta com orçamento"""
        daily_budget = monthly_budget / 30
        
        # Filtra alimentos dentro do orçamento
        affordable_foods = [f for f in food_prices if f['average_price'] <= daily_budget / 3]
        
        if not affordable_foods:
            # Inclui mais dados dos alimentos do banco para o cálculo de macros
            affordable_foods = sorted(food_prices, key=lambda x: x['average_price'])[:5]
        
        # Calcula necessidades calóricas
        calories_needed = self._calculate_calories(user_data)
        
        # Gera refeições e calcula o custo total E MACROS TOTAIS
        meals, total_proteins, total_carbs, total_fat = self._generate_meals_and_macros(
            affordable_foods, calories_needed, daily_budget
        )
        total_daily_cost = sum(meal['cost'] for meal in meals)
        
        # CORREÇÃO CRÍTICA: Adicionar os totais de macros ao plano
        plan = {
            'daily_budget': round(daily_budget, 2),
            'monthly_budget': monthly_budget,
            'daily_calories': calories_needed,
            'total_daily_cost': round(total_daily_cost, 2),
            
            # NOVOS CAMPOS ADICIONADOS AQUI:
            'total_proteins': round(total_proteins, 1),
            'total_carbs': round(total_carbs, 1),
            'total_fat': round(total_fat, 1),
            
            'meals': meals,
            'generated_by': 'smart_algorithm'
        }
        
        return plan
    
    def _calculate_calories(self, user_data):
        """Calcula necessidades calóricas básicas (TDEE)"""
        if user_data['gender'] == 'male':
            bmr = 10 * user_data['weight'] + 6.25 * user_data['height'] - 5 * user_data['age'] + 5
        else:
            bmr = 10 * user_data['weight'] + 6.25 * user_data['height'] - 5 * user_data['age'] - 161
        
        activity_multipliers = {
            'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 
            'active': 1.725, 'very_active': 1.9
        }
        
        tdee = bmr * activity_multipliers.get(user_data['activityLevel'], 1.2)
        
        goal_adjustments = {'weight_loss': -500, 'maintain': 0, 'gain_muscle': 300}
        return tdee + goal_adjustments.get(user_data['goal'], 0)
    
    def _generate_meals_and_macros(self, foods, calories_needed, daily_budget):
        """Gera refeições e calcula o total de macros consumidos"""
        meals = []
        # Incluí Lanche (0.15) para refletir a estrutura de 4 refeições usada no Front-end
        meal_distribution = [0.25, 0.35, 0.25, 0.15]  
        meal_names = ['Café da Manhã', 'Almoço', 'Jantar', 'Lanche']
        
        total_proteins = 0
        total_carbs = 0
        total_fat = 0

        for i, ratio in enumerate(meal_distribution):
            meal_calories = calories_needed * ratio
            
            # Filtra alimentos que têm dados de macros e calorias
            affordable_options = [f for f in foods if 
                                  f['average_price'] <= daily_budget * ratio and 
                                  f.get('protein') is not None] # Verifica se tem pelo menos um macro
            
            if affordable_options:
                selected_foods = random.sample(affordable_options, min(2, len(affordable_options)))
                meal_cost = sum(f['average_price'] for f in selected_foods) * 0.7  # Ajuste para porções
                
                # CÁLCULO DE MACROS: Somando os macros dos alimentos selecionados (assumindo 1 porção completa)
                for food in selected_foods:
                    # Usamos .get(..., 0) para garantir que mesmo que o campo não exista, não dê erro
                    total_proteins += food.get('protein', 0)
                    total_carbs += food.get('carbs', 0)
                    total_fat += food.get('fat', 0)
                
                meals.append({
                    'name': meal_names[i],
                    'foods': [
                        {
                            'name': f['name'], 
                            'portion': f['portion_size']
                        } for f in selected_foods
                    ],
                    'calories': round(meal_calories),
                    'cost': round(meal_cost, 2)
                })
        
        return meals, total_proteins, total_carbs, total_fat
    
    # Esta função estava incorreta no código original e foi substituída
    def _parse_ai_response(self, response_json):
        """Função placeholder. Se a IA funcionar, implemente o parse do resultado aqui."""
        # Se a IA funcionar e retornar um JSON válido com macros/calorias,
        # você deve parsear e retornar no formato do _generate_smart_fallback
        raise NotImplementedError("Parsing da resposta da IA não implementado. Usando fallback.")

# Instância global do serviço de IA
ai_service = AIService()