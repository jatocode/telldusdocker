FROM ubuntu:xenial

LABEL version="0.5"
LABEL description="Containerised telldus daemon för hemmabruk"
LABEL maintainer="tobias.jansson@gmail.com"

RUN apt-get update && apt-get upgrade -y
RUN apt-get install curl gnupg -y

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

COPY tellstick.conf /etc/tellstick.conf

ENTRYPOINT ["/usr/sbin/telldusd", "--nodaemon"]

