import { Client } from './deps.ts'
import PQueue from "https://deno.land/x/p_queue@1.0.1/mod.ts"
import { serve } from "https://deno.land/std@0.180.0/http/server.ts";

import { IDevice } from './IDevice.ts'

// Expecting config.json with url to mqtt-server
const config = JSON.parse(await Deno.readTextFile("./config.json"));

const queue = new PQueue({
    concurrency: 1,
})

async function main(serverurl: string, topic_in: string = 'tellstick', topic_out: string = 'tellstick/out', tool: string = 'tdtool') {

    console.log(`Listening on ${serverurl}/${topic_in}/#, using ${tool} for exec`)

    const client = new Client({
        url: serverurl,
    })

    serve(httphandler, { port: config.httpport })

    await client.connect()

    const decoder = new TextDecoder()

    client.on('message', async (topic: string, payload: Uint8Array) => {

        if (payload.length > 0) {
            // /tellstick/in {"cmd":"--on","id":"1234"}
            const jsondata = decoder.decode(payload)
            let data: any;
            try {
                data = JSON.parse(jsondata)
            } catch (e) {
                console.error('Failed to parse ', jsondata);
                return;
            }

            switch (topic) {
                case topic_in:
                    // Run shellcommand
                    await queue.add(() => runShellCommand(tool, data.cmd, data.id, topic_out, client))
                    break
                default:
                    break
            }
        } else {
            // /tellstick/in/1234/on or //tellstick/in/list 

            if (topic.startsWith(topic_in)) {
                if (topic.endsWith('/list')) {
                    await queue.add(() => runShellCommand(tool, '--list', '0', topic_out, client))
                } else {
                    const r = topic.split('/')
                    if (r.length == 4) {
                        const id = r[2]
                        const cmd = '--' + r[3]
                        // Run shellcommand
                        await queue.add(() => runShellCommand(tool, cmd, id, topic_out, client))
                    }
                }
            }
        }
    })

    // Debug
    // queue.addEventListener("idle", () => console.log("All done, no jobs in queue"))
    // queue.addEventListener("active", () => 
    //     console.log(`Running queued cmd. Queue size: ${queue.size}`)
    // )

    await client.subscribe(`${topic_in}/#`)
}

// Run shellcommand function
async function runShellCommand(tool: string, cmd: string, id: string, topic_out: string, client: Client): Promise<boolean> {
    console.log(`Running ${tool} with cmd:${cmd}, on id:${id}`)

    const p = Deno.run({ cmd: [tool, cmd, id], stdout: 'piped', stderr: 'piped' })
    const { code } = await p.status()

    if (code == 0) {
        const rawOutput = await p.output()
        const decoder = new TextDecoder()
        const output = decoder.decode(rawOutput);
        if (cmd == '--list') {
            let devices = await handleListCommand(output);
            if(client && topic_out.length > 0)
                await client.publish(topic_out, JSON.stringify(devices));
        }
    } else {
        console.log(`${tool} exited with code ${code}`)
        return false;
    }

    return true;
}

async function handleListCommand(cmdOutput: string): Promise<IDevice[]> {
    let devices = [];
    for (const row of cmdOutput.split('\n')) {
        let m = row.match(/(\d+)\t(.*)\t(OFF|ON)/);
        if (m && m.length > 0) {
            let device: IDevice = {
                id: m[1],
                name: m[2],
                state: m[3] == 'ON'
            };
            devices.push(device);
        }
    }

    return devices;
}

async function httphandler(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // /api/device/1234/on
    const match = url.pathname.match(/\/api\/device\/(\d+)\/(on|off)/);
    if (match && match.length > 0) {
        const id = match[1]
        const cmd = '--' + match[2]
        await queue.add(() => runShellCommand(config.toolname, cmd, id, '', null))
    }

    return new Response("OK");
}

main(config.mqttserver, config.topic_in, config.topic_out, config.toolname)

