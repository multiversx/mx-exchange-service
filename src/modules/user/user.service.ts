import { Inject, Injectable } from '@nestjs/common';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/services/farm.service';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ProxyFarmGetterService } from '../proxy/services/proxy-farm/proxy-farm.getter.service';
import { ProxyPairGetterService } from '../proxy/services/proxy-pair/proxy-pair.getter.service';
import { UserToken } from './models/user.model';
import BigNumber from 'bignumber.js';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { UserNftTokens } from './nfttokens.union';
import { UserComputeService } from './user.compute.service';
import { LockedAssetToken } from 'src/modules/tokens/models/lockedAssetToken.model';
import { LockedLpToken } from 'src/modules/tokens/models/lockedLpToken.model';
import { LockedFarmToken } from 'src/modules/tokens/models/lockedFarmToken.model';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { CachingService } from '../../services/caching/cache.service';
import { oneSecond } from '../../helpers/helpers';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { PaginationArgs } from '../dex.model';
import { LockedAssetGetterService } from '../locked-asset-factory/services/locked.asset.getter.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { StakingGetterService } from '../staking/services/staking.getter.service';
import { StakingProxyGetterService } from '../staking-proxy/services/staking.proxy.getter.service';
import { StakeFarmToken } from 'src/modules/tokens/models/stakeFarmToken.model';
import { DualYieldToken } from 'src/modules/tokens/models/dualYieldToken.model';
import { PriceDiscoveryService } from '../price-discovery/services/price.discovery.service';
import { SimpleLockGetterService } from '../simple-lock/services/simple.lock.getter.service';
import { EsdtTokenType } from '../tokens/models/esdtToken.model';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';

enum NftTokenType {
    FarmToken,
    LockedAssetToken,
    LockedLpToken,
    LockedFarmToken,
    StakeFarmToken,
    DualYieldToken,
    RedeemToken,
    LockedEsdtToken,
    LockedSimpleLpToken,
    LockedSimpleFarmToken,
}

@Injectable()
export class UserService {
    constructor(
        private userComputeService: UserComputeService,
        private apiService: ElrondApiService,
        private cachingService: CachingService,
        private pairService: PairService,
        private priceFeed: PriceFeedService,
        private proxyPairGetter: ProxyPairGetterService,
        private proxyFarmGetter: ProxyFarmGetterService,
        private farmService: FarmService,
        private farmGetterService: FarmGetterService,
        private lockedAssetGetter: LockedAssetGetterService,
        private stakeGetterService: StakingGetterService,
        private proxyStakeGetter: StakingProxyGetterService,
        private priceDiscoveryService: PriceDiscoveryService,
        private simpleLockGetter: SimpleLockGetterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getAllEsdtTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserToken[]> {
        const userTokens = await this.apiService.getTokensForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        const userPairEsdtTokens = [];
        for (const userToken of userTokens) {
            const isPairEsdtToken = await this.pairService.isPairEsdtToken(
                userToken.identifier,
            );
            if (isPairEsdtToken) {
                userPairEsdtTokens.push(userToken);
            }
        }

        const promises = userPairEsdtTokens.map(async token => {
            return await this.getEsdtTokenDetails(token);
        });
        const tokens = await Promise.all(promises);
        return tokens;
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
                case NftTokenType.StakeFarmToken:
                    promises.push(
                        this.userComputeService.stakeFarmUSD(
                            new StakeFarmToken(userNft),
                        ),
                    );
                    break;
                case NftTokenType.DualYieldToken:
                    promises.push(
                        this.userComputeService.dualYieldTokenUSD(
                            new DualYieldToken(userNft),
                        ),
                    );
                    break;
                case NftTokenType.RedeemToken:
                    const priceDiscoveryAddress = await this.priceDiscoveryService.getPriceDiscoveryAddresByRedeemToken(
                        userNft.collection,
                    );
                    promises.push(
                        this.userComputeService.redeemTokenUSD(
                            userNft,
                            priceDiscoveryAddress,
                        ),
                    );
                    break;
                case NftTokenType.LockedEsdtToken:
                    promises.push(
                        this.userComputeService.lockedEsdtTokenUSD(userNft),
                    );
                    break;
                case NftTokenType.LockedSimpleLpToken:
                    promises.push(
                        this.userComputeService.lockedSimpleLpTokenUSD(userNft),
                    );
                    break;
                case NftTokenType.LockedSimpleFarmToken:
                    promises.push(
                        this.userComputeService.lockedSimpleFarmTokenUSD(
                            userNft,
                        ),
                    );
                    break;
                default:
                    break;
            }
        }

