import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';

@Injectable()
export class TokensSyncService {
    constructor(
        private readonly apiService: MXApiService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
    ) {}

    async populateToken(
        tokenID: string,
        pairAddress?: string,
    ): Promise<EsdtToken | undefined> {
        if (tokenID === undefined) {
            return undefined;
        }

        const [tokenMetadata, tokenCreatedAt] = await Promise.all([
            this.apiService.getToken(tokenID),
            this.tokenCompute.computeTokenCreatedAtTimestamp(tokenID),
        ]);

        if (tokenMetadata === undefined) {
            return undefined;
        }

        const token: Partial<EsdtToken> = {
            ...this.getTokenFromMetadata(tokenMetadata),
            ...(pairAddress && { pairAddress }),
            type: pairAddress
                ? EsdtTokenType.FungibleLpToken
                : EsdtTokenType.FungibleToken,
            createdAt: tokenCreatedAt,
        };

        if (token.assets) {
            token.assets.lockedAccounts = token.assets.lockedAccounts
                ? Object.keys(token.assets.lockedAccounts)
                : [];
        }

        return token as EsdtToken;
    }

    private getTokenFromMetadata(tokenMetadata: EsdtToken): Partial<EsdtToken> {
        const token: Partial<EsdtToken> = {
            identifier: tokenMetadata.identifier,
            decimals: tokenMetadata.decimals,
            name: tokenMetadata.name,
            ticker: tokenMetadata.ticker,
            owner: tokenMetadata.owner,
            minted: tokenMetadata.minted,
            burnt: tokenMetadata.burnt,
            initialMinted: tokenMetadata.initialMinted,
            supply: tokenMetadata.supply,
            circulatingSupply: tokenMetadata.circulatingSupply,
            assets: tokenMetadata.assets,
            transactions: tokenMetadata.transactions,
            accounts: tokenMetadata.accounts,
            isPaused: tokenMetadata.isPaused,
            canUpgrade: tokenMetadata.canUpgrade,
            canMint: tokenMetadata.canMint,
            canBurn: tokenMetadata.canBurn,
            canChangeOwner: tokenMetadata.canChangeOwner,
            canPause: tokenMetadata.canPause,
            canFreeze: tokenMetadata.canFreeze,
            canWipe: tokenMetadata.canWipe,
            roles: tokenMetadata.roles,
        };
        return token;
    }
}
