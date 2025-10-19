from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

def init_db(app):
    with app.app_context():
        db.create_all()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    profile = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    monthly_budget = db.Column(db.Float, default=0.0)  # NOVO: Orçamento mensal
    
    food_entries = db.relationship('FoodEntry', backref='user', lazy=True)
    diet_plans = db.relationship('DietPlan', backref='user', lazy=True)

class FoodItem(db.Model):
    __tablename__ = 'food_items'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    protein = db.Column(db.Float, nullable=False)
    fat = db.Column(db.Float, nullable=False)
    carbs = db.Column(db.Float, nullable=False)
    portion_size = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    average_price = db.Column(db.Float, default=0.0)  # NOVO: Preço médio
    price_unit = db.Column(db.String(20), default='R$')  # NOVO: Unidade de preço
    
    food_entries = db.relationship('FoodEntry', backref='food_item', lazy=True)

class FoodEntry(db.Model):
    __tablename__ = 'food_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('food_items.id'), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    consumed_at = db.Column(db.DateTime, default=datetime.utcnow)
    meal_type = db.Column(db.String(20), nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, nullable=False)

class DietPlan(db.Model):  # NOVA TABELA: Armazenar planos de dieta
    __tablename__ = 'diet_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_data = db.Column(db.Text, nullable=False)  # JSON com o plano completo
    total_cost = db.Column(db.Float, default=0.0)  # Custo total do plano
    monthly_budget = db.Column(db.Float, default=0.0)  # Orçamento usado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

def init_db(app):
    """Inicializa o banco de dados com dados padrão"""
    with app.app_context():
        db.create_all()
        
        # Popular banco se estiver vazio
        if FoodItem.query.count() == 0:
            default_foods = [
                # Alimentos com preços médios
                FoodItem(name="Maçã", calories=52, protein=0.3, fat=0.2, carbs=14.0, 
                        portion_size="100g", category="fruta", average_price=2.50),
                FoodItem(name="Banana", calories=89, protein=1.1, fat=0.3, carbs=22.8, 
                        portion_size="100g", category="fruta", average_price=1.80),
                FoodItem(name="Frango Grelhado", calories=165, protein=31.0, fat=3.6, carbs=0.0, 
                        portion_size="100g", category="proteína", average_price=12.00),
                FoodItem(name="Arroz Integral", calories=111, protein=2.6, fat=0.9, carbs=23.0, 
                        portion_size="100g", category="carboidrato", average_price=4.50),
                FoodItem(name="Ovo Cozido", calories=70, protein=6.3, fat=4.8, carbs=0.6, 
                        portion_size="1 unidade", category="proteína", average_price=0.80),
                FoodItem(name="Pão Integral", calories=80, protein=4.0, fat=1.0, carbs=14.0, 
                        portion_size="1 fatia", category="carboidrato", average_price=0.30),
                FoodItem(name="Queijo Cottage", calories=100, protein=14.0, fat=4.0, carbs=3.0, 
                        portion_size="100g", category="laticínio", average_price=8.00),
                FoodItem(name="Iogurte Natural", calories=59, protein=3.5, fat=3.3, carbs=4.0, 
                        portion_size="100g", category="laticínio", average_price=3.50),
                FoodItem(name="Aveia", calories=68, protein=2.4, fat=1.4, carbs=12.0, 
                        portion_size="100g", category="carboidrato", average_price=5.00),
                FoodItem(name="Salada Verde", calories=15, protein=1.0, fat=0.2, carbs=3.0, 
                        portion_size="100g", category="vegetal", average_price=3.00),
                FoodItem(name="Salmão", calories=200, protein=22.0, fat=12.0, carbs=0.0, 
                        portion_size="100g", category="proteína", average_price=25.00),
                FoodItem(name="Batata Doce", calories=86, protein=1.6, fat=0.1, carbs=20.0, 
                        portion_size="100g", category="carboidrato", average_price=3.50),
                FoodItem(name="Abacate", calories=160, protein=2.0, fat=15.0, carbs=9.0, 
                        portion_size="100g", category="fruta", average_price=4.00),
                FoodItem(name="Amêndoas", calories=579, protein=21.0, fat=50.0, carbs=22.0, 
                        portion_size="100g", category="oleaginosas", average_price=15.00),
                FoodItem(name="Leite Desnatado", calories=34, protein=3.4, fat=0.1, carbs=5.0, 
                        portion_size="100ml", category="laticínio", average_price=2.00)
            ]
            db.session.bulk_save_objects(default_foods)
            db.session.commit()
            print("✅ Banco de dados populado com alimentos e preços!")