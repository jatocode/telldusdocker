FROM ubuntu:xenial AS telldus

LABEL version="2.2"
LABEL description="Containerised telldus daemon. Answers on mqtt"
LABEL maintainer="tobias.jansson@gmail.com"

RUN apt-get update && apt-get upgrade -y ; \
    apt-get install curl gnupg unzip dos2unix -y

# Add public key for telldus
RUN curl http://download.telldus.com/debian/telldus-public.key | apt-key add -

# Add source
RUN echo "deb http://download.telldus.com/debian/ stable main" >> /etc/apt/sources.list

RUN apt-get update ; \
    apt-get install -y --no-install-recommends \
      libftdi1 \
      libtelldus-core2 \
      telldus-core

# Install deno runtime
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

EXPOSE 1993
WORKDIR /app

COPY start.sh src/. ./
RUN /root/.deno/bin/deno cache main.ts

RUN chmod +x start.sh && \
    dos2unix start.sh

ENTRYPOINT ["./start.sh"]