        return await Promise.all(promises);
    }

    private async getEsdtTokenDetails(token: UserToken): Promise<UserToken> {
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            token.identifier,
        );
        if (pairAddress) {
            const userToken = await this.userComputeService.lpTokenUSD(
                token,
                pairAddress,
            );
            userToken.type = EsdtTokenType.FungibleLpToken;
            return userToken;
        }
        const userToken = await this.userComputeService.esdtTokenUSD(token);
        return userToken;
    }

    private async getNftTokenType(tokenID: string): Promise<NftTokenType> {
        const [
            lockedMEXTokenID,
            lockedLpTokenID,
            lockedFarmTokenID,
            lockedTokenID,
            lpProxyTokenID,
            lpFarmProxyTokenID,
        ] = await Promise.all([
            this.lockedAssetGetter.getLockedTokenID(),
            this.proxyPairGetter.getwrappedLpTokenID(),
            this.proxyFarmGetter.getwrappedFarmTokenID(),
            this.simpleLockGetter.getLockedTokenID(),
            this.simpleLockGetter.getLpProxyTokenID(),
            this.simpleLockGetter.getFarmProxyTokenID(),
        ]);

        switch (tokenID) {
            case lockedMEXTokenID:
                return NftTokenType.LockedAssetToken;
            case lockedLpTokenID:
                return NftTokenType.LockedLpToken;
            case lockedFarmTokenID:
                return NftTokenType.LockedFarmToken;
            case lockedTokenID:
                return NftTokenType.LockedEsdtToken;
            case lpProxyTokenID:
                return NftTokenType.LockedSimpleLpToken;
            case lpFarmProxyTokenID:
                return NftTokenType.LockedSimpleFarmToken;
        }

        let promises: Promise<string>[] = [];
        for (const farmAddress of farmsAddresses()) {
            promises.push(this.farmGetterService.getFarmTokenID(farmAddress));
        }
        const farmTokenIDs = await Promise.all(promises);
        if (farmTokenIDs.find(farmTokenID => farmTokenID === tokenID)) {
            return NftTokenType.FarmToken;
        }

        promises = [];
        const staking = await this.remoteConfigGetterService.getStakingAddresses();
        for (const address of staking) {
            promises.push(this.stakeGetterService.getFarmTokenID(address));
        }
        const stakeFarmTokenIDs = await Promise.all(promises);
        if (
            stakeFarmTokenIDs.find(
                stakeFarmTokenID => stakeFarmTokenID === tokenID,
            )
        ) {
            return NftTokenType.StakeFarmToken;
        }

        promises = [];
        const stakingProxy = await this.remoteConfigGetterService.getStakingProxyAddresses();
        for (const address of stakingProxy) {
            promises.push(this.proxyStakeGetter.getDualYieldTokenID(address));
        }
        const dualYieldTokenIDs = await Promise.all(promises);
        if (
            dualYieldTokenIDs.find(
                dualYieldTokenID => dualYieldTokenID === tokenID,
            )
        ) {
            return NftTokenType.DualYieldToken;
        }

        const priceDiscoveryAddress = await this.priceDiscoveryService.getPriceDiscoveryAddresByRedeemToken(
            tokenID,
        );
        if (priceDiscoveryAddress) {
            return NftTokenType.RedeemToken;
        }

        return undefined;
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
