import { RedisCacheService } from '@multiversx/sdk-nestjs-cache';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Controller, Inject } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PairModel } from '../pair/models/pair.model';
import {
    GlobalState,
    GlobalStateInitStatus,
    PairEsdtTokens,
} from './entities/global.state';
import { EsdtToken } from '../tokens/models/esdtToken.model';

@Controller()
export class MemoryStoreController {
    constructor(
        private readonly redisService: RedisCacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @EventPattern('updateMemoryStorePair')
    async updatePair(pairAddress: string) {
        // const profiler = new PerformanceProfiler();

        const pair = await this.redisService.hgetall(
            `memoryStore.pairs.${pairAddress}`,
        );

        GlobalState.pairsState[pairAddress] = new PairModel(pair);

        // profiler.stop();
        // this.logger.info(
        //     `update pair ${pairAddress} in ${profiler.duration}ms`,
        // );
    }

    @EventPattern('updateMemoryStorePairEsdtTokens')
    async updatePairTokens(pairAddress: string) {
        // const profiler = new PerformanceProfiler();

        const pairTokens = await this.redisService.hgetall(
            `memoryStore.pairsEsdtTokens.${pairAddress}`,
        );

        GlobalState.pairsEsdtTokens[pairAddress] = new PairEsdtTokens(
            pairTokens,
        );

        // profiler.stop();
        // this.logger.info(
        //     `update pair tokens ${pairAddress} in ${profiler.duration}ms`,
        // );
    }

    @EventPattern('updateMemoryStoreToken')
    async updateToken(tokenID: string) {
        // const profiler = new PerformanceProfiler();

        const token = await this.redisService.hgetall(
            `memoryStore.tokens.${tokenID}`,
        );

        GlobalState.tokensState[tokenID] = new EsdtToken(token);

        // profiler.stop();
        // this.logger.info(`update token ${tokenID} in ${profiler.duration}ms`);
    }

    @EventPattern('updateMemoryStoreStatus')
    async updateStatus(status: GlobalStateInitStatus) {
        this.logger.info(`---------- UPDATE STATUS TO : ${status} ----------`);

        GlobalState.initStatus = status;
    }
}
