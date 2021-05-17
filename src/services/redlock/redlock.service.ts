import { Injectable } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import * as Redis from 'ioredis';

export type BooleanResponse = 1 | 0;
@Injectable()
export class RedlockService {
    private readonly redisClient: Redis.Redis;

    constructor(private redisService: RedisService) {
        this.redisClient = this.redisService.getClient();
    }

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
        const lock = await this.redisClient.setnx(resource, date.toString());

        if (lock == 0) {
            return lock;
        }
        await this.expire(resource, timeoutSeconds);
        return lock;
    }

    private expire(resource: string, ttlSecond: number) {
        return this.redisClient.expire(resource, ttlSecond);
    }
}
