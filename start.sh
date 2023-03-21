#! /bin/sh

/usr/sbin/telldusd 2> /var/log/telldus.log --nodaemon &
/root/.deno/bin/deno run --allow-read --allow-net --allow-run main.ts
