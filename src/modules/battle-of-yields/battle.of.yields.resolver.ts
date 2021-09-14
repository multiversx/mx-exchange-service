import { Inject } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { BattleOfYieldsService } from './battle.of.yields.service';
import { BoYAccount } from './models/BoYAccount.model';

@Resolver()
export class BattleOfYieldsResolver {
    constructor(
        private readonly cachingService: CachingService,
        private readonly boyService: BattleOfYieldsService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Query(results => [BoYAccount])
    async getLeaderBoard(): Promise<BoYAccount[]> {
        const cacheKey = generateCacheKeyFromParams(
            'battleOfYields',
            'leaderBoard',
        );
        const getLeaderBoard = () => this.boyService.computeLeaderBoard();
        try {
            return this.cachingService.getOrSet(
                cacheKey,
                getLeaderBoard,
                oneMinute() * 10,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                BattleOfYieldsResolver.name,
                this.getLeaderBoard.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
