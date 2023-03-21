# Branches

* debian-stretch branch will use a newer Ubuntu-version and "patch" telldus-core 
* xenial-branch uses Ubuntu 16.04 where telldus-core works without any special stuff

# Build

> docker build -t telldusdocker .

# Start

> docker run --device=/dev/bus/usb/ -d telldusdocker

OR more dangerously
> docker run --privileged -d telldusdocker

# Exec

> docker exec -it "containerid" tdtool --list

