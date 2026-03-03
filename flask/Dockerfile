FROM python:3.11-alpine AS builder

RUN apk add --no-cache gcc musl-dev libffi-dev openssl-dev rust cargo

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --no-compile --prefix=/install -r requirements.txt

FROM python:3.11-alpine

RUN addgroup -S flask && adduser -S -G flask -h /app flask

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

RUN chown -R flask:flask /app

USER flask

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:create_app()"]
