import { Injectable, Scope } from '@nestjs/common';
import { PairAbiService } from './pair.abi.service';
import DataLoader from 'dataloader';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class PairLoader {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly tokenService: TokenService,
        private readonly cachingService: CacheService,
    ) {}

    public readonly firstTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            const tokenIDskeys = addresses.map(
                (address) => `pair.firstTokenID.${address}`,
            );
            const tokenIDs = await this.cachingService.getMany<string>(
                tokenIDskeys,
            );

            const missingIndexes: number[] = [];
            tokenIDs.forEach((value, index) => {
                if (!value) {
                    missingIndexes.push(index);
                }
            });

            for (const missingIndex of missingIndexes) {
                const tokenID = await this.pairAbi.firstTokenID(
                    addresses[missingIndex],
                );
                tokenIDs[missingIndex] = tokenID;
            }

            return this.genericTokensLoader(tokenIDs);
        },
    );

    public readonly secondTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            const tokenIDskeys = addresses.map(
                (address) => `pair.secondTokenID.${address}`,
            );
            const tokenIDs = await this.cachingService.getMany<string>(
                tokenIDskeys,
            );

            const missingIndexes: number[] = [];
            tokenIDs.forEach((value, index) => {
                if (!value) {
                    missingIndexes.push(index);
                }
            });

            for (const missingIndex of missingIndexes) {
                const tokenID = await this.pairAbi.secondTokenID(
                    addresses[missingIndex],
                );
                tokenIDs[missingIndex] = tokenID;
            }

            return this.genericTokensLoader(tokenIDs);
        },
    );

    public readonly liquidityPoolToken = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            const tokenIDskeys = addresses.map(
                (address) => `pair.lpTokenID.${address}`,
            );
            const tokenIDs = await this.cachingService.getMany<string>(
                tokenIDskeys,
            );

            const missingIndexes: number[] = [];
            tokenIDs.forEach((value, index) => {
                if (!value) {
                    missingIndexes.push(index);
                }
            });

            for (const missingIndex of missingIndexes) {
                const tokenID = await this.pairAbi.lpTokenID(
                    addresses[missingIndex],
                );
                tokenIDs[missingIndex] = tokenID;
            }

            return this.genericTokensLoader(tokenIDs);
        },
    );

    private async genericTokensLoader(
        tokenIDs: string[],
    ): Promise<EsdtToken[]> {
        const tokenKeys = tokenIDs.map(
            (tokenID) => `token.tokenMetadata.${tokenID}`,
        );

        const tokens = await this.cachingService.getMany<EsdtToken>(tokenKeys);

        const missingIndexes: number[] = [];
        tokens.forEach((value, index) => {
            if (!value) {
                missingIndexes.push(index);
            }
        });

        for (const missingTokenIndex of missingIndexes) {
            const tokenID = tokenIDs[missingTokenIndex];
            const token = await this.tokenService.tokenMetadata(tokenID);
            tokens[missingTokenIndex] = token;
        }

        return tokens;
    }
}
