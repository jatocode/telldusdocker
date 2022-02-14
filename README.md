# Build

docker build -t telldusdocker .

# Start

docker run --privileged -it telldusdocker

# Exec

docker exec -it <containerid> tdtool --list

