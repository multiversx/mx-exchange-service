import { Injectable } from '@nestjs/common';
import { CachingService } from '../caching/cache.service';

export type BooleanResponse = 1 | 0;
@Injectable()
export class RedlockService {
    constructor(private readonly cacheService: CachingService) {}
    /**
     * Try to obtain a lock only once. if resource is already locked
     * return without trying
     * @param resource
     * @param timeoutSeconds
     */
    async lockTryOnce(
        resource: string,
        timeoutSeconds: number,
    ): Promise<BooleanResponse> {
        const date = new Date();
        date.setSeconds(date.getSeconds() + timeoutSeconds);
        const lock = await this.cacheService.set(resource, date.toString());

        if (!lock) {
            return 0;
        }
        await this.expire(resource, timeoutSeconds);
        return 1;
    }

    private expire(resource: string, ttlSecond: number) {
        return this.cacheService.delete(resource);
    }
}
