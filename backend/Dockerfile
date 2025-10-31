# 1. Baseado na imagem oficial do Python 3.11
FROM python:3.11-slim

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 2. Instala dependências de sistema (Isso resolve os erros de compilação do bcrypt e psycopg2-binary!)
# O ambiente Docker tem permissão para usar o apt-get
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. Copia o arquivo de requisitos e instala as dependências Python
# Usar a flag --no-cache-dir é uma boa prática para builds menores
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copia o restante do código da aplicação
COPY . .

# Expõe a porta que o seu servidor Gunicorn/Flask estará ouvindo (padrão do Render é 10000, mas 8000/5000 funcionam)
EXPOSE 8000

# 5. Comando para iniciar o servidor.
# O Render injeta automaticamente a variável de ambiente PORT. Gunicorn deve ouvir 0.0.0.0:$PORT
# Este comando deve ser O MESMO que você usava no Render (assumindo que o arquivo principal é 'app.py')
CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "--workers", "4", "app:app"]
