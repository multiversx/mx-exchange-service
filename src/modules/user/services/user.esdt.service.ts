import { Injectable } from '@nestjs/common';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PaginationArgs } from 'src/modules/dex.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { IEsdtToken } from 'src/modules/tokens/models/esdtToken.interface';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { UserToken } from '../models/user.model';
import { UserEsdtComputeService } from './esdt.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';

@Injectable()
export class UserEsdtService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly pairService: PairService,
        private readonly tokenService: TokenService,
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly userEsdtCompute: UserEsdtComputeService,
    ) {}

    @GetOrSetCache({
        baseKey: 'user',
        remoteTtl: Constants.oneSecond() * 6,
    })
    private async uniquePairTokens(): Promise<string[]> {
        return await this.getUniquePairTokensRaw();
    }

    private async getUniquePairTokensRaw(): Promise<string[]> {
        const promises = [];
        const [pairsAddresses, uniquePairTokens] = await Promise.all([
            this.routerAbi.pairsAddress(),
            this.tokenService.getUniqueTokenIDs(false),
        ]);

        for (const address of pairsAddresses) {
            promises.push(this.pairAbi.lpTokenID(address));
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
            this.uniquePairTokens(),
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
