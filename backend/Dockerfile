Use an official Python base image

FROM python:3.11-slim

Define environment variables

ENV PYTHONUNBUFFERED 1

Create and set the working directory inside the container

WORKDIR /usr/src/app

Copy requirement files and install dependencies

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

Copy the rest of the application code

COPY . .

Start command, using the $PORT environment variable provided by Render

CMD ["gunicorn", "--bind", "0.0.0.0:$PORT", "app:app"]