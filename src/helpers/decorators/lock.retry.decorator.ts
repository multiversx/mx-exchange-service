import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { withLockAndRetry } from 'src/utils/lock.retry.utils';
import { Logger } from 'winston';

export function LockAndRetry(options: {
    lockKey: string;
    lockName: string;
    keyExpiration?: number;
    maxLockRetries?: number;
    lockRetryInterval?: number;
    maxOperationRetries?: number;
    operationRetryInterval?: number;
}) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const redLockService = this.redLockService as RedlockService;
            const logger = this.logger as Logger;

            if (!redLockService || !logger) {
                throw new Error(
                    'Class must have redLockService and logger properties',
                );
            }

            await withLockAndRetry(
                redLockService,
                logger,
                options,
                async () => {
                    await originalMethod.apply(this, args);
                },
            );
        };

        return descriptor;
    };
}
