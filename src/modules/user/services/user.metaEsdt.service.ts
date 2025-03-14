import { Inject, Injectable, Logger } from '@nestjs/common';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
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
import { Constants } from '@multiversx/sdk-nestjs-common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PaginationArgs } from '../../dex.model';
import { LockedAssetGetterService } from '../../locked-asset-factory/services/locked.asset.getter.service';
import { StakeFarmToken } from 'src/modules/tokens/models/stakeFarmToken.model';
import { DualYieldToken } from 'src/modules/tokens/models/dualYieldToken.model';
import { PriceDiscoveryService } from '../../price-discovery/services/price.discovery.service';
import { RemoteConfigGetterService } from '../../remote-config/remote-config.getter.service';
import { INFTToken } from '../../tokens/models/nft.interface';
import { constantsConfig, scAddress } from 'src/config';
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
    UserWrappedLockedToken,
} from '../models/user.model';
import { UnbondFarmToken } from 'src/modules/tokens/models/unbondFarmToken.model';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { LockedTokenWrapperAbiService } from 'src/modules/locked-token-wrapper/services/locked-token-wrapper.abi.service';
import { ProxyPairAbiService } from 'src/modules/proxy/services/proxy-pair/proxy.pair.abi.service';
import { ProxyFarmAbiService } from 'src/modules/proxy/services/proxy-farm/proxy.farm.abi.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { SimpleLockAbiService } from 'src/modules/simple-lock/services/simple.lock.abi.service';
import { PriceDiscoveryAbiService } from 'src/modules/price-discovery/services/price.discovery.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { Address } from '@multiversx/sdk-core/out';

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
    WrappedLockedToken,
}

@Injectable()
export class UserMetaEsdtService {
    constructor(
        private readonly userComputeService: UserMetaEsdtComputeService,
        private readonly apiService: MXApiService,
        private readonly proxyPairAbi: ProxyPairAbiService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
        private readonly farmAbiFactory: FarmAbiFactory,
        private readonly lockedAssetGetter: LockedAssetGetterService,
        private readonly stakingAbi: StakingAbiService,
        private readonly proxyStakeAbi: StakingProxyAbiService,
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly simpleLockAbi: SimpleLockAbiService,
        private readonly energyAbi: EnergyAbiService,
        private readonly lockedTokenWrapperAbi: LockedTokenWrapperAbiService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    ) {}

