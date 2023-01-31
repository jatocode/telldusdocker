FROM ubuntu:xenial AS telldus

LABEL version="1.0"
LABEL description="Containerised telldus daemon för hemmabruk"
LABEL maintainer="tobias.jansson@gmail.com"

RUN apt-get update && apt-get upgrade -y
RUN apt-get install curl gnupg unzip dos2unix -y

# Add public key for telldus
RUN curl http://download.telldus.com/debian/telldus-public.key | apt-key add -

# Add source
RUN echo "deb http://download.telldus.com/debian/ stable main" >> /etc/apt/sources.list

RUN apt-get update

# And install
RUN  apt-get install -y --no-install-recommends \
      libftdi1 \
      libtelldus-core2

RUN apt-get install -y telldus-core

# We want deno
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

# Start Deno app
EXPOSE 1993

WORKDIR /app

ADD src/. .
RUN /root/.deno/bin/deno cache main.ts

ADD . .
RUN chmod +x start.sh && \
    dos2unix start.sh

ENTRYPOINT ["./start.sh"]

