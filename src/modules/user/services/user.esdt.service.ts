import { Injectable } from '@nestjs/common';
import { oneSecond } from 'src/helpers/helpers';
import { PaginationArgs } from 'src/modules/dex.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { IEsdtToken } from 'src/modules/tokens/models/esdtToken.interface';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { CachingService } from 'src/services/caching/cache.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { UserToken } from '../models/user.model';
import { UserEsdtComputeService } from './esdt.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

@Injectable()
export class UserEsdtService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly pairService: PairService,
        private readonly tokenService: TokenService,
        private readonly pairGetter: PairGetterService,
        private readonly routerAbi: RouterAbiService,
        private readonly userEsdtCompute: UserEsdtComputeService,
        private readonly cachingService: CachingService,
    ) {}

    private async getUniquePairTokens(): Promise<string[]> {
        return await this.cachingService.getOrSet(
            'uniquePairTokens',
            async () => await this.getUniquePairTokensRaw(),
            oneSecond() * 6,
            oneSecond() * 3,
        );
    }

    private async getUniquePairTokensRaw(): Promise<string[]> {
        const promises = [];
        const [pairsAddresses, uniquePairTokens] = await Promise.all([
            this.routerAbi.pairsAddress(),
            this.tokenService.getUniqueTokenIDs(false),
        ]);

        for (const address of pairsAddresses) {
            promises.push(this.pairGetter.getLpTokenID(address));
        }

        const lpTokensIDs = await Promise.all(promises);
        uniquePairTokens.push(...lpTokensIDs);

        return uniquePairTokens;
    }

    async getAllEsdtTokens(
        userAddress: string,
        pagination: PaginationArgs,
        inputTokens?: IEsdtToken[],
    ): Promise<UserToken[]> {
        const [userTokens, uniquePairTokens] = await Promise.all([
            inputTokens
                ? Promise.resolve(inputTokens)
                : this.apiService.getTokensForUser(
                      userAddress,
                      pagination.offset,
                      pagination.limit,
                  ),
            this.getUniquePairTokens(),
        ]);

        const userPairEsdtTokens = userTokens.filter((token) =>
            uniquePairTokens.includes(token.identifier),
        );
        const promises = userPairEsdtTokens.map((token) => {
            return this.getEsdtTokenDetails(new EsdtToken(token));
        });

        return await Promise.all(promises);
    }

    private async getEsdtTokenDetails(token: EsdtToken): Promise<UserToken> {
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            token.identifier,
        );

        if (pairAddress) {
            const userToken = await this.userEsdtCompute.lpTokenUSD(
                token,
                pairAddress,
            );
            userToken.type = EsdtTokenType.FungibleLpToken;

            return userToken;
        }
        const userToken = await this.userEsdtCompute.esdtTokenUSD(token);

        return userToken;
    }
}
