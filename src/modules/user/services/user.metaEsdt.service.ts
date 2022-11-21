import { Inject, Injectable } from '@nestjs/common';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ProxyFarmGetterService } from '../../proxy/services/proxy-farm/proxy-farm.getter.service';
import { ProxyPairGetterService } from '../../proxy/services/proxy-pair/proxy-pair.getter.service';
import { ElrondApiService } from '../../../services/elrond-communication/elrond-api.service';
import { UserNftTokens } from '../models/nfttokens.union';
import { UserMetaEsdtComputeService } from './metaEsdt.compute.service';
import { LockedAssetToken } from 'src/modules/tokens/models/lockedAssetToken.model';
import {
    LockedLpToken,
    LockedLpTokenV2,
} from 'src/modules/tokens/models/lockedLpToken.model';
import {
    LockedFarmToken,
    LockedFarmTokenV2,
} from 'src/modules/tokens/models/lockedFarmToken.model';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { CachingService } from '../../../services/caching/cache.service';
import { oneHour, oneSecond } from '../../../helpers/helpers';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PaginationArgs } from '../../dex.model';
import { LockedAssetGetterService } from '../../locked-asset-factory/services/locked.asset.getter.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { StakingGetterService } from '../../staking/services/staking.getter.service';
import { StakingProxyGetterService } from '../../staking-proxy/services/staking.proxy.getter.service';
import { StakeFarmToken } from 'src/modules/tokens/models/stakeFarmToken.model';
import { DualYieldToken } from 'src/modules/tokens/models/dualYieldToken.model';
import { PriceDiscoveryService } from '../../price-discovery/services/price.discovery.service';
import { SimpleLockGetterService } from '../../simple-lock/services/simple.lock.getter.service';
import { RemoteConfigGetterService } from '../../remote-config/remote-config.getter.service';
import { INFTToken } from '../../tokens/models/nft.interface';
import { constantsConfig, scAddress } from 'src/config';
import { FarmGetterFactory } from 'src/modules/farm/farm.getter.factory';
import { EnergyGetterService } from 'src/modules/energy/services/energy.getter.service';
import {
    UserDualYiledToken,
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedEsdtToken,
    UserLockedFarmToken,
    UserLockedFarmTokenV2,
    UserLockedLPToken,
    UserLockedLPTokenV2,
    UserLockedSimpleFarmToken,
    UserLockedSimpleLpToken,
    UserLockedTokenEnergy,
    UserRedeemToken,
    UserStakeFarmToken,
    UserUnbondFarmToken,
} from '../models/user.model';
import { UnbondFarmToken } from 'src/modules/tokens/models/unbondFarmToken.model';
import { PriceDiscoveryGetterService } from 'src/modules/price-discovery/services/price.discovery.getter.service';

enum NftTokenType {
    FarmToken,
    LockedAssetToken,
    LockedLpToken,
    LockedFarmToken,
    LockedLpTokenV2,
    LockedFarmTokenV2,
    StakeFarmToken,
    DualYieldToken,
    RedeemToken,
    LockedEsdtToken,
    LockedSimpleLpToken,
    LockedSimpleFarmToken,
    LockedTokenEnergy,
}

