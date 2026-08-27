# nginx/Dockerfile
FROM nginx:alpine

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

COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
