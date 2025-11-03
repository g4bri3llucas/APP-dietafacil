import os
import datetime
import jwt
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# --- Configuração do Banco de Dados e Aplicação ---
# O Render já fornece a variável de ambiente DATABASE_URL automaticamente.
# No ambiente local, ele usará sqlite:///dietapi.db
database_url = os.environ.get('DATABASE_URL', 'sqlite:///dietapi.db')

# Se for um banco de dados PostgreSQL (padrão do Render), ajusta a URL.
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'sua_chave_secreta_padrao_muito_segura')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Configuração de CORS para permitir acesso do seu frontend no Render
# Inclui também o localhost para testes locais.
CORS(app, resources={r"/api/*": {"origins": [
    "https://app-dietafacil-frontend-2pca.onrender.com", 
    "http://localhost:8000",
    "http://localhost:3000"
]}})

# --- Definição do Modelo ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False) # Armazena o hash da senha em um projeto real!
    monthly_budget = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'monthly_budget': self.monthly_budget
        }

# Cria as tabelas do banco de dados (Apenas se o arquivo db não existir ou para novos deploys)
# No Render, este bloco deve ser executado no comando de inicialização.
with app.app_context():
    db.create_all()

# --- Helpers de Autenticação (Simples) ---

def token_required(f):
    def wrapper(*args, **kwargs):
        token = None
        # O token deve vir no header 'Authorization: Bearer <token>'
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token de autenticação ausente!'}), 401

        try:
            # Decodifica o token usando a chave secreta
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.filter_by(email=data['email']).first()
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expirado. Por favor, faça login novamente.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token inválido.'}), 401
        
        return f(current_user, *args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# --- Rotas de Autenticação ---

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # 1. Validação de dados de entrada
        email = data.get('email')
        password = data.get('password')
        monthly_budget = data.get('monthly_budget', 0.0)

        if not email or not password:
            return jsonify({'message': 'Email e senha são obrigatórios'}), 400

        # 2. Verifica se o usuário já existe
        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Usuário já existe'}), 409

        # 3. Cria o novo usuário
        # ATENÇÃO: Em um projeto real, a senha deve ser hasheada (ex: com bcrypt)!
        user = User(
            email=email,
            password=password, # Idealmente, armazene um hash
            monthly_budget=float(monthly_budget)
        )
        db.session.add(user)
        db.session.commit()

        # 4. Geração do Token JWT (o mesmo processo do login)
        token_payload = {
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")
        
        # 5. Resposta de sucesso
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'token': token,
            'profile': user.to_dict()
        }), 201

    except Exception as e:
        # Log do erro para depuração
        print(f"Erro no registro: {e}")
        return jsonify({'message': 'Erro interno do servidor ao registrar.'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Credenciais ausentes'}), 400

    # Busca o usuário pelo email
    user = User.query.filter_by(email=email).first()

    # Em um projeto real, você compararia o hash da senha:
    # if user and bcrypt.check_password_hash(user.password, password):
    if user and user.password == password: # Simples, para fins de demonstração
        # Geração do Token JWT
        token_payload = {
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24) # Expira em 24h
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'message': 'Login bem-sucedido',
            'token': token,
            'profile': user.to_dict()
        }), 200
    
    return jsonify({'message': 'Credenciais inválidas'}), 401

# --- Rotas Protegidas ---

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    # Retorna o perfil do usuário logado
    return jsonify({'profile': current_user.to_dict()}), 200

# Rota de teste simples para verificar se o backend está vivo
@app.route('/', methods=['GET'])
def home():
    return "API DietAFácil está no ar!", 200

# --- Execução do Servidor ---
# No Render, esta parte é executada pelo Gunicorn.
if __name__ == '__main__':
    app.run(debug=True)