@Injectable()
export class UserMetaEsdtService {
    constructor(
        private userComputeService: UserMetaEsdtComputeService,
        private apiService: ElrondApiService,
        private cachingService: CachingService,
        private proxyPairGetter: ProxyPairGetterService,
        private proxyFarmGetter: ProxyFarmGetterService,
        private farmGetter: FarmGetterFactory,
        private lockedAssetGetter: LockedAssetGetterService,
        private stakeGetterService: StakingGetterService,
        private proxyStakeGetter: StakingProxyGetterService,
        private priceDiscoveryService: PriceDiscoveryService,
        private priceDiscoveryGetter: PriceDiscoveryGetterService,
        private simpleLockGetter: SimpleLockGetterService,
        private energyGetter: EnergyGetterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getUserLockedAssetTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedAssetToken[]> {
        const lockedMEXTokenID =
            await this.lockedAssetGetter.getLockedTokenID();
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => nft.collection === lockedMEXTokenID)
                .map((nft) =>
                    this.userComputeService.lockedAssetTokenUSD(
                        new LockedAssetToken(nft),
                    ),
                ),
        );
    }

    async getUserFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserFarmToken[]> {
        const farmTokenIDs = await Promise.all(
            farmsAddresses().map((address) =>
                this.farmGetter.useGetter(address).getFarmTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => farmTokenIDs.includes(nft.collection))
                .map((nft) => this.userComputeService.farmTokenUSD(nft)),
        );
    }

    async getUserLockedLpTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedLPToken[]> {
        const lockedLpTokenID = await this.proxyPairGetter.getwrappedLpTokenID(
            scAddress.proxyDexAddress.v1,
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );

        return await Promise.all(
            nfts
                .filter((nft) => nft.collection === lockedLpTokenID)
                .map((nft) =>
                    this.userComputeService.lockedLpTokenUSD(
                        new LockedLpToken(nft),
                    ),
                ),
        );
    }

    async getUserLockedFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedFarmToken[]> {
        const lockedFarmTokenID =
            await this.proxyFarmGetter.getwrappedFarmTokenID(
                scAddress.proxyDexAddress.v1,
            );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => nft.collection === lockedFarmTokenID)
                .map((nft) =>
                    this.userComputeService.lockedFarmTokenUSD(
                        new LockedFarmToken(nft),
                    ),
                ),
        );
    }

    async getUserLockedLpTokensV2(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedLPTokenV2[]> {
        const lockedLpTokenID = await this.proxyPairGetter.getwrappedLpTokenID(
            scAddress.proxyDexAddress.v2,
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => nft.collection === lockedLpTokenID)
                .map((nft) =>
                    this.userComputeService.lockedLpTokenV2USD(
                        new LockedLpTokenV2(nft),
                    ),
                ),
        );
    }

    async getUserLockedFarmTokensV2(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedFarmTokenV2[]> {
        const lockedFarmTokenID =
            await this.proxyFarmGetter.getwrappedFarmTokenID(
                scAddress.proxyDexAddress.v2,
            );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => nft.collection === lockedFarmTokenID)
                .map((nft) =>
                    this.userComputeService.lockedFarmTokenV2USD(
                        new LockedFarmTokenV2(nft),
                    ),
                ),
        );
    }

    async getUserStakeFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserStakeFarmToken[]> {
        const stakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
        const stakingTokenIDs = await Promise.all(
            stakingAddresses.map((address) =>
                this.stakeGetterService.getFarmTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        const promises: Promise<UserStakeFarmToken>[] = [];

        nfts.filter((nft) => stakingTokenIDs.includes(nft.collection)).forEach(
            (nft) => {
                if (
                    nft.attributes.length !==
                    constantsConfig.STAKING_UNBOND_ATTRIBUTES_LEN
                ) {
                    promises.push(
                        this.userComputeService.stakeFarmUSD(
                            new StakeFarmToken(nft),
                        ),
                    );
                }
            },
        );
        return await Promise.all(promises);
    }

    async getUserUnbondFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserUnbondFarmToken[]> {
        const stakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
        const stakingTokenIDs = await Promise.all(
            stakingAddresses.map((address) =>
                this.stakeGetterService.getFarmTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        const promises: Promise<UserUnbondFarmToken>[] = [];
        nfts.filter((nft) => stakingTokenIDs.includes(nft.collection)).forEach(
            (nft) => {
                if (
                    nft.attributes.length ===
                    constantsConfig.STAKING_UNBOND_ATTRIBUTES_LEN
                ) {
                    promises.push(
                        this.userComputeService.unbondFarmUSD(
                            new UnbondFarmToken(nft),
                        ),
                    );
                }
            },
        );
        return await Promise.all(promises);
    }

    async getUserDualYieldTokens(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserDualYiledToken[]> {
        const stakingProxyAddresses =
            await this.remoteConfigGetterService.getStakingProxyAddresses();
        const dualYieldTokenIDs = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.proxyStakeGetter.getDualYieldTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => dualYieldTokenIDs.includes(nft.collection))
                .map((nft) =>
                    this.userComputeService.dualYieldTokenUSD(
                        new DualYieldToken(nft),
                    ),
                ),
        );
    }

    async getUserRedeemToken(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserRedeemToken[]> {
        const redeemTokenIDs = await Promise.all(
            scAddress.priceDiscovery.map((address: string) =>
                this.priceDiscoveryGetter.getRedeemTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => redeemTokenIDs.includes(nft.collection))
                .map((nft) => this.userComputeService.redeemTokenUSD(nft)),
        );
    }

    async getUserLockedEsdtToken(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedEsdtToken[]> {
        const lockedEsdtTokenIDs = await Promise.all(
            scAddress.simpleLockAddress.map((address: string) =>
                this.simpleLockGetter.getLockedTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => lockedEsdtTokenIDs.includes(nft.collection))
                .map((nft) => this.userComputeService.lockedEsdtTokenUSD(nft)),
        );
    }

    async getUserLockedSimpleLpToken(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedSimpleLpToken[]> {
        const lockedSimpleLpTokenIDs = await Promise.all(
            scAddress.simpleLockAddress.map((address: string) =>
                this.simpleLockGetter.getLpProxyTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) =>
                    lockedSimpleLpTokenIDs.includes(nft.collection),
                )
                .map((nft) =>
                    this.userComputeService.lockedSimpleLpTokenUSD(nft),
                ),
        );
    }

    async getUserLockedSimpleFarmToken(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedSimpleFarmToken[]> {
        const lockedSimpleFarmTokenIDs = await Promise.all(
            scAddress.simpleLockAddress.map((address: string) =>
                this.simpleLockGetter.getFarmProxyTokenID(address),
            ),
        );
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) =>
                    lockedSimpleFarmTokenIDs.includes(nft.collection),
                )
                .map((nft) =>
                    this.userComputeService.lockedSimpleFarmTokenUSD(nft),
                ),
        );
    }

    async getUserLockedTokenEnergy(
        userAddress: string,
        pagination: PaginationArgs,
    ): Promise<UserLockedTokenEnergy[]> {
        const lockedTokenEnergyID = await this.energyGetter.getLockedTokenID();
        const nfts = await this.apiService.getNftsForUser(
            userAddress,
            pagination.offset,
            pagination.limit,
        );
        return await Promise.all(
            nfts
                .filter((nft) => nft.collection === lockedTokenEnergyID)
                .map((nft) =>
                    this.userComputeService.lockedTokenEnergyUSD(nft),
                ),
        );
    }

    async getAllNftTokens(
        userAddress: string,
        pagination: PaginationArgs,
        nfts?: INFTToken[],
    ): Promise<Array<typeof UserNftTokens>> {
        let userNFTs: NftToken[];
        if (nfts) {
            userNFTs = nfts;
        } else {
            const userStats = await this.apiService.getAccountStats(
                userAddress,
            );
            const cacheKey = this.getUserCacheKey(
                userAddress,
                userStats.nonce,
                'nfts',
            );

            try {
                userNFTs = await this.cachingService.getOrSet(
                    cacheKey,
                    () =>
                        this.apiService.getNftsForUser(
                            userAddress,
                            pagination.offset,
                            pagination.limit,
                        ),
                    oneSecond() * 6,
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
        }

        const promises: Promise<typeof UserNftTokens>[] = [];

        for (const userNft of userNFTs) {
            let userNftTokenType: NftTokenType;
            try {
                userNftTokenType = await this.cachingService.getOrSet(
                    `${userNft.collection}.metaEsdtType`,
                    () => this.getNftTokenType(userNft.collection),
                    oneHour(),
                );
            } catch (error) {
                const logMessage = generateGetLogMessage(
                    PairService.name,
                    this.getAllNftTokens.name,
                    `${userNft.collection}.metaEsdtType`,
                    error,
                );
                this.logger.error(logMessage);
                throw error;
            }

            switch (userNftTokenType) {
                case NftTokenType.FarmToken:
                    promises.push(
                        this.userComputeService.farmTokenUSD(userNft),
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
                case NftTokenType.LockedLpTokenV2:
                    promises.push(
                        this.userComputeService.lockedLpTokenV2USD(
                            new LockedLpTokenV2(userNft),
                        ),
                    );
                    break;
                case NftTokenType.LockedFarmTokenV2:
                    promises.push(
                        this.userComputeService.lockedFarmTokenV2USD(
                            new LockedFarmTokenV2(userNft),
                        ),
                    );
                    break;
                case NftTokenType.StakeFarmToken:
                    if (
                        userNft.attributes.length !==
                        constantsConfig.STAKING_UNBOND_ATTRIBUTES_LEN
                    ) {
                        promises.push(
                            this.userComputeService.stakeFarmUSD(
                                new StakeFarmToken(userNft),
                            ),
                        );
                    } else {
                        promises.push(
                            this.userComputeService.unbondFarmUSD(
                                new UnbondFarmToken(userNft),
                            ),
                        );
                    }
                    break;
                case NftTokenType.DualYieldToken:
                    promises.push(
                        this.userComputeService.dualYieldTokenUSD(
                            new DualYieldToken(userNft),
                        ),
                    );
                    break;
                case NftTokenType.RedeemToken:
                    promises.push(
                        this.userComputeService.redeemTokenUSD(userNft),
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
                case NftTokenType.LockedTokenEnergy:
                    promises.push(
                        this.userComputeService.lockedTokenEnergyUSD(userNft),
                    );
                    break;
            }
        }

        return await Promise.all(promises);
    }

    private async getNftTokenType(tokenID: string): Promise<NftTokenType> {
        const lockedMEXTokenID =
            await this.lockedAssetGetter.getLockedTokenID();
        if (tokenID === lockedMEXTokenID) {
            return NftTokenType.LockedAssetToken;
        }

        const lockedTokenEnergy = await this.energyGetter.getLockedTokenID();
        if (tokenID === lockedTokenEnergy) {
            return NftTokenType.LockedTokenEnergy;
        }

        for (const proxyVersion of Object.keys(scAddress.proxyDexAddress)) {
            const [lockedLpTokenID, lockedFarmTokenID] = await Promise.all([
                this.proxyPairGetter.getwrappedLpTokenID(
                    scAddress.proxyDexAddress[proxyVersion],
                ),
                this.proxyFarmGetter.getwrappedFarmTokenID(
                    scAddress.proxyDexAddress[proxyVersion],
                ),
            ]);

            switch (tokenID) {
                case lockedLpTokenID:
                    return proxyVersion === 'v1'
                        ? NftTokenType.LockedLpToken
                        : NftTokenType.LockedLpTokenV2;
                case lockedFarmTokenID:
                    return proxyVersion === 'v1'
                        ? NftTokenType.LockedFarmToken
                        : NftTokenType.LockedFarmTokenV2;
            }
        }

        for (const simpleLockAddress of scAddress.simpleLockAddress) {
            const [lockedTokenID, lpProxyTokenID, lpFarmProxyTokenID] =
                await Promise.all([
                    this.simpleLockGetter.getLockedTokenID(simpleLockAddress),
                    this.simpleLockGetter.getLpProxyTokenID(simpleLockAddress),
                    this.simpleLockGetter.getFarmProxyTokenID(
                        simpleLockAddress,
                    ),
                ]);

            switch (tokenID) {
                case lockedTokenID:
                    return NftTokenType.LockedEsdtToken;
                case lpProxyTokenID:
                    return NftTokenType.LockedSimpleLpToken;
                case lpFarmProxyTokenID:
                    return NftTokenType.LockedSimpleFarmToken;
            }
        }

        let promises: Promise<string>[] = [];
        for (const farmAddress of farmsAddresses()) {
            promises.push(
                this.farmGetter
                    .useGetter(farmAddress)
                    .getFarmTokenID(farmAddress),
            );
        }
        const farmTokenIDs = await Promise.all(promises);
        if (farmTokenIDs.find((farmTokenID) => farmTokenID === tokenID)) {
            return NftTokenType.FarmToken;
        }

        promises = [];
        const staking =
            await this.remoteConfigGetterService.getStakingAddresses();
        for (const address of staking) {
            promises.push(this.stakeGetterService.getFarmTokenID(address));
        }
        const stakeFarmTokenIDs = await Promise.all(promises);
        if (
            stakeFarmTokenIDs.find(
                (stakeFarmTokenID) => stakeFarmTokenID === tokenID,
            )
        ) {
            return NftTokenType.StakeFarmToken;
        }

        promises = [];
        const stakingProxy =
            await this.remoteConfigGetterService.getStakingProxyAddresses();
        for (const address of stakingProxy) {
            promises.push(this.proxyStakeGetter.getDualYieldTokenID(address));
        }
        const dualYieldTokenIDs = await Promise.all(promises);
        if (
            dualYieldTokenIDs.find(
                (dualYieldTokenID) => dualYieldTokenID === tokenID,
            )
        ) {
            return NftTokenType.DualYieldToken;
        }

        const priceDiscoveryAddress =
            await this.priceDiscoveryService.getPriceDiscoveryAddresByRedeemToken(
                tokenID,
            );
        if (priceDiscoveryAddress) {
            return NftTokenType.RedeemToken;
        }

        return undefined;
    }

    private getUserCacheKey(address: string, nonce: string, ...args: any) {
        return generateCacheKeyFromParams('user', address, nonce, ...args);
    }
}
