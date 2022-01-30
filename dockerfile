FROM debian:stretch-slim

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

# Baserat på:
# https://forum.telldus.com/viewtopic.php?f=8&t=4&p=49723&hilit=telldus+core+ubuntu&sid=55e6f99e8ed8d235aec93253a25213e6#p49723
# och
# https://github.com/sel/telldusd-docker

# And install
RUN  apt-get install -y --no-install-recommends \
      libconfuse-common \
      libconfuse1 \
      libftdi1 \
      libtelldus-core2

RUN apt-get download telldus-core 
RUN dpkg -i libconfuse-common_3.2+really3.0+dfsg-1_all.deb && \
    dpkg -i libconfuse1_3.2+really3.0+dfsg-1_amd64.deb* && \
    dpkg --ignore-depends=libconfuse0 -i telldus-core_2.1.2-1_amd64.deb
RUN sed -i 's/\(Depends:.*\)libconfuse0[^,]*/\1libconfuse1 (>= 3.0)/' /var/lib/dpkg/status 
RUN ln -s /usr/lib/x86_64-linux-gnu/libconfuse.so.1 /usr/lib/x86_64-linux-gnu/libconfuse.so.0 

RUN apt-get --fix-broken install -y
    
RUN apt-mark hold libconfuse1 && apt-mark hold telldus-core
COPY tellstick.conf /etc/tellstick.conf

ENTRYPOINT ["/usr/sbin/telldusd", "--nodaemon"]
