import { RedlockService } from '@multiversx/sdk-nestjs-cache';
import { delay } from 'src/helpers/helpers';
import { Logger } from 'winston';

interface LockRetryOptions {
    lockKey: string;
    lockName: string;
    keyExpiration?: number;
    maxLockRetries?: number;
    lockRetryInterval?: number;
    maxOperationRetries?: number;
    operationRetryInterval?: number;
}

export async function withLockAndRetry(
    redLockService: RedlockService,
    logger: Logger,
    options: LockRetryOptions,
    operation: () => Promise<void>,
): Promise<void> {
    const {
        lockKey,
        lockName,
        keyExpiration = 60 * 60 * 1000, // Default 1 hour
        maxLockRetries = 5,
        lockRetryInterval = 5000,
        maxOperationRetries = 3,
        operationRetryInterval = 5000,
    } = options;

    const lock = await redLockService.lock(lockKey, lockName, {
        keyExpiration,
        maxRetries: maxLockRetries,
        retryInterval: lockRetryInterval,
    });

    if (!lock) {
        logger.warn(`Failed to acquire lock for ${lockName}`, 'LockRetryUtils');
        return;
    }

    let retryCount = 0;
    let success = false;

    while (!success && retryCount < maxOperationRetries) {
        try {
            await operation();
            success = true;
        } catch (error) {
            retryCount++;
            logger.error(
                `Operation ${lockName} attempt ${retryCount} failed: ${error.message}`,
                'LockRetryUtils',
            );
            if (retryCount < maxOperationRetries) {
                logger.info(
                    `Retrying operation ${lockName} (${retryCount}/${maxOperationRetries})`,
                    'LockRetryUtils',
                );
                await delay(operationRetryInterval);
            }
        }
    }

    await redLockService.release(lockKey, lockName);

    if (!success) {
        logger.error(
            `All retry attempts failed for operation ${lockName}`,
            'LockRetryUtils',
        );
    }
}
