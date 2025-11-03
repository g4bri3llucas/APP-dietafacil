# Usa a imagem base oficial do Python 3.11 em uma versão slim (mais leve)
FROM python:3.11-slim

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação (incluindo app.py, modelos, etc.)
COPY . .

# Comando principal para iniciar a aplicação usando gunicorn
# Ele vincula o servidor a 0.0.0.0 (acessível externamente) e à porta $PORT (fornecida pela plataforma)
# Assume-se que o objeto principal da aplicação Flask se chama 'app' no arquivo 'app.py' (app:app)
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]