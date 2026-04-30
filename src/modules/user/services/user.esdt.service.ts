import { Injectable } from '@nestjs/common';
import { PaginationArgs } from 'src/modules/dex.model';
import { IEsdtToken } from 'src/modules/tokens/models/esdtToken.interface';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { UserToken } from '../models/user.model';
import { UserEsdtComputeService } from './esdt.compute.service';

@Injectable()
export class UserEsdtService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly tokenService: TokenService,
        private readonly userEsdtCompute: UserEsdtComputeService,
    ) {}

    async getAllEsdtTokens(
        userAddress: string,
        pagination: PaginationArgs,
        inputTokens?: IEsdtToken[],
    ): Promise<UserToken[]> {
        const [userTokens, tokens] = await Promise.all([
            inputTokens
                ? Promise.resolve(inputTokens)
                : this.apiService.getTokensForUser(
                      userAddress,
                      pagination.offset,
                      pagination.limit,
                  ),
            this.tokenService.getAllTokens([
                'identifier',
                'type',
                'pairAddress',
            ]),
        ]);

        const tokenMap = new Map(
            tokens.map((token) => [token.identifier, token]),
        );

        const userPairEsdtTokens: EsdtToken[] = [];
        const userLpEsdtTokens: EsdtToken[] = [];
        const orderedPairAddresses: string[] = [];

        for (const userToken of userTokens) {
            if (tokenMap.has(userToken.identifier)) {
                const token = tokenMap.get(userToken.identifier);
                if (token.type === EsdtTokenType.FungibleLpToken) {
                    userPairEsdtTokens.push(new EsdtToken(userToken));
                    orderedPairAddresses.push(token.pairAddress);
                } else {
                    userPairEsdtTokens.push(new EsdtToken(userToken));
                }
            }
        }

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
