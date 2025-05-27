FROM oven/bun:debian
RUN rm -f /etc/apt/sources.list
RUN rm -f /etc/apt/sources.list.d/debian.sources
RUN echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main contrib non-free non-free-firmware" >> /etc/apt/sources.list 
RUN echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list 
RUN echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-backports main contrib non-free non-free-firmware" >> /etc/apt/sources.list 
RUN echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list 
RUN apt-get update && \
    apt-get install -y \
    wget \
    gnupg \
    nodejs \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    npm \
    firefox-esr \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/firefox
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /data \
    && chown -R pptruser:pptruser /data
USER pptruser
ENV TZ=Asia/Shanghai
WORKDIR /data
ENTRYPOINT [ "bun", "start" ]