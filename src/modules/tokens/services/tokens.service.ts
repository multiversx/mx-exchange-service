import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { Logger } from 'winston';
import { EsdtToken } from '../models/esdtToken.model';
import { TokensFiltersArgs } from '../models/tokens.filter.args';

@Injectable()
export class TokenService {
    constructor(
        private readonly routerGetter: RouterGetterService,
        private readonly apiService: ElrondApiService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        let tokenIDs = await this.getUniqueTokenIDs();
        if (filters.identifiers && filters.identifiers.length > 0) {
            tokenIDs = tokenIDs.filter(tokenID =>
                filters.identifiers.includes(tokenID),
            );
        }

        const promises = tokenIDs.map(tokenID =>
            this.apiService.getToken(tokenID),
        );
        return await Promise.all(promises);
    }

    private async getUniqueTokenIDs(): Promise<string[]> {
        const pairsMetadata = await this.routerGetter.getPairsMetadata();
        const tokenIDs: string[] = [];
        for (const iterator of pairsMetadata) {
            tokenIDs.push(...[iterator.firstTokenID, iterator.secondTokenID]);
        }

        return [...new Set(tokenIDs)];
    }
}
