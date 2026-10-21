# docker/tunnel/Dockerfile
FROM alpine:3.24

# Trust a host/corporate CA (such as Avast Web Shield's TLS scanning certificate) when one is
# present, *before* the first download, so apk can keep using HTTPS behind an intercepting proxy.
# (It used to switch the package mirrors to plain HTTP instead.)
COPY avast-root.crt* /usr/local/share/ca-certificates/
RUN for cert in /usr/local/share/ca-certificates/*.crt; do \
      [ -f "$cert" ] && cat "$cert" >> /etc/ssl/certs/ca-certificates.crt; \
    done; \
    apk add --no-cache curl ca-certificates && update-ca-certificates

# Official cloudflared binary, pinned to a release.
COPY --from=cloudflare/cloudflared:2026.10.1 /usr/local/bin/cloudflared /usr/local/bin/cloudflared

# Copy entrypoint script and normalize line endings
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]