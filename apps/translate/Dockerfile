FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

FROM base AS builder
COPY . .
RUN rm -rf /root/.cache/pip /tmp/pip-* && pip cache purge 2>/dev/null; \
    pip install --no-cache-dir --upgrade 'pip<26' && \
    pip install --no-cache-dir .

FROM base AS runner
RUN groupadd --system --gid 1001 translate && \
    useradd --system --uid 1001 --gid translate translate

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY --chown=translate:translate src/translate/ ./translate/

RUN mkdir -p /home/translate/.cache/huggingface && \
    chown -R translate:translate /home/translate

USER translate:translate

EXPOSE 8000

ENV REDIS_URL=redis://localhost:6379
ENV MODEL_NAME=Hy-MT2-1.8B
ENV QUANTIZATION=int8
ENV HF_HOME=/home/translate/.cache/huggingface

CMD ["python", "-m", "translate.worker"]
