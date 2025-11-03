Usar a imagem oficial do Python, que garante o ambiente correto.

FROM python:3.11-slim

Definir variavel de ambiente para logs (padrao do Python)

ENV PYTHONUNBUFFERED 1

Definir o diretorio de trabalho no container

WORKDIR /usr/src/app

Copiar os requisitos e instalar as dependencias

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

Copiar o restante do codigo da aplicacao

COPY . .

Comando para rodar a aplicacao com Gunicorn, apontando para 'app.py' (modulo) e 'app' (instancia Flask)

CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]