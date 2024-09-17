import { Injectable } from '@nestjs/common';
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
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

@Injectable()
export class UserEsdtService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly pairService: PairService,
        private readonly tokenService: TokenService,
        private readonly routerAbi: RouterAbiService,
        private readonly userEsdtCompute: UserEsdtComputeService,
    ) {}

    async getAllEsdtTokens(
        userAddress: string,
        pagination: PaginationArgs,
        inputTokens?: IEsdtToken[],
    ): Promise<UserToken[]> {
        const [userTokens, uniquePairTokens, pairsAddresses] =
            await Promise.all([
                inputTokens
                    ? Promise.resolve(inputTokens)
                    : this.apiService.getTokensForUser(
                          userAddress,
                          pagination.offset,
                          pagination.limit,
                      ),
                this.tokenService.getUniqueTokenIDs(false),
                this.routerAbi.pairsAddress(),
            ]);
        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            pairsAddresses,
        );

        const userPairEsdtTokens = userTokens
            .filter((token) => uniquePairTokens.includes(token.identifier))
            .map((token) => new EsdtToken(token));

        const userLpEsdtTokens = userTokens
            .filter((token) => lpTokensIDs.includes(token.identifier))
            .map((token) => new EsdtToken(token));

        const orderedPairAddresses = [];
        userLpEsdtTokens.forEach((token, index) => {
            userLpEsdtTokens[index].type = EsdtTokenType.FungibleLpToken;

            const lpTokenIndex = lpTokensIDs.findIndex(
                (elem) => elem === token.identifier,
            );
            orderedPairAddresses.push(pairsAddresses[lpTokenIndex]);
        });

        const detailedLpTokens = await this.userEsdtCompute.allLpTokensUSD(
            userLpEsdtTokens,
            orderedPairAddresses,
        );
        const detailedEsdtTokens = await this.userEsdtCompute.allEsdtTokensUSD(
            userPairEsdtTokens,
        );

        return [...detailedEsdtTokens, ...detailedLpTokens];
    }
}
