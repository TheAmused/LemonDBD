# nginx/Dockerfile
FROM nginx:1.31-alpine3.24

# Install OpenSSL
RUN apk add --no-cache openssl

# Generate self-signed SSL certificate for localhost automatically
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/localhost.key \
    -out /etc/nginx/certs/localhost.crt \
    -subj "/CN=localhost/O=LemonDBD/C=US"

# Ensure real log files exist in /var/log/nginx (replacing alpine base stdout/stderr symlinks)
RUN mkdir -p /var/log/nginx && \
    rm -f /var/log/nginx/access.log /var/log/nginx/error.log && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /var/log/nginx

COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Run as the unprivileged `nginx` user instead of root (the layout nginx-unprivileged uses): no
# `user` switch, the pid file and temp dirs somewhere that user can write, and the key it reads.
# Docker lets a non-root process bind 80/443 inside the container (ip_unprivileged_port_start=0,
# set explicitly in docker-compose.base.yml).
RUN sed -i -e '/^user /d' -e 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf && \
    chown -R nginx:nginx /var/cache/nginx /etc/nginx/certs && \
    chmod 600 /etc/nginx/certs/localhost.key
USER nginx

EXPOSE 80 443

# Answered by the plain-HTTP localhost server (location /nginx-health in default.conf).
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD wget -q -O /dev/null --header "Host: localhost" http://127.0.0.1/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
