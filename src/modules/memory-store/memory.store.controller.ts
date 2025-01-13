import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { Controller, Inject } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairModel } from '../pair/models/pair.model';
import { GlobalState, PairEsdtTokens } from './entities/global.state';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { parseCachedNullOrUndefined } from 'src/utils/cache.utils';
import {
    MEMORY_STORE_CACHE_KEYS,
    MEMORY_STORE_CACHE_PREFIX,
    MEMORY_STORE_UPDATE_EVENTS,
} from './entities/constants';
import {
    UpdatePairPayload,
    UpdateTokenPayload,
} from './entities/update.events.payloads';

@Controller()
export class MemoryStoreController {
    constructor(
        private readonly cacheService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @EventPattern(MEMORY_STORE_UPDATE_EVENTS.PAIR)
    async updatePair(payload: UpdatePairPayload) {
        const pair = await this.getMemoryStoreHash(
            this.getHashKey(MEMORY_STORE_CACHE_KEYS.PAIRS, payload.address),
        );

        if (!pair) {
            this.logger.info(
                `Hash for pair ${payload.address} missing from cache`,
                { context: MemoryStoreController.name },
            );
            return;
        }

        GlobalState.pairsState[payload.address] = new PairModel(pair);

        this.setPairLastUpdate(payload);
    }

    @EventPattern(MEMORY_STORE_UPDATE_EVENTS.PAIR_ESDT_TOKENS)
    async updatePairTokens(pairAddress: string) {
        const pairTokens = await this.getMemoryStoreHash(
            this.getHashKey(
                MEMORY_STORE_CACHE_KEYS.PAIRS_ESDT_TOKENS,
                pairAddress,
            ),
        );

        if (!pairTokens) {
            this.logger.info(
                `Hash for ESDT tokens of pair ${pairAddress} missing from cache`,
                { context: MemoryStoreController.name },
            );
            return;
        }

        GlobalState.pairsEsdtTokens[pairAddress] = new PairEsdtTokens(
            pairTokens,
        );
    }

    @EventPattern(MEMORY_STORE_UPDATE_EVENTS.TOKEN)
    async updateToken(payload: UpdateTokenPayload) {
        const token = await this.getMemoryStoreHash(
            this.getHashKey(MEMORY_STORE_CACHE_KEYS.TOKENS, payload.identifier),
        );

        if (!token) {
            this.logger.info(
                `Hash for token ${payload.identifier} missing from cache`,
                { context: MemoryStoreController.name },
            );
            return;
        }

        GlobalState.tokensState[payload.identifier] = new EsdtToken(token);

        this.setTokenLastUpdate(payload);
    }

    private setPairLastUpdate(payload: UpdatePairPayload): void {
        if (!payload.fieldsType) {
            return;
        }

        const lastUpdate = GlobalState.pairsLastUpdate[payload.address] ?? {
            tokensFarms: 0,
            analytics: 0,
            info: 0,
            prices: 0,
        };
        lastUpdate[payload.fieldsType] = payload.timestamp;

        GlobalState.pairsLastUpdate[payload.address] = lastUpdate;
    }

    private setTokenLastUpdate(payload: UpdateTokenPayload): void {
        if (!payload.fieldsTypes) {
            return;
        }

        const lastUpdate = GlobalState.tokensLastUpdate[payload.identifier] ?? {
            metadata: 0,
            price: 0,
            extra: 0,
        };

        for (const fieldsType of payload.fieldsTypes) {
            lastUpdate[fieldsType] = payload.timestamp;
        }

        GlobalState.tokensLastUpdate[payload.identifier] = lastUpdate;
    }

    private async getMemoryStoreHash(key: string): Promise<object> {
        const result = await this.cacheService.hashGetAllRemote(key);

        if (Object.keys(result).length === 0) {
            return undefined;
        }

        for (const key of Object.keys(result)) {
            result[key] = parseCachedNullOrUndefined(result[key]);
        }

        return result;
    }

    private getHashKey(baseKey: string, key: string): string {
        return `${MEMORY_STORE_CACHE_PREFIX}.${baseKey}.${key}`;
    }
}
