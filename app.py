import os
import datetime
import jwt
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# --- Configuração da Aplicação ---
database_url = os.environ.get('DATABASE_URL', 'sqlite:///dietapi.db')

# Ajusta a URL para PostgreSQL (se estiver usando)
if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'sua_chave_secreta_padrao_muito_segura')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Configuração de CORS (ORIGENS PERMITIDAS)
# ATENÇÃO: Verifique manualmente as aspas aqui para evitar SyntaxError!
CORS(app, resources={r"/api/*": {"origins": [
    "https://app-dietafacil-production.up.railway.app",
    "http://localhost:8000",
    "http://localhost:3000"
]}})

# --- Definição dos Modelos ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    monthly_budget = db.Column(db.Float, default=0.0)
    expenses = db.relationship('Expense', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'monthly_budget': self.monthly_budget
        }

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date_incurred = db.Column(db.Date, default=datetime.date.today, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'description': self.description,
            'amount': self.amount,
            'date_incurred': self.date_incurred.isoformat()
        }

# Cria as tabelas
with app.app_context():
    db.create_all()

# --- Helpers de Autenticação ---

def token_required(f):
    def wrapper(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token de autenticação ausente!'}), 401

        try:
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
        
        email = data.get('email')
        password = data.get('password')
        monthly_budget = data.get('monthly_budget', 0.0)

        if not email or not password:
            return jsonify({'message': 'Email e senha são obrigatórios'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'message': 'Usuário já existe'}), 409

        user = User(
            email=email,
            password=password,
            monthly_budget=float(monthly_budget)
        )
        db.session.add(user)
        db.session.commit()

        token_payload = {
            'email': user.email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")
        
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

    if user and user.password == password:
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

# --- Rotas Protegidas e CRUD ---

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return jsonify({'profile': current_user.to_dict()}), 200

@app.route('/api/expenses', methods=['POST', 'GET'])
@token_required
def expenses(current_user):
    if request.method == 'GET':
        try:
            expenses_list = Expense.query.filter_by(user_id=current_user.id).order_by(Expense.date_incurred.desc()).all()
            return jsonify([expense.to_dict() for expense in expenses_list]), 200
        except Exception as e:
            return jsonify({'message': 'Erro interno ao listar despesas.'}), 500

    elif request.method == 'POST':
        try:
            data = request.get_json()
            description = data.get('description')
            amount = data.get('amount')
            date_str = data.get('date_incurred')

            if not description or amount is None:
                return jsonify({'message': 'Descrição e valor são obrigatórios.'}), 400

            try:
                date_incurred = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            except:
                date_incurred = datetime.date.today()
            
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
            return jsonify({'message': 'Erro interno ao criar despesa.'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def expense_detail(current_user, expense_id):
    expense = Expense.query.filter_by(id=expense_id, user_id=current_user.id).first()

    if not expense:
        return jsonify({'message': 'Despesa não encontrada ou acesso negado.'}), 404

    if request.method == 'GET':
        return jsonify(expense.to_dict()), 200

    elif request.method == 'PUT':
        try:
            data = request.get_json()
            
            if 'description' in data:
                expense.description = data['description']
            if 'amount' in data:
                expense.amount = float(data['amount'])
            if 'date_incurred' in data:
                try:
                    expense.date_incurred = datetime.datetime.strptime(data['date_incurred'], '%Y-%m-%d').date()
                except:
                    pass 

            db.session.commit()
            return jsonify({
                'message': 'Despesa atualizada com sucesso.',
                'expense': expense.to_dict()
            }), 200
        except Exception as e:
            return jsonify({'message': 'Erro interno ao atualizar despesa.'}), 500

    elif request.method == 'DELETE':
        try:
            db.session.delete(expense)
            db.session.commit()
            return jsonify({'message': 'Despesa removida com sucesso.'}), 200
        except Exception as e:
            return jsonify({'message': 'Erro interno ao deletar despesa.'}), 500

@app.route('/', methods=['GET'])
def home():
    return "API DietAFácil está no ar!", 200

# --- Execução do Servidor ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000)) 
    app.run(debug=True, host='0.0.0.0', port=port)