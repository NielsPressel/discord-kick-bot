import { Readable } from 'stream';

export class Watcher {
    stream?: Readable;
    threshold: number = 10000;
    callback?: () => void;

    constructor(stream: Readable, threshold: number, callback: () => void) {
        this.stream = stream;
        this.threshold = threshold;
        this.callback = callback;

        this.stream.addListener('data', this._listener);
    }

    async _listener(chunk: any) {
        const data = new DataView(chunk.buffer);

        var sum = 0.0;
        for (var i = 0; i < chunk.length / 2; i++) {
            sum += Math.pow(data.getInt16(i * 2, true), 2);
        }

        var volumeLevel = Math.sqrt(sum / (chunk.length / 2));
        console.log(volumeLevel);

        if (volumeLevel > this.threshold) {
            this.callback!();
        }
    }

    cancel() {
        this.stream?.removeListener('data', this._listener);
    }
}
