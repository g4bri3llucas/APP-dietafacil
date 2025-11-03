import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from functools import wraps
import jwt
from datetime import datetime, timedelta, timezone

# Carregar variáveis de ambiente do .env (se existir)
load_dotenv()

# --- Configuração do Flask ---
app = Flask(__name__)

# Configuração da URL de Origem para CORS
# Adicionando uma lista mais abrangente para garantir compatibilidade com o Render.
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5500')
# Lista de origens permitidas
allowed_origins = [
    FRONTEND_URL, 
    "https://app-dietafacil-frontend.onrender.com",
    # Adicionando um curinga para permitir qualquer subdomínio do onrender.com para fins de teste
    "https://*.onrender.com" 
]

# A biblioteca flask-cors, no entanto, pode ter problemas com curingas no 'origins' se 'supports_credentials=True' não for usado,
# mas para simplificar, vamos tentar usar a lista explícita e o curinga se for uma origem simples.
# No Render, o mais seguro é listar as origens. Vamos manter a lista estrita, mas garantir que a URL principal seja pega.
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Chave secreta para JWT (MUITO IMPORTANTE: use uma chave forte em produção!)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'sua_chave_secreta_padrao_muito_segura')

# --- Banco de Dados (Simulado em Memória) ---
# Em um ambiente real, você usaria PostgreSQL, SQLite, etc.
# Aqui, usamos um dicionário para simplificar.
users_db = {} 

# --- Funções de Ajuda ---

