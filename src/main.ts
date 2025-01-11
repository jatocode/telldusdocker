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

    serve(httpHandler, { port: config.httpport })

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
            let devices = await parseListResult(output);
            await client.publish(topic_out, JSON.stringify(devices));
        }
    } else {
        console.log(`${tool} exited with code ${code}`)
        return false;
    }

    return true;
}

async function parseListResult(cmdOutput: string): Promise<IDevice[]> {
    let devices:IDevice[] = [];
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

async function runCommand(tool: string, args: string[]): Promise<string> {
    const p = Deno.run({ cmd: [tool, ...args], stdout: 'piped' });
    const output = await p.output();
    const decoder = new TextDecoder();
    return decoder.decode(output);
}

async function httpHandler(req: Request): Promise<Response> {

    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/devices') {
        const output = await runCommand(config.toolname, ['--list', '0']);
        const devices = await parseListResult(output);
        return new Response(JSON.stringify(devices), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (req.method === 'GET' && path.startsWith('/device/')) {
        const id = path.split('/')[2];
        const output = await runCommand(config.toolname, ['--list', '0']);
        const devices = await parseListResult(output);
        const device = devices.find(d => d.id === id);
        if (device) {
            return new Response(JSON.stringify(device), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
            return new Response('Device not found', { status: 404 });
        }
    }

    if (req.method === 'POST' && path.startsWith('/device/')) {
        const id = path.split('/')[2];
        const body = await req.json();
        const cmd = body.state ? '--on' : '--off';
        const success = await runShellCommand(config.toolname, cmd, id, config.topic_out, new Client({ url: config.mqttserver }));
        if (success) {
            return new Response('Device status updated', { status: 200 });
        } else {
            return new Response('Failed to update device status', { status: 500 });
        }
    }

    return new Response('Not Found', { status: 404 });

}

main(config.mqttserver, config.topic_in, config.topic_out, config.toolname)

