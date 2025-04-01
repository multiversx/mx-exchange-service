import { Constants } from '@multiversx/sdk-nestjs-common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import {
    BaseEsdtToken,
    EsdtToken,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { CacheService } from 'src/services/caching/cache.service';

export type BenchmarkSnapshot = {
    pairs: PairModel[];
    tokensMetadata: Map<string, BaseEsdtToken>;
    tokensPriceUSD: Map<string, string>;
};

export type BenchmarkSnapshotResponse = {
    pairs: PairModel[];
    tokensMetadata: EsdtToken[];
};

@Injectable()
export class SwapBenchmarkSnapshotService {
    baseKey: string;
    snapshotTtl: number;

    constructor(
        private readonly cacheService: CacheService,
        private readonly routerAbi: RouterAbiService,
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
    ) {
        this.baseKey = 'swapBenchmark';
        this.snapshotTtl = Constants.oneDay();
    }

    async getAvailableSnapshots(): Promise<number[]> {
        const snapshotIds = await this.cacheService.get<number[]>(
            `${this.baseKey}.timestamps`,
        );

        return snapshotIds ?? [];
    }

    async getSnapshot(timestamp: number): Promise<BenchmarkSnapshot> {
        const [pairs, tokensMetadata, tokensPriceUSD] = await Promise.all([
            this.cacheService.get<PairModel[]>(
                `${this.baseKey}.pairs.${timestamp}`,
            ),
            this.cacheService.get<BaseEsdtToken[]>(
                `${this.baseKey}.tokens.${timestamp}`,
            ),
            this.cacheService.get<string[]>(
                `${this.baseKey}.tokensPriceUSD.${timestamp}`,
            ),
        ]);

        if (!pairs || !tokensMetadata || !tokensPriceUSD) {
            throw new NotFoundException(
                `Snapshot missing for timestamp ${timestamp}`,
            );
        }

        return {
            pairs,
            tokensMetadata: new Map(
                tokensMetadata.map((token) => [token.identifier, token]),
            ),
            tokensPriceUSD: new Map(
                tokensMetadata.map((token, index) => [
                    token.identifier,
                    tokensPriceUSD[index],
                ]),
            ),
        };
    }

    async createSnapshotForTimestamp(timestamp: number): Promise<void> {
        // TODO update context tracker values to trigger deep-history mechanism

        const [activePairs, uniqueTokens] =
            await this.getActivePairsAndTokensRaw();

        const tokenIDs = [...uniqueTokens.keys()];

        const allTokensPriceUSD =
            await this.tokenCompute.getAllTokensPriceDerivedUSD(tokenIDs);

        await Promise.all([
            this.cacheService.set(
                `${this.baseKey}.pairs.${timestamp}`,
                activePairs,
                this.snapshotTtl,
                this.snapshotTtl,
            ),
            this.cacheService.set(
                `${this.baseKey}.tokens.${timestamp}`,
                [...uniqueTokens.values()],
                this.snapshotTtl,
                this.snapshotTtl,
            ),
            this.cacheService.set(
                `${this.baseKey}.tokensPriceUSD.${timestamp}`,
                allTokensPriceUSD,
                this.snapshotTtl,
                this.snapshotTtl,
            ),
        ]);

        const currentSnapshots = await this.getAvailableSnapshots();

        await this.setAvailableSnapshots([...currentSnapshots, timestamp]);
    }

    private async getActivePairsAndTokensRaw(): Promise<
        [PairModel[], Map<string, BaseEsdtToken>]
    > {
        const pairMetadata = await this.routerAbi.pairsMetadata();

        const states = await this.pairService.getAllStates(
            pairMetadata.map((pair) => pair.address),
        );

        const activePairs = pairMetadata.filter(
            (_pair, index) => states[index] === 'Active',
        );

        const pairAddresses: string[] = [];
        let tokenIDs: string[] = [];
        activePairs.forEach((pair) => {
            pairAddresses.push(pair.address);
            tokenIDs.push(...[pair.firstTokenID, pair.secondTokenID]);
        });
        tokenIDs = [...new Set(tokenIDs)];

        const [allInfo, allTotalFeePercent, allTokens] = await Promise.all([
            this.pairAbi.getAllPairsInfoMetadata(pairAddresses),
            this.pairAbi.getAllPairsTotalFeePercent(pairAddresses),
            this.tokenService.getAllBaseTokensMetadata(tokenIDs),
        ]);

        const tokenMap = new Map(
            allTokens.map((token) => [token.identifier, token]),
        );

        const pairs = activePairs.map((pair, index) => {
            return new PairModel({
                address: pair.address,
                firstToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.firstTokenID),
                ),
                secondToken: BaseEsdtToken.toEsdtToken(
                    tokenMap.get(pair.secondTokenID),
                ),
                info: allInfo[index],
                totalFeePercent: allTotalFeePercent[index],
            });
        });

        return [pairs, tokenMap];
    }

    private async setAvailableSnapshots(timestamps: number[]): Promise<void> {
        await this.cacheService.set(
            `${this.baseKey}.timestamps`,
            timestamps,
            this.snapshotTtl,
            this.snapshotTtl,
        );
    }
}
