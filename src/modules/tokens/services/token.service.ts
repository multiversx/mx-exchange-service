import { Injectable } from '@nestjs/common';
import { EsdtToken } from '../models/esdtToken.model';
import { TokensFiltersArgs } from '../models/tokens.filter.args';
import { TokenGetterService } from './token.getter.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

@Injectable()
export class TokenService {
    constructor(
        private readonly tokenGetter: TokenGetterService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
    ) {}

    async getTokens(filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        let tokenIDs = await this.getUniqueTokenIDs(filters.enabledSwaps);
        if (filters.identifiers && filters.identifiers.length > 0) {
            tokenIDs = tokenIDs.filter((tokenID) =>
                filters.identifiers.includes(tokenID),
            );
        }

        const promises = tokenIDs.map((tokenID) =>
            this.tokenGetter.getTokenMetadata(tokenID),
        );
        let tokens = await Promise.all(promises);

        if (filters.type) {
            for (const token of tokens) {
                token.type = await this.tokenGetter.getEsdtTokenType(
                    token.identifier,
                );
            }
            tokens = tokens.filter((token) => token.type === filters.type);
        }

        return tokens;
    }

    async getUniqueTokenIDs(activePool: boolean): Promise<string[]> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const tokenIDs: string[] = [];
        await Promise.all(
            pairsMetadata.map(async (iterator) => {
                if (activePool) {
                    const state = await this.pairAbi.state(iterator.address);
                    if (state !== 'Active') {
                        return;
                    }
                }
                tokenIDs.push(
                    ...[iterator.firstTokenID, iterator.secondTokenID],
                );
            }),
        );
        return [...new Set(tokenIDs)];
    }
}
