import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-errors';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { BattleOfYieldsService } from './battle.of.yields.service';
import { BattleOfYieldsModel } from './models/battle.of.yields.model';

@Resolver()
export class BattleOfYieldsResolver {
    constructor(
        private readonly cachingService: CachingService,
        private readonly boyService: BattleOfYieldsService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Query(results => BattleOfYieldsModel)
    async getLeaderBoard(): Promise<BattleOfYieldsModel> {
        const cacheKey = generateCacheKeyFromParams(
            'battleOfYields',
            'leaderBoard',
        );
        try {
            return this.cachingService.getCache(cacheKey);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                BattleOfYieldsResolver.name,
                this.getLeaderBoard.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw new ApolloError('');
        }
    }
        }
    }
}
