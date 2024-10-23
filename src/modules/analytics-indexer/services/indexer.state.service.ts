import { Injectable } from '@nestjs/common';
import { RouterAbiService } from '../../router/services/router.abi.service';
import { PairService } from '../../pair/services/pair.service';
import { PairAbiService } from '../../pair/services/pair.abi.service';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { scAddress } from 'src/config';
import { PriceDiscoveryAbiService } from 'src/modules/price-discovery/services/price.discovery.abi.service';
import { GlobalState } from '../global.state';
import { PairMetadata } from '../entities/pair.metadata';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PriceDiscoveryMetadata } from '../entities/price.discovery.metadata';
import { CacheService } from '@multiversx/sdk-nestjs-cache';

@Injectable()
export class IndexerStateService {
    private pairs: PairMetadata[] = [];
    private priceDiscoverySCs: PriceDiscoveryMetadata[] = [];

    constructor(
        private readonly routerAbiService: RouterAbiService,
        private readonly pairAbiService: PairAbiService,
        private readonly pairService: PairService,
        private readonly analyticsQueryService: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly cacheService: CacheService,
    ) {}

    public async initState(startTimestamp: number): Promise<void> {
        this.pairs = [];

        const pairAddresses = await this.allPairAddresses();

        const allFirstTokens = await this.allFirstTokens(pairAddresses);
        const allSecondTokens = await this.allSecondTokens(pairAddresses);
        const allFeePercentages = await this.allFeePercentages(pairAddresses);

        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;
        const pdLaunchedTokens = await this.allPDLaunchedTokens(
            priceDiscoveryAddresses,
        );
        const pdAcceptedTokens = await this.allPDAcceptedTokens(
            priceDiscoveryAddresses,
        );

        for (const [index, pdAddress] of priceDiscoveryAddresses.entries()) {
            const priceDiscover = new PriceDiscoveryMetadata({
                address: pdAddress,
                launchedToken: pdLaunchedTokens[index],
                acceptedToken: pdAcceptedTokens[index],
            });

            this.priceDiscoverySCs.push(priceDiscover);
        }

        for (const [index, pairAddress] of pairAddresses.entries()) {
            const pair = new PairMetadata({
                address: pairAddress,
                firstToken: allFirstTokens[index],
                secondToken: allSecondTokens[index],
                totalFeePercent: allFeePercentages[index],
            });

            this.pairs.push(pair);

            GlobalState.pairsState[pair.address] = {
                firstTokenID: pair.firstToken.identifier,
                secondTokenID: pair.secondToken.identifier,
                firstTokenReserves:
                    await this.analyticsQueryService.getLastForMetric(
                        pair.address,
                        'firstTokenLocked',
                        startTimestamp,
                    ),
                secondTokenReserves:
                    await this.analyticsQueryService.getLastForMetric(
                        pair.address,
                        'secondTokenLocked',
                        startTimestamp,
                    ),
                liquidityPoolSupply:
                    await this.analyticsQueryService.getLastForMetric(
                        pair.address,
                        'liquidity',
                        startTimestamp,
                    ),
            };
        }
    }

    @GetOrSetCache({
        baseKey: 'indexer',
        remoteTtl: Constants.oneDay(),
        localTtl: Constants.oneDay(),
    })
    public async allPairAddresses(): Promise<string[]> {
        return await this.routerAbiService.pairsAddress();
    }

    private async allFirstTokens(
        pairAddresses: string[],
    ): Promise<EsdtToken[]> {
        return await this.cacheService.getOrSet(
            `indexer.allFirstTokens`,
            async () => await this.pairService.getAllFirstTokens(pairAddresses),
            Constants.oneDay(),
            Constants.oneDay(),
        );
    }

    private async allSecondTokens(
        pairAddresses: string[],
    ): Promise<EsdtToken[]> {
        return await this.cacheService.getOrSet(
            `indexer.allSecondTokens`,
            async () =>
                await this.pairService.getAllSecondTokens(pairAddresses),
            Constants.oneDay(),
            Constants.oneDay(),
        );
    }

    private async allFeePercentages(
        pairAddresses: string[],
    ): Promise<number[]> {
        return await this.cacheService.getOrSet(
            `indexer.allFeePercentages`,
            async () =>
                await Promise.all(
                    pairAddresses.map((address) =>
                        this.pairAbiService.totalFeePercent(address),
                    ),
                ),
            Constants.oneDay(),
            Constants.oneDay(),
        );
    }

    private async allPDLaunchedTokens(
        priceDiscoveryAddresses: string[],
    ): Promise<EsdtToken[]> {
        return await this.cacheService.getOrSet(
            `indexer.allPDLaunchedTokens`,
            async () => {
                const launchedTokenIDs = await Promise.all(
                    priceDiscoveryAddresses.map((address) =>
                        this.priceDiscoveryAbi.launchedTokenID(address),
                    ),
                );
                return await this.tokenService.getAllTokensMetadata(
                    launchedTokenIDs,
                );
            },
            Constants.oneDay(),
            Constants.oneDay(),
        );
    }
    private async allPDAcceptedTokens(
        priceDiscoveryAddresses: string[],
    ): Promise<EsdtToken[]> {
        return await this.cacheService.getOrSet(
            `indexer.allPDAcceptedTokens`,
            async () => {
                const acceptedTokenIDs = await Promise.all(
                    priceDiscoveryAddresses.map((address) =>
                        this.priceDiscoveryAbi.acceptedTokenID(address),
                    ),
                );
                return await this.tokenService.getAllTokensMetadata(
                    acceptedTokenIDs,
                );
            },
            Constants.oneDay(),
            Constants.oneDay(),
        );
    }

    @GetOrSetCache({
        baseKey: 'indexer',
        remoteTtl: Constants.oneDay(),
        localTtl: Constants.oneDay(),
    })
    public async getTokenMetadata(
        tokenID: string,
    ): Promise<EsdtToken | undefined> {
        return await this.tokenService.tokenMetadata(tokenID);
    }

    public getPairsMetadata(): PairMetadata[] {
        return this.pairs;
    }

    public getPairMetadata(pairAddress: string): PairMetadata {
        return this.pairs.find((pair) => pair.address === pairAddress);
    }

    public getFirstToken(pairAddress: string): EsdtToken {
        const pair = this.getPairMetadata(pairAddress);
        return pair.firstToken;
    }

    public getSecondToken(pairAddress: string): EsdtToken {
        const pair = this.getPairMetadata(pairAddress);
        return pair.secondToken;
    }

    public getPairByTokens(token1ID: string, token2ID: string): PairMetadata {
        return this.pairs.find(
            (p) =>
                (p.firstToken.identifier === token1ID &&
                    p.secondToken.identifier === token2ID) ||
                (p.firstToken.identifier === token2ID &&
                    p.secondToken.identifier === token1ID),
        );
    }

    public getTokenPairs(tokenID: string): PairMetadata[] {
        const tokenPairs: PairMetadata[] = [];
        for (const pair of this.pairs) {
            if (
                pair.firstToken.identifier === tokenID ||
                pair.secondToken.identifier === tokenID
            ) {
                tokenPairs.push(pair);
            }
        }
        return tokenPairs;
    }

    public isValidPair(address: string): boolean {
        const pair = this.getPairMetadata(address);
        return pair !== undefined;
    }

    public getPriceDiscoveryMetadata(address: string): PriceDiscoveryMetadata {
        return this.priceDiscoverySCs.find(
            (priceDiscovery) => priceDiscovery.address === address,
        );
    }
}
