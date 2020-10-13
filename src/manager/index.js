import { argv } from 'yargs';
import { spawn } from 'child_process';
import { sleep } from "@/novusphere-js/utility";


(async function () {

    const queue = [
        { name: `w`, cmd: `npm run watcher` },
        { name: `s`, cmd: `npm run ${argv.server}` }
    ];

    for (; ;) {

        if (queue.length == 0) {
            await sleep(10000);
            continue;
        }

        const { name, cmd } = queue.pop();
        const p = spawn(cmd, { shell: true });
        p.on('exit', function (code, signal) {
            console.log(`[${name}] process exited with code ${code} and signal ${signal}`);
            queue.push({ name, cmd });
        });
        p.stdout.on('data', (data) => {
            console.log(`[${name}] ${data}`);
        });
        p.stderr.on('data', (data) => {
            console.error(`[${name}] ${data}`);
        });
    }




})();