import { Logger } from '@nestjs/common';
import { PerformanceProfiler } from './performance.profiler';

export class Locker {
    private static lockArray: string[] = [];

    static async lock(key: string, func: () => Promise<void>) {
        const logger = new Logger('Lock');

        if (Locker.lockArray.includes(key)) {
            logger.log(`${key} is already running`);
            return;
        }

        Locker.lockArray.push(key);

        const profiler = new PerformanceProfiler();

        try {
            await func();
        } catch (error) {
            logger.error(`Error running ${key}`);
            logger.error(error);
        } finally {
            profiler.stop(`Running ${key}`);
            const index = Locker.lockArray.indexOf(key);
            if (index > -1) {
                Locker.lockArray.splice(index, 1);
            }
        }
    }
}
