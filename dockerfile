FROM debian:jessie

LABEL version="0.2"
LABEL description="Containerised telldus daemon för hemmabruk"
LABEL maintainer="tobias.jansson@gmail.com"

RUN apt-get update && apt-get upgrade -y
RUN apt-get install curl gnupg -y

# Add public key for telldus
RUN curl http://download.telldus.com/debian/telldus-public.key > telldus-public.key
RUN apt-key add telldus-public.key

# Add source
RUN echo "deb http://download.telldus.com/debian/ stable main" >> /etc/apt/sources.list

RUN apt-get update

# And install
RUN  apt-get install telldus-core -y

COPY tellstick.conf /etc/tellstick.conf

ENTRYPOINT ["/usr/sbin/telldusd", "--nodaemon"]