    async getUserLockedAssetTokens(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedAssetToken[]> {
        const lockedMEXTokenID =
            await this.lockedAssetGetter.getLockedTokenID();
        const nfts = rawNfts
            ? rawNfts.filter((nft) => nft.collection === lockedMEXTokenID)
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  [lockedMEXTokenID],
              );
        return Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedAssetTokenUSD(
                    new LockedAssetToken(nft),
                ),
            ),
        );
    }

    async getUserFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
        calculateUSD = true,
        rawNfts?: NftToken[],
    ): Promise<UserFarmToken[]> {
        const farmTokenIDs = await this.farmAbiFactory
            .useAbi(Address.Zero().bech32())
            .getAllFarmTokenIds(farmsAddresses());
        const nfts = rawNfts
            ? rawNfts.filter((nft) => farmTokenIDs.includes(nft.collection))
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  farmTokenIDs,
              );
        const userTokens = await Promise.all(
            nfts.map((nft) =>
                this.userComputeService.farmTokenUSD(
                    nft,
                    nft.identifier,
                    calculateUSD,
                ),
            ),
        );

        return userTokens.filter((token) => token !== undefined);
    }

    async getUserLockedLpTokens(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedLPToken[]> {
        const lockedLpTokenID = await this.proxyPairAbi.wrappedLpTokenID(
            scAddress.proxyDexAddress.v1,
        );
        const nfts = rawNfts
            ? rawNfts.filter((nft) => nft.collection === lockedLpTokenID)
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  [lockedLpTokenID],
              );

        return Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedLpTokenUSD(
                    new LockedLpToken(nft),
                ),
            ),
        );
    }

    async getUserLockedFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedFarmToken[]> {
        const lockedFarmTokenID = await this.proxyFarmAbi.wrappedFarmTokenID(
            scAddress.proxyDexAddress.v1,
        );
        const nfts = rawNfts
            ? rawNfts.filter((nft) => nft.collection === lockedFarmTokenID)
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  [lockedFarmTokenID],
              );
        const userTokens = await Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedFarmTokenUSD(
                    new LockedFarmToken(nft),
                ),
            ),
        );

        return userTokens.filter((token) => token !== undefined);
    }

    async getUserLockedLpTokensV2(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedLPTokenV2[]> {
        const lockedLpTokenID = await this.proxyPairAbi.wrappedLpTokenID(
            scAddress.proxyDexAddress.v2,
        );
        const nfts = rawNfts
            ? rawNfts.filter((nft) => nft.collection === lockedLpTokenID)
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  [lockedLpTokenID],
              );
        return Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedLpTokenV2USD(
                    new LockedLpTokenV2(nft),
                ),
            ),
        );
    }

    async getUserLockedFarmTokensV2(
        userAddress: string,
        pagination: PaginationArgs,
        calculateUSD = true,
        rawNfts?: NftToken[],
    ): Promise<UserLockedFarmTokenV2[]> {
        try {
            const lockedFarmTokenID =
                await this.proxyFarmAbi.wrappedFarmTokenID(
                    scAddress.proxyDexAddress.v2,
                );
            const nfts = rawNfts
                ? rawNfts.filter((nft) => nft.collection === lockedFarmTokenID)
                : await this.contextGetter.getNftsForUser(
                      userAddress,
                      pagination.offset,
                      pagination.limit,
                      'MetaESDT',
                      [lockedFarmTokenID],
                  );
            const userTokens = await Promise.all(
                nfts.map((nft) =>
                    this.userComputeService.lockedFarmTokenV2USD(
                        new LockedFarmTokenV2(nft),
                        calculateUSD,
                    ),
                ),
            );
            return userTokens.filter((token) => token !== undefined);
        } catch (e) {
            this.logger.error(
                `Cannot get locked farm tokens v2 for user ${userAddress}, error = ${e}`,
            );
        }
    }

    async getUserStakeFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserStakeFarmToken[]> {
        const stakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
        const stakingTokenIDs = await this.stakingAbi.getAllFarmTokenIds(
            stakingAddresses,
        );

        const nfts = rawNfts
            ? rawNfts.filter((nft) => stakingTokenIDs.includes(nft.collection))
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  stakingTokenIDs,
              );
        const promises: Promise<UserStakeFarmToken>[] = [];

        nfts.forEach((nft) => {
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
        });
        return Promise.all(promises);
    }

    async getUserUnbondFarmTokens(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserUnbondFarmToken[]> {
        const stakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
        const stakingTokenIDs = await this.stakingAbi.getAllFarmTokenIds(
            stakingAddresses,
        );

        const nfts = rawNfts
            ? rawNfts.filter((nft) => stakingTokenIDs.includes(nft.collection))
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  stakingTokenIDs,
              );
        const promises: Promise<UserUnbondFarmToken>[] = [];
        nfts.forEach((nft) => {
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
        });
        return Promise.all(promises);
    }

    async getUserDualYieldTokens(
        userAddress: string,
        pagination: PaginationArgs,
        calculateUSD = true,
        rawNfts?: NftToken[],
    ): Promise<UserDualYiledToken[]> {
        const stakingProxyAddresses =
            await this.remoteConfigGetterService.getStakingProxyAddresses();
        const dualYieldTokenIDs =
            await this.proxyStakeAbi.getAllDualYieldTokenIds(
                stakingProxyAddresses,
            );

        const nfts = rawNfts
            ? rawNfts.filter((nft) =>
                  dualYieldTokenIDs.includes(nft.collection),
              )
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  dualYieldTokenIDs,
              );
        const userDualYieldTokens = await Promise.all(
            nfts.map((nft) =>
                this.userComputeService.dualYieldTokenUSD(
                    new DualYieldToken(nft),
                    calculateUSD,
                ),
            ),
        );

        return userDualYieldTokens.filter((token) => token !== undefined);
    }

    async getUserRedeemToken(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserRedeemToken[]> {
        const redeemTokenIDs =
            await this.priceDiscoveryAbi.getAllRedeemTokenIds(
                scAddress.priceDiscovery,
            );

        const nfts = rawNfts
            ? rawNfts.filter((nft) => redeemTokenIDs.includes(nft.collection))
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  redeemTokenIDs,
              );
        return Promise.all(
            nfts.map((nft) => this.userComputeService.redeemTokenUSD(nft)),
        );
    }

    async getUserLockedEsdtToken(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedEsdtToken[]> {
        const lockedEsdtTokenIDs = await Promise.all(
            scAddress.simpleLockAddress.map((address: string) =>
                this.simpleLockAbi.lockedTokenID(address),
            ),
        );

        const nfts = rawNfts
            ? rawNfts.filter((nft) =>
                  lockedEsdtTokenIDs.includes(nft.collection),
              )
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  lockedEsdtTokenIDs,
              );
        return Promise.all(
            nfts.map((nft) => this.userComputeService.lockedEsdtTokenUSD(nft)),
        );
    }

    async getUserLockedSimpleLpToken(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedSimpleLpToken[]> {
        const lockedSimpleLpTokenIDs = await Promise.all(
            scAddress.simpleLockAddress.map((address: string) =>
                this.simpleLockAbi.lpProxyTokenID(address),
            ),
        );

        const nfts = rawNfts
            ? rawNfts.filter((nft) =>
                  lockedSimpleLpTokenIDs.includes(nft.collection),
              )
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  lockedSimpleLpTokenIDs,
              );
        return Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedSimpleLpTokenUSD(nft),
            ),
        );
    }

    async getUserLockedSimpleFarmToken(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedSimpleFarmToken[]> {
        const lockedSimpleFarmTokenIDs = await Promise.all(
            scAddress.simpleLockAddress.map((address: string) =>
                this.simpleLockAbi.farmProxyTokenID(address),
            ),
        );

        const nfts = rawNfts
            ? rawNfts.filter((nft) =>
                  lockedSimpleFarmTokenIDs.includes(nft.collection),
              )
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  lockedSimpleFarmTokenIDs,
              );
        const userTokens = await Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedSimpleFarmTokenUSD(nft),
            ),
        );
        return userTokens.filter((token) => token !== undefined);
    }

    async getUserLockedTokenEnergy(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserLockedTokenEnergy[]> {
        const lockedTokenEnergyID = await this.energyAbi.lockedTokenID();
        const nfts = rawNfts
            ? rawNfts.filter((nft) => nft.collection === lockedTokenEnergyID)
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  [lockedTokenEnergyID],
              );
        return Promise.all(
            nfts.map((nft) =>
                this.userComputeService.lockedTokenEnergyUSD(nft),
            ),
        );
    }

    async getUserWrappedLockedTokenEnergy(
        userAddress: string,
        pagination: PaginationArgs,
        rawNfts?: NftToken[],
    ): Promise<UserWrappedLockedToken[]> {
        const lockedTokenEnergyID =
            await this.lockedTokenWrapperAbi.wrappedTokenId();
        const nfts = rawNfts
            ? rawNfts.filter((nft) => nft.collection === lockedTokenEnergyID)
            : await this.contextGetter.getNftsForUser(
                  userAddress,
                  pagination.offset,
                  pagination.limit,
                  'MetaESDT',
                  [lockedTokenEnergyID],
              );
        const userTokens = await Promise.all(
            nfts.map((nft) =>
                this.userComputeService.wrappedLockedTokenEnergyUSD(nft),
            ),
        );

        return userTokens.filter((token) => token !== undefined);
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
            userNFTs = await this.contextGetter.getNftsForUser(
                userAddress,
                pagination.offset,
                pagination.limit,
            );
        }

        const promises: Promise<typeof UserNftTokens>[] = [];

        for (const userNft of userNFTs) {
            const userNftTokenType = await this.nftTokenType(
                userNft.collection,
            );

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
                case NftTokenType.WrappedLockedToken:
                    promises.push(
                        this.userComputeService.wrappedLockedTokenEnergyUSD(
                            userNft,
                        ),
                    );
                    break;
            }
        }

        return Promise.all(promises);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'user',
        remoteTtl: Constants.oneHour(),
    })
    private async nftTokenType(tokenID: string): Promise<NftTokenType> {
        return this.getNftTokenTypeRaw(tokenID);
    }

    private async getNftTokenTypeRaw(tokenID: string): Promise<NftTokenType> {
        const lockedMEXTokenID =
            await this.lockedAssetGetter.getLockedTokenID();
        if (tokenID === lockedMEXTokenID) {
            return NftTokenType.LockedAssetToken;
        }

        const lockedTokenEnergy = await this.energyAbi.lockedTokenID();
        if (tokenID === lockedTokenEnergy) {
            return NftTokenType.LockedTokenEnergy;
        }

        const wrappedlockedToken =
            await this.lockedTokenWrapperAbi.wrappedTokenId();
        if (tokenID === wrappedlockedToken) {
            return NftTokenType.WrappedLockedToken;
        }

        for (const proxyVersion of Object.keys(scAddress.proxyDexAddress)) {
            const [lockedLpTokenID, lockedFarmTokenID] = await Promise.all([
                this.proxyPairAbi.wrappedLpTokenID(
                    scAddress.proxyDexAddress[proxyVersion],
                ),
                this.proxyFarmAbi.wrappedFarmTokenID(
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
                    this.simpleLockAbi.lockedTokenID(simpleLockAddress),
                    this.simpleLockAbi.lpProxyTokenID(simpleLockAddress),
                    this.simpleLockAbi.farmProxyTokenID(simpleLockAddress),
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

        const farmTokenIDs = await this.farmAbiFactory
            .useAbi(Address.Zero().bech32())
            .getAllFarmTokenIds(farmsAddresses());
        if (farmTokenIDs.find((farmTokenID) => farmTokenID === tokenID)) {
            return NftTokenType.FarmToken;
        }

        let promises: Promise<string>[] = [];
        const staking =
            await this.remoteConfigGetterService.getStakingAddresses();
        for (const address of staking) {
            promises.push(this.stakingAbi.farmTokenID(address));
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
            promises.push(this.proxyStakeAbi.dualYieldTokenID(address));
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
}
