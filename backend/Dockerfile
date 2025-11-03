FROM python:3.11-slim

--- Configuracoes ---

Define variavel de ambiente para logs (padrao do Python)

ENV PYTHONUNBUFFERED 1

Define o diretorio de trabalho no container

WORKDIR /usr/src/app

--- Dependencias ---

Copia e instala as dependencias

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

--- Codigo da Aplicacao ---

Copia o restante do codigo

COPY . .

--- Comando de Inicializacao (CMD) ---

Inicia a aplicacao com Gunicorn, garantindo que aponte para 'app.py:app'

CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]