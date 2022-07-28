import { Injectable } from '@nestjs/common';
import { PaginationArgs } from 'src/modules/dex.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { IEsdtToken } from 'src/modules/tokens/models/esdtToken.interface';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { UserToken } from '../models/user.model';
import { UserEsdtComputeService } from './esdt.compute.service';

@Injectable()
export class UserEsdtService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly pairService: PairService,
        private readonly tokenService: TokenService,
        private readonly pairGetter: PairGetterService,
        private readonly routerGetter: RouterGetterService,
        private readonly userEsdtCompute: UserEsdtComputeService,
    ) {}

    async getAllEsdtTokens(
        userAddress: string,
        pagination: PaginationArgs,
        inputTokens?: IEsdtToken[],
    ): Promise<UserToken[]> {
        let userTokens: IEsdtToken[];
        if (inputTokens) {
            userTokens = inputTokens;
        } else {
            userTokens = await this.apiService.getTokensForUser(
                userAddress,
                pagination.offset,
                pagination.limit,
            );
        }

        let promises = [];
        const [pairsAddresses, uniquePairTokens] = await Promise.all([
            this.routerGetter.getAllPairsAddress(),
            this.tokenService.getUniqueTokenIDs(false),
        ]);

        for (const address of pairsAddresses) {
            promises.push(this.pairGetter.getLpTokenID(address));
        }

        const lpTokensIDs = await Promise.all(promises);
        uniquePairTokens.push(...lpTokensIDs);

        const userPairEsdtTokens = userTokens.filter(token =>
            uniquePairTokens.includes(token.identifier),
        );

        promises = userPairEsdtTokens.map(token => {
            return this.getEsdtTokenDetails(token);
        });
        const tokens = await Promise.all(promises);
        console.log({
            count: tokens.length,
            tokens,
        });
        return tokens;
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
