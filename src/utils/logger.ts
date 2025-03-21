import { config } from '../config.js';
import { Writable } from 'stream';

class Logger {
    private static outputStream: Writable = process.stdout;

    static setOutputStream(stream: Writable) {
        this.outputStream = stream;
    }

    static debug(message: string, ...args: any[]) {
        if (config.server.enableDebugLogging) {
            this.outputStream.write(`[DEBUG] ${message} ${args.join(' ')}\n`);
        }
    }

    static info(message: string, ...args: any[]) {
        this.outputStream.write(`[INFO] ${message} ${args.join(' ')}\n`);
    }

    static warn(message: string, ...args: any[]) {
        this.outputStream.write(`[WARN] ${message} ${args.join(' ')}\n`);
    }

    static error(message: string, ...args: any[]) {
        this.outputStream.write(`[ERROR] ${message} ${args.join(' ')}\n`);
    }

    static close() {
        // Only close if it's not stdout/stderr
        if (this.outputStream !== process.stdout && this.outputStream !== process.stderr) {
            this.outputStream.end();
        }
    }
}

export { Logger };