Usar uma imagem base oficial do Python

FROM python:3.11-slim

Definir variáveis de ambiente

ENV PYTHONUNBUFFERED 1

Criar e definir o diretório de trabalho dentro do container

WORKDIR /usr/src/app

Copiar os arquivos de requisitos e instalar dependências

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

Copiar o restante do código da aplicação

COPY . .

Comando de inicialização, usando a variável de ambiente $PORT fornecida pelo Render

CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]