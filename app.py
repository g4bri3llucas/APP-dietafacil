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

# --- Definição dos Modelos ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    # Armazena o hash da senha em um projeto real!
    password = db.Column(db.String(80), nullable=False) 
    monthly_budget = db.Column(db.Float, default=0.0)
    
    # Relacionamento com as despesas
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'monthly_budget': self.monthly_budget
        }

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Chave estrangeira ligando a despesa ao usuário
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) 
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    # Armazena a data em que a despesa foi incorrida
    date_incurred = db.Column(db.Date, default=datetime.date.today, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'description': self.description,
            'amount': self.amount,
            # Converte a data para string no formato ISO para fácil uso no JavaScript
            'date_incurred': self.date_incurred.isoformat() 
        }

# Cria as tabelas do banco de dados (Deve ser executado no comando de inicialização)
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
# (As rotas register e login permanecem as mesmas)

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
        user = User(
            email=email,
            password=password, # Idealmente, armazene um hash
            monthly_budget=float(monthly_budget)
        )
        db.session.add(user)
        db.session.commit()

        # 4. Geração do Token JWT
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
        print(f"Erro no registro: {e}")
        return jsonify({'message': 'Erro interno do servidor ao registrar.'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'message': 'Credenciais ausentes'}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.password == password: # Simples, para fins de demonstração
        # Geração do Token JWT
        token_payload = {
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24) 
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

# --- Rotas CRUD de Despesas (Expenses) ---

# Rota 1: Criar (POST) e Listar (GET) Despesas
@app.route('/api/expenses', methods=['POST', 'GET'])
@token_required
def expenses(current_user):
    # LISTAR DESPESAS (GET)
    if request.method == 'GET':
        try:
            # Busca todas as despesas do usuário atual, ordenadas pela data
            expenses_list = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date_incurred.desc()).all()
            
            # Serializa a lista de objetos Expense para JSON
            return jsonify([expense.to_dict() for expense in expenses_list]), 200
        except Exception as e:
            print(f"Erro ao listar despesas: {e}")
            return jsonify({'message': 'Erro interno ao listar despesas.'}), 500

    # CRIAR DESPESA (POST)
    elif request.method == 'POST':
        try:
            data = request.get_json()
            description = data.get('description')
            amount = data.get('amount')
            date_str = data.get('date_incurred')

            if not description or amount is None:
                return jsonify({'message': 'Descrição e valor são obrigatórios.'}), 400

            # Converte a string de data para objeto Date
            try:
                date_incurred = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            except:
                date_incurred = datetime.date.today() # Usa a data atual como fallback
            
            # Cria o novo objeto Expense
            new_expense = Expense(
                user_id=current_user.id,
                description=description,
                amount=float(amount),
                date_incurred=date_incurred
            )
            
            db.session.add(new_expense)
            db.session.commit()
            
            return jsonify({
                'message': 'Despesa criada com sucesso!',
                'expense': new_expense.to_dict()
            }), 201

        except Exception as e:
            print(f"Erro ao criar despesa: {e}")
            return jsonify({'message': 'Erro interno ao criar despesa.'}), 500

# Rota 2: Obter, Atualizar (PUT) e Deletar (DELETE) Despesa por ID
@app.route('/api/expenses/<int:expense_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def expense_detail(current_user, expense_id):
    # Busca a despesa e garante que ela pertence ao usuário logado
    expense = Expense.query.filter_by(id=expense_id, user_id=current_user.id).first()

    if not expense:
        return jsonify({'message': 'Despesa não encontrada ou acesso negado.'}), 404

    # OBTER DETALHE (GET) - Opcional, mas bom para consistência
    if request.method == 'GET':
        return jsonify(expense.to_dict()), 200

    # ATUALIZAR DESPESA (PUT)
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            
            # Atualiza apenas os campos fornecidos
            if 'description' in data:
                expense.description = data['description']
            if 'amount' in data:
                expense.amount = float(data['amount'])
            if 'date_incurred' in data:
                try:
                    expense.date_incurred = datetime.datetime.strptime(data['date_incurred'], '%Y-%m-%d').date()
                except:
                    # Ignora se a data for inválida, não altera
                    pass 

            db.session.commit()
            return jsonify({
                'message': 'Despesa atualizada com sucesso.',
                'expense': expense.to_dict()
            }), 200
        except Exception as e:
            print(f"Erro ao atualizar despesa: {e}")
            return jsonify({'message': 'Erro interno ao atualizar despesa.'}), 500

    # DELETAR DESPESA (DELETE)
    elif request.method == 'DELETE':
        try:
            db.session.delete(expense)
            db.session.commit()
            return jsonify({'message': 'Despesa removida com sucesso.'}), 200
        except Exception as e:
            print(f"Erro ao deletar despesa: {e}")
            return jsonify({'message': 'Erro interno ao deletar despesa.'}), 500

# Rota de teste simples para verificar se o backend está vivo
@app.route('/', methods=['GET'])
def home():
    return "API DietAFácil está no ar!", 200

# --- Execução do Servidor ---
if __name__ == '__main__':
    # 1. Obtém a porta da variável de ambiente 'PORT' (padrão de deploy)
    # 2. Usa 5000 como fallback para desenvolvimento local.
    port = int(os.environ.get('PORT', 5000)) 
    
    # Roda o servidor acessível publicamente (host='0.0.0.0') na porta definida.
    app.run(debug=True, host='0.0.0.0', port=port)