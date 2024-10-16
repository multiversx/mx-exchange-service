import { Injectable } from '@nestjs/common';
import { RouterAbiService } from '../../router/services/router.abi.service';
import { PairService } from '../../pair/services/pair.service';
import { GlobalState } from '../global.state';
import { PairAbiService } from '../../pair/services/pair.abi.service';
import {
    EsdtToken,
    PairMetadata,
    PriceDiscoveryMetadata,
} from '../entities/pair.metadata';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { NftCollection } from '../entities/nft.collection';
import BigNumber from 'bignumber.js';
import { quote } from 'src/modules/pair/pair.utils';
import { scAddress } from 'src/config';
import { PriceDiscoveryAbiService } from 'src/modules/price-discovery/services/price.discovery.abi.service';

@Injectable()
export class StateService {
    private pairs: PairMetadata[] = [];
    private priceDiscoverySCs: PriceDiscoveryMetadata[] = [];

    constructor(
        private readonly routerAbiService: RouterAbiService,
        private readonly pairAbiService: PairAbiService,
        private readonly pairService: PairService,
        private readonly analyticsQueryService: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
    ) {}

    public async initState(startTimestamp: number): Promise<void> {
        this.pairs = [];

        const pairAddresses = await this.routerAbiService.pairsAddress();

        const allFirstTokens = await this.pairService.getAllFirstTokens(
            pairAddresses,
        );
        const allSecondTokens = await this.pairService.getAllSecondTokens(
            pairAddresses,
        );
        const allFeePercentages = await Promise.all(
            pairAddresses.map((address) =>
                this.pairAbiService.totalFeePercent(address),
            ),
        );

        const priceDiscoveryAddresses: string[] = scAddress.priceDiscovery;
        const pdLaunchedTokens = await Promise.all(
            priceDiscoveryAddresses.map((address) =>
                this.priceDiscoveryAbi.launchedTokenID(address),
            ),
        );
        const pdAcceptedTokens = await Promise.all(
            priceDiscoveryAddresses.map((address) =>
                this.priceDiscoveryAbi.acceptedTokenID(address),
            ),
        );

        for (const [index, pdAddress] of priceDiscoveryAddresses.entries()) {
            const priceDiscover = new PriceDiscoveryMetadata({
                address: pdAddress,
                launchedTokenID: pdLaunchedTokens[index],
                acceptedTokenID: pdAcceptedTokens[index],
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
    public async getTokenMetadata(
        tokenID: string,
    ): Promise<EsdtToken | undefined> {
        return await this.getTokenMetadataRaw(tokenID);
    }

    async getTokenMetadataRaw(tokenID: string): Promise<EsdtToken | undefined> {
        return await this.tokenService.tokenMetadataRaw(tokenID);
    }

    @GetOrSetCache({
        baseKey: 'indexer',
        remoteTtl: Constants.oneDay(),
        localTtl: Constants.oneDay(),
    })
    public async getNftCollection(
        tokenID: string,
    ): Promise<NftCollection | undefined> {
        return await this.getNftCollectionRaw(tokenID);
    }

    public async getNftCollectionRaw(
        tokenID: string,
    ): Promise<NftCollection | undefined> {
        return await this.tokenService.getNftCollectionMetadataRaw(tokenID);
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

    public async computeAcceptedTokenPrice(
        acceptedTokenID: string,
        launchedTokenID: string,
        acceptedTokenAmount: string,
        launchedTokenAmount: string,
    ): Promise<string> {
        const [launchedTokenDecimals, acceptedToken] = await Promise.all([
            this.getCollectionDecimals(launchedTokenID),
            this.getTokenMetadata(acceptedTokenID),
        ]);

        const acceptedTokenPrice = quote(
            new BigNumber(`1e${acceptedToken.decimals}`).toFixed(),
            acceptedTokenAmount,
            launchedTokenAmount,
        );

        return new BigNumber(acceptedTokenPrice)
            .multipliedBy(`1e-${launchedTokenDecimals}`)
            .toFixed();
    }

    public async getCollectionDecimals(identifier: string): Promise<number> {
        const collection = await this.getNftCollection(identifier);
        return collection.decimals;
    }

    public computeLaunchedTokenPriceUSD(
        acceptedTokenPriceUSD: BigNumber,
        launchedTokenPrice: string,
    ): string {
        return new BigNumber(launchedTokenPrice)
            .multipliedBy(acceptedTokenPriceUSD)
            .toFixed();
    }

    public getLaunchedTokenID(
        priceDiscoveryAddress: string,
    ): string | undefined {
        const contract = this.priceDiscoverySCs.find(
            (priceDiscovery) =>
                priceDiscovery.address === priceDiscoveryAddress,
        );
        return contract?.launchedTokenID;
    }

    public getAcceptedTokenID(
        priceDiscoveryAddress: string,
    ): string | undefined {
        const contract = this.priceDiscoverySCs.find(
            (priceDiscovery) =>
                priceDiscovery.address === priceDiscoveryAddress,
        );
        return contract?.acceptedTokenID;
    }
}
