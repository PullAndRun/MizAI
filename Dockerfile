FROM oven/bun:alpine
RUN rm /etc/apk/repositories
RUN echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.17/main" >> /etc/apk/repositories
RUN echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.17/community" >> /etc/apk/repositories
RUN apk update
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN yarn add puppeteer@24.9.0
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads /app /data \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app \
    && chown -R pptruser:pptruser /data
USER pptruser
ENV TZ=Asia/Shanghai
WORKDIR /data
ENTRYPOINT [ "bun", "start" ]