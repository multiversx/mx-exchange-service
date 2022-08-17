import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { TokenComputeService } from './token.compute.service';
import { TokenRepositoryService } from './token.repository.service';

@Injectable()
export class TokenGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly tokenRepositoryService: TokenRepositoryService,
        private readonly tokenCompute: TokenComputeService,
    ) {
        super(cachingService, logger);
    }

    async getEsdtTokenType(tokenID: string): Promise<string> {
        return await this.getData(
            this.getTokenCacheKey(tokenID, 'type'),
            () => this.tokenRepositoryService.getTokenType(tokenID),
            oneSecond(),
        );
    }

    async getDerivedEGLD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getTokenCacheKey(tokenID, 'derivedEGLD'),
            () => this.tokenCompute.computeTokenPriceDerivedEGLD(tokenID),
            oneSecond() * 12,
        );
    }

    async getDerivedUSD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getTokenCacheKey(tokenID, 'derivedUSD'),
            () => this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
            oneSecond() * 12,
        );
    }

    private getTokenCacheKey(tokenID: string, ...args: any): string {
        return generateCacheKeyFromParams('token', tokenID, args);
    }
}
