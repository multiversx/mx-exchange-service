import { Inject, Injectable } from '@nestjs/common';
import { farmsConfig } from '../../config';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/services/farm.service';
import { NftToken } from '../../models/tokens/nftToken.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { UserToken } from './models/user.model';
import BigNumber from 'bignumber.js';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { UserNftTokens } from './nfttokens.union';
import { WrapService } from '../wrapping/wrap.service';
import { UserComputeService } from './user.compute.service';
import { LockedAssetToken } from '../../models/tokens/lockedAssetToken.model';
import { LockedLpToken } from '../../models/tokens/lockedLpToken.model';
import { LockedFarmToken } from '../../models/tokens/lockedFarmToken.model';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { CachingService } from '../../services/caching/cache.service';
import { oneSecond } from '../../helpers/helpers';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { PaginationArgs } from '../dex.model';
import { LockedAssetGetterService } from '../locked-asset-factory/services/locked.asset.getter.service';

type EsdtTokenDetails = {
    priceUSD: string;
    type: EsdtTokenType;
};

enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

enum NftTokenType {
    FarmToken,
    LockedAssetToken,
    LockedLpToken,
    LockedFarmToken,
}

@Injectable()
export class UserService {
    constructor(
        private userComputeService: UserComputeService,
        private apiService: ElrondApiService,
        private cachingService: CachingService,
        private pairService: PairService,
        private pairGetterService: PairGetterService,
        private pairComputeService: PairComputeService,
        private priceFeed: PriceFeedService,
        private proxyPairService: ProxyPairService,
        private proxyFarmService: ProxyFarmService,
        private farmService: FarmService,
        private farmGetterService: FarmGetterService,
        private lockedAssetGetter: LockedAssetGetterService,
        private wrapService: WrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getAllEsdtTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserToken[]> {
        const [wrappedEGLDTokenID, userTokens] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.apiService.getTokensForUser(
                userAddress,
                pagination.offset,
                pagination.limit,
            ),
        ]);
        const userPairEsdtTokens = [];
        for (const userToken of userTokens) {
            const isPairEsdtToken = await this.pairService.isPairEsdtToken(
                userToken.identifier,
            );
            if (
                isPairEsdtToken &&
                userToken.identifier !== wrappedEGLDTokenID
            ) {
                userPairEsdtTokens.push(userToken);
            }
        }

        const promises = userPairEsdtTokens.map(async token => {
            const esdtTokenDetails = await this.getEsdtTokenDetails(
                token.identifier,
            );
            const denominator = new BigNumber(`1e-${token.decimals}`);
            const valueUSD = new BigNumber(token.balance)
                .multipliedBy(denominator)
                .multipliedBy(new BigNumber(esdtTokenDetails.priceUSD))
                .toFixed();
            return {
                ...token,
                type: esdtTokenDetails.type,
                valueUSD: valueUSD,
            };
        });

