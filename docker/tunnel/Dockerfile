FROM alpine:3.20

# Switch repository URL to HTTP to avoid TLS cert issues during package install inside Docker Desktop
RUN sed -i 's|https://|http://|g' /etc/apk/repositories && \
    apk add --no-cache curl ca-certificates

# Copy host/corporate CA certificates (such as Avast Web Shield TLS scanning cert) if present
COPY avast-root.crt* /usr/local/share/ca-certificates/
RUN update-ca-certificates

# Copy official cloudflared binary
COPY --from=cloudflare/cloudflared:latest /usr/local/bin/cloudflared /usr/local/bin/cloudflared

# Copy entrypoint script and normalize line endings
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]