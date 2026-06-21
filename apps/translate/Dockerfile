FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

FROM base AS builder
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

FROM base AS runner
RUN groupadd --system --gid 1001 translate && \
    useradd --system --uid 1001 --gid translate translate

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --chown=translate:translate src/ ./src/

USER translate:translate

EXPOSE 8000

ENV REDIS_URL=redis://localhost:6379
ENV MODEL_NAME=facebook/m2m100_418M
ENV QUANTIZATION=int8

CMD ["python", "-m", "translate.worker"]