        return await Promise.all(promises);
    }

    async getAllNftTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<Array<typeof UserNftTokens>> {
        const userStats = await this.apiService.getAccountStats(userAddress);
        const cacheKey = this.getUserCacheKey(
            userAddress,
            userStats.nonce,
            'nfts',
        );
        const getUserNfts = () =>
            this.apiService.getNftsForUser(
                userAddress,
                pagination.offset,
                pagination.limit,
            );

        let userNFTs: NftToken[];

        try {
            userNFTs = await this.cachingService.getOrSet(
                cacheKey,
                getUserNfts,
                oneSecond(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairService.name,
                this.getAllNftTokens.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const promises: Promise<typeof UserNftTokens>[] = [];

        for (const userNft of userNFTs) {
            const userNftTokenType = await this.getNftTokenType(
                userNft.collection,
            );
            switch (userNftTokenType) {
                case NftTokenType.FarmToken:
                    const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
                        userNft.collection,
                    );
                    promises.push(
                        this.userComputeService.farmTokenUSD(
                            userNft,
                            farmAddress,
                        ),
                    );
                    break;
                case NftTokenType.LockedAssetToken:
                    promises.push(
                        this.userComputeService.lockedAssetTokenUSD(
                            new LockedAssetToken(userNft),
                        ),
                    );
                    break;
                case NftTokenType.LockedLpToken:
                    promises.push(
                        this.userComputeService.lockedLpTokenUSD(
                            new LockedLpToken(userNft),
                        ),
                    );
                    break;
                case NftTokenType.LockedFarmToken:
                    promises.push(
                        this.userComputeService.lockedFarmTokenUSD(
                            new LockedFarmToken(userNft),
                        ),
                    );
                    break;
                default:
                    break;
            }
        }

        return await Promise.all(promises);
    }

    private async getEsdtTokenDetails(
        tokenID: string,
    ): Promise<EsdtTokenDetails> {
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            tokenID,
        );
        if (pairAddress) {
            const tokenPriceUSD = await this.pairGetterService.getLpTokenPriceUSD(
                pairAddress,
            );
            return {
                type: EsdtTokenType.FungibleLpToken,
                priceUSD: tokenPriceUSD,
            };
        }
        const tokenPriceUSD = await this.pairComputeService.computeTokenPriceUSD(
            tokenID,
        );
        return {
            type: EsdtTokenType.FungibleToken,
            priceUSD: tokenPriceUSD.toFixed(),
        };
    }

    private async getNftTokenType(tokenID: string): Promise<NftTokenType> {
        const [
            lockedMEXTokenID,
            lockedLpTokenID,
            lockedFarmTokenID,
        ] = await Promise.all([
            this.lockedAssetGetter.getLockedTokenID(),
            this.proxyPairService.getwrappedLpTokenID(),
            this.proxyFarmService.getwrappedFarmTokenID(),
        ]);
        const promises: Promise<string>[] = [];
        for (const farmAddress of farmsConfig) {
            promises.push(this.farmGetterService.getFarmTokenID(farmAddress));
        }
        const farmTokenIDs = await Promise.all(promises);
        switch (tokenID) {
            case lockedMEXTokenID:
                return NftTokenType.LockedAssetToken;
            case lockedLpTokenID:
                return NftTokenType.LockedLpToken;
            case lockedFarmTokenID:
                return NftTokenType.LockedFarmToken;
            default:
                if (farmTokenIDs.find(farmTokenID => farmTokenID === tokenID)) {
                    return NftTokenType.FarmToken;
                }
                return undefined;
        }
    }

    async computeUserWorth(address: string): Promise<number | undefined> {
        let userBalanceWorth = new BigNumber(0);

        const [userEsdtTokensCount, userNftTokensCount] = await Promise.all([
            this.apiService.getTokensCountForUser(address),
            this.apiService.getNftsCountForUser(address),
        ]);

        const [
            egldPrice,
            userStats,
            userEsdtTokens,
            userNftTokens,
        ] = await Promise.all([
            this.priceFeed.getTokenPrice('egld'),
            this.apiService.getAccountStats(address),
            this.getAllEsdtTokens(address, {
                offset: 0,
                limit: userEsdtTokensCount,
            }),
            this.getAllNftTokens(address, {
                offset: 0,
                limit: userNftTokensCount,
            }),
        ]);
        if (!userStats) {
            return undefined;
        }
        const userBalanceDenom = new BigNumber(userStats.balance).times(
            '1e-18',
        );

        userBalanceWorth = userBalanceWorth.plus(
            new BigNumber(userBalanceDenom).times(egldPrice),
        );

        for (const esdtToken of userEsdtTokens) {
            userBalanceWorth = userBalanceWorth.plus(
                new BigNumber(esdtToken.valueUSD),
            );
        }

        for (const nftToken of userNftTokens) {
            userBalanceWorth = userBalanceWorth.plus(
                new BigNumber(nftToken.valueUSD),
            );
        }
        return userBalanceWorth.toNumber();
    }

    private getUserCacheKey(address: string, nonce: string, ...args: any) {
        return generateCacheKeyFromParams('user', address, nonce, ...args);
    }
}
