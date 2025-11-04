import React, { useState, useEffect } from 'react';

// URL base do seu backend. Mantenha 'http://localhost:5000' para testes locais.
// Se você estiver implantando, substitua por sua URL do Render!
const API_BASE_URL = 'http://localhost:5000/api';

// Componente para a tela de Login
const LoginForm = ({ setToken, setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        // Login bem-sucedido
        localStorage.setItem('authToken', data.token);
        setToken(data.token);
      } else {
        // Exibe a mensagem de erro da API
        setError(data.message || 'Erro ao fazer login.');
      }
    } catch (err) {
      setLoading(false);
      setError('Erro de conexão. Verifique se o backend está rodando.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
      <h2 className="text-3xl font-extrabold text-center text-gray-900">Acesso DietaFácil</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition duration-150 ease-in-out font-semibold disabled:bg-emerald-300 shadow-md"
        >
          {loading ? 'Aguarde...' : 'Entrar'}
        </button>
      </form>
      <div className="text-center">
        <button 
          onClick={() => setView('register')}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition duration-150"
        >
          Não tem conta? Cadastre-se
        </button>
      </div>
    </div>
  );
};

// Componente para a tela de Registro
const RegisterForm = ({ setToken, setView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [budget, setBudget] = useState(0.0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          monthly_budget: parseFloat(budget) 
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        // Registro e login bem-sucedidos (o backend já retorna o token)
        localStorage.setItem('authToken', data.token);
        setToken(data.token);
      } else {
        setError(data.message || 'Erro ao registrar.');
      }
    } catch (err) {
      setLoading(false);
      setError('Erro de conexão. Verifique se o backend está rodando.');
      console.error('Register error:', err);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-2xl">
      <h2 className="text-3xl font-extrabold text-center text-gray-900">Novo Cadastro</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && <p className="text-red-600 text-center font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Orçamento Mensal (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="0.00"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition duration-150 ease-in-out font-semibold disabled:bg-emerald-300 shadow-md"
        >
          {loading ? 'Aguarde...' : 'Registrar'}
        </button>
      </form>
      <div className="text-center">
        <button 
          onClick={() => setView('login')}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition duration-150"
        >
          Já tenho conta. Fazer Login
        </button>
      </div>
    </div>
  );
};

// Componente para o Dashboard/Perfil (Rota Protegida)
const ProfileDashboard = ({ token, setToken }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setLoading(false);

        if (response.ok) {
          setProfile(data.profile);
        } else {
          // Se o token for inválido/expirado, desloga o usuário
          setError(data.message || 'Sessão expirada. Faça login novamente.');
          handleLogout();
        }
      } catch (err) {
        setLoading(false);
        setError('Erro de conexão ao buscar o perfil.');
        console.error('Profile fetch error:', err);
      }
    };

    fetchProfile();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  if (loading) {
    return (
      <div className="text-center p-8 bg-white rounded-xl shadow-lg">
        <svg className="animate-spin h-5 w-5 text-emerald-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-gray-700">Carregando perfil...</p>
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center p-8 bg-red-100 text-red-800 rounded-xl shadow-lg">Erro: {error}</div>;
  }

  return (
    <div className="w-full max-w-xl p-8 space-y-8 bg-white rounded-xl shadow-2xl">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-3xl font-extrabold text-emerald-700">Meu Painel DietaFácil</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition duration-150 shadow-md"
        >
          Sair
        </button>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500 shadow-sm">
          <p className="text-lg font-semibold text-gray-700">Bem-vindo(a), {profile.email}!</p>
          <p className="text-sm text-gray-500">Seu ID de Usuário: {profile.id}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-blue-50 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-blue-700 mb-2">Orçamento Mensal</h3>
            <p className="text-3xl font-extrabold text-blue-600">
              R$ {profile.monthly_budget.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-gray-500 mt-1">Este é o seu limite mensal para compras de dieta.</p>
          </div>
          
          <div className="p-6 bg-yellow-50 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-yellow-700 mb-2">Próxima Funcionalidade</h3>
            <p className="text-base text-gray-700">
              Implemente o CRUD de `Expense` (Despesas) aqui para gerenciar seus gastos.
            </p>
            <p className="text-sm text-gray-500 mt-1">Rota: `/api/expenses`</p>
          </div>
        </div>
      </div>
    </div>
  );
};


// Componente principal da aplicação
const App = () => {
  // Tenta carregar o token do localStorage na inicialização
  const initialToken = localStorage.getItem('authToken');
  const [token, setToken] = useState(initialToken);
  const [view, setView] = useState(initialToken ? 'dashboard' : 'login'); // Roteamento simples

  // Verifica o estado do token e muda a view
  useEffect(() => {
    if (token) {
      setView('dashboard');
    } else {
      // Garante que a view inicial seja Login/Register se não houver token
      if (view === 'dashboard') {
        setView('login');
      }
    }
  }, [token]);

  // Função para renderizar a view correta
  const renderView = () => {
    switch (view) {
      case 'register':
        return <RegisterForm setToken={setToken} setView={setView} />;
      case 'dashboard':
        return <ProfileDashboard token={token} setToken={setToken} />;
      case 'login':
      default:
        return <LoginForm setToken={setToken} setView={setView} />;
    }
  };

  // Carrega o Tailwind CSS via CDN e define a fonte Inter
  return (
    <>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            background-color: #f7fbfd; /* Fundo leve para contraste */
          }
        `}
      </style>
      <div className="min-h-screen flex items-center justify-center p-4">
        {renderView()}
      </div>
    </>
  );
};

export default App;
