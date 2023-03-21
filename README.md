# Branches

* master is using Ubuntu 16.04 and has a simple MQTT and HTTP interface to access the tellstick with
* debian-stretch branch will use a newer Ubuntu-version and "patch" telldus-core
* xenial-branch uses Ubuntu 16.04 where telldus-core works without any special stuff

# Build

docker-compose build

# Run

docker-compose up -d


# Execute tdtool inside the container from script or such

> docker exec -it "containerid" tdtool --list

# MQTT Interface

Edit config.json, enter a valid MQTT broker and topics to send/listen on
The toolname should be the name of the tool to call, most likely tdtool

The tellstick can be accessed in two ways via MQTT:

1. post to in-topic with payload like {"cmd":"--on","id":"1234"} or {"cmd":"--list"}
2. post to in-topic with path like /in/1234/on, /in/44/off or /in/list

# HTTP interface

VERY crude and simple. Configure a port in config.json and toolname
The tellstick can be accessed via:
GET http://localhost:port/api/device/1234/on or http://localhost:port/api/device/56/off

List devices is not yet supported
