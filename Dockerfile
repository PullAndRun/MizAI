FROM oven/bun:alpine
RUN rm /etc/apk/repositories
RUN echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.17/main" >> /etc/apk/repositories
RUN echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.17/community" >> /etc/apk/repositories
RUN apk update && \
    apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true