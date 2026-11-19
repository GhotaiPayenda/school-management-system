# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build the React SPA so the API host can serve the whole app from a
# single origin. The Vercel deployment builds the SPA in its own pipeline and
# uses this image only for /api.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS web

WORKDIR /build/web

COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY web/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: PHP 8.2 + Apache + SQLite.
#
# /data is the only writable persistent location. Mount a disk there and keep
# MERIDIAN_DB_PATH and MERIDIAN_STORAGE_PATH inside it.
# ---------------------------------------------------------------------------
FROM php:8.2-apache

RUN docker-php-ext-install pdo_sqlite \
    && a2enmod rewrite headers expires \
    && rm -rf /var/www/html

WORKDIR /var/www/meridian

COPY api ./api
COPY database ./database
COPY scripts ./scripts
COPY --from=web /build/web/dist ./web/dist
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/meridian.ini
COPY docker/entrypoint.sh /usr/local/bin/meridian-entrypoint

RUN chmod +x /usr/local/bin/meridian-entrypoint \
    && mkdir -p /data/storage \
    && chown -R www-data:www-data /data

ENV MERIDIAN_ENV=production \
    MERIDIAN_DB_PATH=/data/meridian.sqlite \
    MERIDIAN_STORAGE_PATH=/data/storage \
    MERIDIAN_SEED_DEMO=0 \
    MERIDIAN_AUTO_MIGRATE=1

EXPOSE 80
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD php -r "exit(@file_get_contents('http://127.0.0.1:'.(getenv('PORT') ?: '80').'/api/v1/health') === false ? 1 : 0);"

ENTRYPOINT ["meridian-entrypoint"]
CMD ["apache2-foreground"]
