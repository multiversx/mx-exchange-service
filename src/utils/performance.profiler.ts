export class PerformanceProfiler {
    started: number;
    description: string;
    stopped = 0;
    duration = 0;
    constructor(description = '') {
        this.started = Date.now();
        this.description = description;
    }

    start(description = '') {
        this.started = Date.now();
        this.description = description;
    }

    stop(description: string | null = null) {
        this.stopped = Date.now();
        this.duration = this.stopped - this.started;
    }
}
