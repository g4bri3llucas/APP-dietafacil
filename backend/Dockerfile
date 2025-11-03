# Usa a imagem base oficial do Python 3.11 em uma versão slim (mais leve)
FROM python:3.11-slim

# Define o diretório de trabalho dentro do container (onde o app.py está)
WORKDIR /usr/src/app

# Copia e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação
COPY . .

# Comando principal para iniciar a aplicação usando gunicorn de forma explícita.
# Este comando força o gunicorn a procurar 'app' dentro do módulo 'app.py' 
# e escutar na porta correta fornecida pela plataforma ($PORT).
CMD exec gunicorn --bind 0.0.0.0:$PORT app:app
