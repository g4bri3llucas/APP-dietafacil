from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import jwt
import datetime
from functools import wraps
import json
import os 
from sqlalchemy.exc import IntegrityError

# Importa tudo que vem do banco de dados e do serviço de IA
from database import db, init_db, User, FoodItem, FoodEntry, DietPlan
from ai_service import ai_service


app = Flask(__name__, static_folder='../Frontend', static_url_path='')
CORS(app)

# Configurações gerais
app.config['SECRET_KEY'] = 'dietafacil-secret-key-2024'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///diet_app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializa o banco
db.init_app(app)
init_db(app)

# cria as tabelas do banco
with app.app_context():
    db.create_all()

# ==================== AUTENTICAÇÃO ====================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token necessário'}), 401
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['email']
        except:
            return jsonify({'message': 'Token inválido'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


# ==================== ROTAS ====================

# Registro de usuário
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email e senha são obrigatórios'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Usuário já existe'}), 409
        
        user = User(
            email=data['email'], 
            password=data['password'],
            monthly_budget=data.get('monthly_budget', 0.0)
        )
        db.session.add(user)
        db.session.commit()
        
        token = jwt.encode({
            'email': data['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])

        return jsonify({
            'message': 'Usuário criado com sucesso',
            'token': token,
            'profile': None
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


# Login
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Email e senha são obrigatórios'}), 400
        
        user = User.query.filter_by(email=data['email'], password=data['password']).first()
        if not user:
            return jsonify({'message': 'Credenciais inválidas'}), 401
        
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        token = jwt.encode({
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])

        return jsonify({
            'message': 'Login realizado com sucesso',
            'token': token,
            'profile': json.loads(user.profile) if user.profile else None,
            'monthly_budget': user.monthly_budget
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500


# Cálculo de dieta com IA
@app.route('/api/calculate-diet', methods=['POST'])
@token_required
def calculate_diet(current_user):
    try:
        data = request.get_json()
        required = ['age', 'gender', 'height', 'weight', 'activityLevel', 'goal']
        for field in required:
            if field not in data:
                return jsonify({'message': f'Campo {field} obrigatório'}), 400
        
        user = User.query.filter_by(email=current_user).first()
        if not user:
            return jsonify({'message': 'Usuário não encontrado'}), 404

        monthly_budget = data.get('monthly_budget', user.monthly_budget or 300.0)
        user.monthly_budget = monthly_budget
        
        food_items = FoodItem.query.all()
        food_prices = [{
            'id': f.id,
            'name': f.name,
            'average_price': f.average_price,
            'portion_size': f.portion_size,
            'calories': f.calories,
            # Adiciona os campos de macros para o serviço de IA
            'protein': f.protein, 
            'carbs': f.carbs,
            'fat': f.fat
        } for f in food_items]

        diet_plan = ai_service.generate_diet_with_budget(
            user_data=data,
            monthly_budget=monthly_budget,
            food_prices=food_prices
        )

        new_diet_plan = DietPlan(
            user_id=user.id,
            plan_data=json.dumps(diet_plan),
            total_cost=diet_plan.get('total_daily_cost', 0) * 30,
            monthly_budget=monthly_budget
        )
        db.session.add(new_diet_plan)
        
        user.profile = json.dumps({
            **data, 
            'dietPlan': diet_plan,
            'monthly_budget': monthly_budget
        })
        
        db.session.commit()

        return jsonify({
            'diet_plan': diet_plan,
            'message': 'Plano alimentar gerado com sucesso!'
        }), 200

    except Exception as e:
        return jsonify({'message': f'Erro ao calcular dieta: {str(e)}'}), 500


# Busca de alimentos
@app.route('/api/food-search', methods=['GET'])
def food_search():
    try:
        query = request.args.get('q', '').lower()
        if query:
            foods = FoodItem.query.filter(FoodItem.name.ilike(f'%{query}%')).limit(10).all()
        else:
            foods = FoodItem.query.limit(20).all()
        
        return jsonify([{
            'id': food.id,
            'name': food.name,
            'calories': food.calories,
            'protein': food.protein,
            'fat': food.fat,
            'carbs': food.carbs,
            'portion': food.portion_size,
            'category': food.category,
            'average_price': food.average_price,
            'price_unit': food.price_unit
        } for food in foods])
        
    except Exception as e:
        return jsonify({'message': f'Erro na busca: {str(e)}'}), 500


# Atualizar orçamento
@app.route('/api/user/budget', methods=['PUT'])
@token_required
def update_budget(current_user):
    try:
        data = request.get_json()
        new_budget = data.get('monthly_budget')
        
        if new_budget is None or new_budget < 0:
            return jsonify({'message': 'Orçamento inválido'}), 400
        
        user = User.query.filter_by(email=current_user).first()
        if not user:
            return jsonify({'message': 'Usuário não encontrado'}), 404
        
        user.monthly_budget = float(new_budget)
        db.session.commit()
        
        return jsonify({
            'message': 'Orçamento atualizado com sucesso',
            'monthly_budget': user.monthly_budget
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro ao atualizar orçamento: {str(e)}'}), 500


# Buscar planos de dieta anteriores
@app.route('/api/user/diet-plans', methods=['GET'])
@token_required
def get_diet_plans(current_user):
    try:
        user = User.query.filter_by(email=current_user).first()
        if not user:
            return jsonify({'message': 'Usuário não encontrado'}), 404
        
        plans = DietPlan.query.filter_by(user_id=user.id).order_by(DietPlan.created_at.desc()).limit(5).all()
        
        return jsonify([{
            'id': plan.id,
            'total_cost': plan.total_cost,
            'monthly_budget': plan.monthly_budget,
            'created_at': plan.created_at.isoformat(),
            'is_active': plan.is_active,
            'plan_data': json.loads(plan.plan_data)
        } for plan in plans]), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro ao buscar planos: {str(e)}'}), 500


# Rota de verificação de status
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'online',
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'database': 'connected',
        'ai_service': 'available'
    }), 200

# === ROTA DE FALLBACK SIMPLIFICADA PARA SPA ===
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    # Verifica se a rota solicitada é um arquivo estático existente (ex: /app.js)
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Se não for um arquivo estático ou se for a rota raiz, envia o index.html
    return send_from_directory(app.static_folder, 'index.html')

# ==================== EXECUÇÃO ====================
if __name__ == '__main__':
    # ==================== DEBUG DO CAMINHO ====================
    # Estes prints mostrarão exatamente onde o Flask está procurando
    cwd = os.getcwd()
    print("-" * 50)
    print(f"DEBUG: Diretório de Trabalho Atual (CWD): {cwd}")
    print(f"DEBUG: Pasta Estática (static_folder) configurada como: {app.static_folder}")
    
    # Calcula o caminho completo que o Flask espera para o index.html
    full_index_path = os.path.abspath(os.path.join(cwd, app.static_folder, 'index.html'))
    print(f"DEBUG: Caminho ABSOLUTO esperado para index.html: {full_index_path}")

    if os.path.exists(full_index_path):
        print("DEBUG: ✅ ARQUIVO INDEX.HTML ENCONTRADO!")
    else:
        print("DEBUG: ❌ ARQUIVO INDEX.HTML NÃO ENCONTRADO! Verifique se este caminho existe no seu sistema.")
    print("-" * 50)
    # ==========================================================

    
    app.run(debug=True, port=5000, host='0.0.0.0')