def token_required(f):
    """
    Decorator para proteger rotas. Verifica a validade do token JWT.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # O token é esperado no cabeçalho Authorization: Bearer <token>
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token está faltando!'}), 401
        
        try:
            # Tenta decodificar o token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # O ID do usuário (user_id) está armazenado no token.
            current_user_id = data['user_id']
            # Verifica se o usuário ainda existe no DB (simulado)
            if current_user_id not in users_db:
                return jsonify({'message': 'Usuário do token não encontrado.'}), 401

            # Passa o ID do usuário para a função da rota
            return f(current_user_id, *args, **kwargs)
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado. Por favor, faça login novamente.'}), 401
        except Exception as e:
            # Qualquer outro erro de decodificação ou validação
            return jsonify({'message': f'Token é inválido ou erro: {str(e)}'}), 401

    return decorated

# --- Rotas de Autenticação ---

@app.route('/api/register', methods=['POST'])
def register():
    """
    Registra um novo usuário.
    Espera JSON: { "email": "...", "password": "...", "monthly_budget": X.XX }
    """
    
    # Adicionamos um tratamento mais robusto para a decodificação do JSON.
    try:
        data = request.get_json(force=True, silent=True) # Tenta forçar e silenciar erros de parser
    except Exception as e:
        print(f"Erro ao obter JSON na rota /api/register: {e}")
        return jsonify({'message': 'Requisição malformada. Esperado JSON válido.'}), 400

    # Verifica se os dados principais estão presentes
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email e senha são obrigatórios'}), 400

    email = data.get('email')
    password = data.get('password')
    monthly_budget = data.get('monthly_budget', 0.0)
    
    # Lógica de validação e registro
    if email in users_db:
        return jsonify({'message': 'Usuário já existe. Por favor, faça login.'}), 409

    # Simulação de hash de senha (Em produção, use uma biblioteca como `bcrypt`)
    user_id = str(len(users_db) + 1)
    users_db[user_id] = {
        'id': user_id,
        'email': email,
        'password_hash': password, # MOCK: Armazenando a senha como está
        'monthly_budget': monthly_budget,
        'foods': [] # Lista de alimentos do usuário
    }
    
    # Gera o token JWT para o novo usuário
    token = jwt.encode(
        {'user_id': user_id, 
         'exp': datetime.now(timezone.utc) + timedelta(hours=24)},
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )

    return jsonify({
        'message': 'Usuário registrado com sucesso!', 
        'auth_token': token
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    """
    Faz login de um usuário existente e retorna um token JWT.
    Espera JSON: { "email": "...", "password": "..." }
    """
    try:
        data = request.get_json(force=True, silent=True)
    except Exception:
        return jsonify({'message': 'Requisição malformada. Esperado JSON válido.'}), 400

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Email e senha são obrigatórios para o login'}), 400

    email = data.get('email')
    password = data.get('password')
    
    # Encontra o usuário (MOCK: Itera sobre a simulação de DB)
    user_data = next((user for user in users_db.values() if user['email'] == email), None)

    if not user_data or user_data['password_hash'] != password:
        return jsonify({'message': 'Credenciais inválidas.'}), 401

    # Gera o token JWT
    token = jwt.encode(
        {'user_id': user_data['id'], 
         'exp': datetime.now(timezone.utc) + timedelta(hours=24)},
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )

    return jsonify({
        'message': 'Login realizado com sucesso!', 
        'auth_token': token,
        'user_id': user_data['id']
    }), 200

# --- Rotas Protegidas (Exemplo) ---

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user_id):
    """
    Retorna o perfil do usuário logado.
    """
    user_data = users_db.get(current_user_id)
    if not user_data:
        return jsonify({'message': 'Perfil de usuário não encontrado.'}), 404
        
    # Remove a senha antes de retornar
    profile = user_data.copy()
    profile.pop('password_hash', None)

    return jsonify(profile), 200

# --- Rotas de Alimentos ---

@app.route('/api/food-list', methods=['GET'])
@token_required
def get_food_list(current_user_id):
    """
    Retorna a lista de alimentos cadastrados pelo usuário.
    """
    user_data = users_db.get(current_user_id)
    if not user_data:
        return jsonify({'message': 'Usuário não encontrado.'}), 404
        
    return jsonify(user_data.get('foods', [])), 200

@app.route('/api/food/add', methods=['POST'])
@token_required
def add_food_to_list(current_user_id):
    """
    Adiciona um novo alimento à lista do usuário.
    Espera JSON: { "name": "...", "calories": X, "protein": X.X, "carb": X.X, "fat": X.X }
    """
    try:
        data = request.get_json(force=True, silent=True)
    except Exception:
        return jsonify({'message': 'Requisição malformada. Esperado JSON válido.'}), 400

    required_fields = ['name', 'calories', 'protein', 'carb', 'fat']
    if not data or any(field not in data for field in required_fields):
        return jsonify({'message': 'Todos os campos do alimento são obrigatórios.'}), 400

    new_food = {
        'name': data['name'],
        'calories': int(data['calories']),
        'protein': float(data['protein']),
        'carb': float(data['carb']),
        'fat': float(data['fat']),
        'id': str(len(users_db[current_user_id]['foods']) + 1)
    }

    users_db[current_user_id]['foods'].append(new_food)
    return jsonify({'message': 'Alimento adicionado com sucesso!', 'food': new_food}), 201


@app.route('/api/food/delete/<food_id>', methods=['DELETE'])
@token_required
def delete_food_from_list(current_user_id, food_id):
    """
    Deleta um alimento da lista do usuário pelo ID.
    """
    user_foods = users_db[current_user_id]['foods']
    initial_length = len(user_foods)
    
    # Filtra a lista, removendo o alimento com o ID correspondente
    users_db[current_user_id]['foods'] = [food for food in user_foods if food['id'] != food_id]
    
    if len(users_db[current_user_id]['foods']) < initial_length:
        return jsonify({'message': 'Alimento removido com sucesso!'}), 200
    else:
        return jsonify({'message': 'Alimento não encontrado.'}), 404


# --- Rota Raiz (Saúde) ---
@app.route('/', methods=['GET'])
def health_check():
    """
    Endpoint simples para verificar se o serviço está no ar.
    """
    # Inclui o FRONTEND_URL configurado para fácil diagnóstico
    return jsonify({'status': 'ok', 'service': 'DietPlanner Backend', 'db_users_count': len(users_db), 'frontend_url_config': allowed_origins}), 200

# Permite que o Flask seja executado diretamente (bom para desenvolvimento local)
if __name__ == '__main__':
    # O Render usa a variável de ambiente PORT, mas para teste local
    # definimos um padrão.
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
