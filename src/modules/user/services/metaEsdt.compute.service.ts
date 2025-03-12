import { Inject, Injectable, Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from '../../../config';
import { LockedAssetToken } from 'src/modules/tokens/models/lockedAssetToken.model';
import {
    LockedFarmToken,
    LockedFarmTokenV2,
} from 'src/modules/tokens/models/lockedFarmToken.model';
import {
    LockedLpToken,
    LockedLpTokenV2,
} from 'src/modules/tokens/models/lockedLpToken.model';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';
import { MXApiService } from '../../../services/multiversx-communication/mx.api.service';
import { LockedAssetService } from '../../locked-asset-factory/services/locked-asset.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ProxyService } from '../../proxy/services/proxy.service';
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
    UserToken,
    UserUnbondFarmToken,
    UserWrappedLockedToken,
} from '../models/user.model';
import {
    computeValueUSD,
    tokenIdentifier,
} from '../../../utils/token.converters';
import { StakeFarmToken } from 'src/modules/tokens/models/stakeFarmToken.model';
import { StakingService } from '../../staking/services/staking.service';
import { StakingProxyService } from '../../staking-proxy/services/staking.proxy.service';
import { DualYieldToken } from 'src/modules/tokens/models/dualYieldToken.model';
import { SimpleLockService } from '../../simple-lock/services/simple.lock.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { ruleOfThree } from 'src/helpers/helpers';
import { UserEsdtComputeService } from './esdt.compute.service';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { UnbondFarmToken } from 'src/modules/tokens/models/unbondFarmToken.model';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { FarmTokenAttributesModelV1_2 } from 'src/modules/farm/models/farmTokenAttributes.model';
import { LockedTokenWrapperService } from '../../locked-token-wrapper/services/locked-token-wrapper.service';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PriceDiscoveryAbiService } from 'src/modules/price-discovery/services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from 'src/modules/price-discovery/services/price.discovery.compute.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { Address } from '@multiversx/sdk-core/out';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';

@Injectable()
export class UserMetaEsdtComputeService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly farmFactory: FarmFactoryService,
        private readonly farmAbi: FarmAbiFactory,
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
        private readonly lockedAssetService: LockedAssetService,
        private readonly lockedAssetGetter: LockedAssetGetterService,
        private readonly proxyService: ProxyService,
        private readonly stakingService: StakingService,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly stakingProxyService: StakingProxyService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly simpleLockService: SimpleLockService,
        private readonly lockedTokenWrapperService: LockedTokenWrapperService,
        private readonly energyAbi: EnergyAbiService,
        private readonly userEsdtCompute: UserEsdtComputeService,
        private readonly tokenCompute: TokenComputeService,
        private readonly cacheService: CacheService,
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    ) {}

    async esdtTokenUSD(esdtToken: EsdtToken): Promise<UserToken> {
        const tokenPriceUSD = await this.tokenCompute.tokenPriceDerivedUSD(
            esdtToken.identifier,
        );
        return new UserToken({
            ...esdtToken,
            valueUSD: computeValueUSD(
                esdtToken.balance,
                esdtToken.decimals,
                tokenPriceUSD,
            ).toFixed(),
        });
    }

    async lpTokenUSD(
        esdtToken: EsdtToken,
        pairAddress: string,
    ): Promise<UserToken> {
        const valueUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            esdtToken.balance,
        );
        return new UserToken({
            ...esdtToken,
            valueUSD: valueUSD,
            pairAddress,
        });
    }

    async computeUSDValue(
        nftToken: NftToken,
        farmingTokenID: string,
        pairAddress: string,
        calculateUSD: boolean,
    ): Promise<UserFarmToken> {
        const version = farmVersion(nftToken.creator);
        const decodedFarmAttributes = this.farmFactory
            .useService(nftToken.creator)
            .decodeFarmTokenAttributes(
                nftToken.identifier,
                nftToken.attributes,
            );
        if (!calculateUSD) {
            return new UserFarmToken({
                ...nftToken,
                decodedAttributes: decodedFarmAttributes,
            });
        }
        let farmTokenBalance: BigNumber;
        switch (version) {
            case FarmVersion.V1_2:
                farmTokenBalance = new BigNumber(nftToken.balance).dividedBy(
                    (<FarmTokenAttributesModelV1_2>decodedFarmAttributes)
                        .aprMultiplier,
                );
                break;
            default:
                farmTokenBalance = new BigNumber(nftToken.balance);
        }

        if (scAddress.has(farmingTokenID)) {
            const tokenPriceUSD = await this.pairCompute.tokenPriceUSD(
                farmingTokenID,
            );
            return new UserFarmToken({
                ...nftToken,
                valueUSD: computeValueUSD(
                    farmTokenBalance.toFixed(),
                    nftToken.decimals,
                    tokenPriceUSD,
                ).toFixed(),
                decodedAttributes: decodedFarmAttributes,
                pairAddress: Address.Zero().bech32(),
            });
        }
        const farmTokenBalanceUSD =
            await this.pairService.getLiquidityPositionUSD(
                pairAddress,
                farmTokenBalance.toFixed(),
            );
        return new UserFarmToken({
            ...nftToken,
            valueUSD: farmTokenBalanceUSD,
            decodedAttributes: decodedFarmAttributes,
            pairAddress,
        });
    }

    async farmTokenUSD(
        nftToken: NftToken,
        parentIdentifier?: string,
        calculateUSD = true,
    ): Promise<UserFarmToken> {
        try {
            const cachedValue = await this.cacheService.getOrSet(
                parentIdentifier ?? nftToken.identifier,
                async () => {
                    const farmAddress = nftToken.creator;
                    const [farmingTokenID, pairAddress] = await Promise.all([
                        this.farmAbi
                            .useAbi(farmAddress)
                            .farmingTokenID(farmAddress),
                        this.farmAbi
                            .useAbi(farmAddress)
                            .pairContractAddress(farmAddress),
                    ]);
                    return {
                        farmingTokenID,
                        pairAddress,
                    };
                },
                CacheTtlInfo.Attributes.remoteTtl,
                CacheTtlInfo.Attributes.localTtl,
            );

            return await this.computeUSDValue(
                nftToken,
                cachedValue.farmingTokenID,
                cachedValue.pairAddress,
                calculateUSD,
            );
        } catch (e) {
            this.logger.error(
                `Cannot compute farm token for nft ${JSON.stringify(nftToken)}`,
                e.stack,
                UserMetaEsdtComputeService.name,
            );
            return undefined;
        }
    }

    async lockedAssetTokenUSD(
        nftToken: LockedAssetToken,
    ): Promise<UserLockedAssetToken> {
        const [assetTokenID, decodedAttributes] = await Promise.all([
            this.lockedAssetGetter.getAssetTokenID(),
            this.lockedAssetService.decodeLockedAssetAttributes({
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            }),
        ]);

        const tokenPriceUSD = await this.tokenCompute.tokenPriceDerivedUSD(
            assetTokenID,
        );
        return new UserLockedAssetToken({
            ...nftToken,
            valueUSD: computeValueUSD(
                nftToken.balance,
                nftToken.decimals,
                tokenPriceUSD,
            ).toFixed(),
            decodedAttributes: decodedAttributes[0],
        });
    }

    async lockedLpTokenUSD(
        nftToken: LockedLpToken,
    ): Promise<UserLockedLPToken> {
        const decodedWLPTAttributes =
            this.proxyService.decodeWrappedLpTokenAttributes({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            decodedWLPTAttributes.lpTokenID,
        );
        if (pairAddress) {
            const valueUSD = await this.pairService.getLiquidityPositionUSD(
                pairAddress,
                nftToken.balance,
            );
            return new UserLockedLPToken({
                ...nftToken,
                valueUSD: valueUSD,
                decodedAttributes: decodedWLPTAttributes,
                pairAddress,
            });
        }
    }

    async lockedLpTokenV2USD(
        nftToken: LockedLpTokenV2,
    ): Promise<UserLockedLPTokenV2> {
        const decodedWLPTAttributes =
            this.proxyService.decodeWrappedLpTokenAttributesV2({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            decodedWLPTAttributes.lpTokenID,
        );
        if (pairAddress) {
            const valueUSD = await this.pairService.getLiquidityPositionUSD(
                pairAddress,
                nftToken.balance,
            );
            return new UserLockedLPTokenV2({
                ...nftToken,
                valueUSD: valueUSD,
                decodedAttributes: decodedWLPTAttributes,
                pairAddress,
            });
        }
    }

    async lockedFarmTokenUSD(
        nftToken: LockedFarmToken,
    ): Promise<UserLockedFarmToken> {
        const decodedWFMTAttributes =
            this.proxyService.decodeWrappedFarmTokenAttributes({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });

        const farmToken = await this.getNftByTokenIdentifier(
            nftToken.creator,
            decodedWFMTAttributes.farmTokenIdentifier,
        );

        if (farmToken === undefined) {
            return undefined;
        }

        const userFarmToken = await this.farmTokenUSD(
            new NftToken({
                ...farmToken,
                balance: nftToken.balance,
            }),
            nftToken.identifier,
        );
        if (!userFarmToken) {
            return undefined;
        }
        return new UserLockedFarmToken({
            ...nftToken,
            valueUSD: userFarmToken.valueUSD,
            pairAddress: userFarmToken.pairAddress,
            decodedAttributes: decodedWFMTAttributes,
        });
    }

    async lockedFarmTokenV2USD(
        nftToken: LockedFarmTokenV2,
        calculateUSD = true,
    ): Promise<UserLockedFarmTokenV2> {
        try {
            const decodedWFMTAttributes =
                this.proxyService.decodeWrappedFarmTokenAttributesV2({
                    identifier: nftToken.identifier,
                    attributes: nftToken.attributes,
                });

            if (!calculateUSD) {
                return new UserLockedFarmTokenV2({
                    ...nftToken,
                    decodedAttributes: decodedWFMTAttributes,
                });
            }

            const farmToken = await this.getNftByTokenIdentifier(
                nftToken.creator,
                tokenIdentifier(
                    decodedWFMTAttributes.farmToken.tokenIdentifier,
                    decodedWFMTAttributes.farmToken.tokenNonce,
                ),
            );
            if (farmToken === undefined) {
                return undefined;
            }

            const userFarmToken = await this.farmTokenUSD(
                new NftToken({
                    ...farmToken,
                    balance: nftToken.balance,
                }),
                nftToken.identifier,
            );
            if (!userFarmToken) {
                return undefined;
            }
            return new UserLockedFarmTokenV2({
                ...nftToken,
                valueUSD: userFarmToken.valueUSD,
                pairAddress: userFarmToken.pairAddress,
                decodedAttributes: decodedWFMTAttributes,
            });
        } catch (e) {
            this.logger.error(
                `Cannot compute locked farm token for nft ${JSON.stringify(
                    nftToken,
                )}`,
                e.stack,
                UserMetaEsdtComputeService.name,
            );
            return undefined;
        }
    }

    async stakeFarmUSD(nftToken: StakeFarmToken): Promise<UserStakeFarmToken> {
        const stakeDecodedAttributes =
            this.stakingService.decodeStakingTokenAttributes({
                batchAttributes: [
                    {
                        attributes: nftToken.attributes,
                        identifier: nftToken.identifier,
                    },
                ],
            });
        const farmingToken = await this.stakingService.getFarmingToken(
            nftToken.creator,
        );
        const priceUSD = await this.pairCompute.tokenPriceUSD(
            farmingToken.identifier,
        );
        const valueUSD = computeValueUSD(
            nftToken.balance,
            farmingToken.decimals,
            priceUSD,
        ).toFixed();
        return new UserStakeFarmToken({
            ...nftToken,
            valueUSD,
            decodedAttributes: stakeDecodedAttributes[0],
        });
    }

    async unbondFarmUSD(
        nftToken: UnbondFarmToken,
    ): Promise<UserUnbondFarmToken> {
        const farmingToken = await this.stakingService.getFarmingToken(
            nftToken.creator,
        );
        const priceUSD = await this.pairCompute.tokenPriceUSD(
            farmingToken.identifier,
        );
        const valueUSD = computeValueUSD(
            nftToken.balance,
            farmingToken.decimals,
            priceUSD,
        ).toFixed();
        const unbondDecodedAttributes =
            await this.stakingService.decodeUnboundTokenAttributes({
                batchAttributes: [
                    {
                        attributes: nftToken.attributes,
                        identifier: nftToken.identifier,
                    },
                ],
            });
        return new UserUnbondFarmToken({
            ...nftToken,
            valueUSD,
            decodedAttributes: unbondDecodedAttributes[0],
        });
    }

    async dualYieldTokenUSD(
        nftToken: DualYieldToken,
        calculateUSD = true,
    ): Promise<UserDualYiledToken> {
        const decodedAttributes =
            this.stakingProxyService.decodeDualYieldTokenAttributes({
                batchAttributes: [
                    {
                        attributes: nftToken.attributes,
                        identifier: nftToken.identifier,
                    },
                ],
            });

        const farmTokenID = await this.stakingProxyAbi.lpFarmTokenID(
            nftToken.creator,
        );

        const farmTokenIdentifier = tokenIdentifier(
            farmTokenID,
            decodedAttributes[0].lpFarmTokenNonce,
        );

        const farmToken = await this.getNftByTokenIdentifier(
            nftToken.creator,
            farmTokenIdentifier,
        );
        if (farmToken === undefined) {
            return undefined;
        }

        if (!calculateUSD) {
            return new UserDualYiledToken({
                ...nftToken,
                decodedAttributes: decodedAttributes[0],
            });
        }
        farmToken.balance = ruleOfThree(
            new BigNumber(nftToken.balance),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        ).toFixed();

        const farmTokenUSD = await this.farmTokenUSD(
            farmToken,
            nftToken.identifier,
            calculateUSD,
        );

        if (!farmTokenUSD) {
            return undefined;
        }

        return new UserDualYiledToken({
            ...nftToken,
            valueUSD: farmTokenUSD.valueUSD,
            pairAddress: farmTokenUSD.pairAddress,
            decodedAttributes: decodedAttributes[0],
        });
    }

    async redeemTokenUSD(nftToken: NftToken): Promise<UserRedeemToken> {
        const priceDiscoveryAddress = nftToken.creator;
        const [
            launchedTokenID,
            acceptedTokenID,
            launcedTokenPriceUSD,
            acceptedTokenPriceUSD,
        ] = await Promise.all([
            this.priceDiscoveryAbi.launchedTokenID(priceDiscoveryAddress),
            this.priceDiscoveryAbi.acceptedTokenID(priceDiscoveryAddress),
            this.priceDiscoveryCompute.launchedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryCompute.acceptedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
        ]);

        let tokenID: string;
        switch (nftToken.nonce) {
            case 1:
                tokenID = launchedTokenID;
                break;
            case 2:
                tokenID = acceptedTokenID;
                break;
        }

        let tokenIDPriceUSD = await this.pairCompute.tokenPriceUSD(tokenID);
        if (new BigNumber(tokenIDPriceUSD).isZero()) {
            switch (nftToken.nonce) {
                case 1:
                    tokenIDPriceUSD = launcedTokenPriceUSD;
                    break;
                case 2:
                    tokenIDPriceUSD = acceptedTokenPriceUSD;
                    break;
            }
        }

        const valueUSD = computeValueUSD(
            nftToken.balance,
            nftToken.decimals,
            tokenIDPriceUSD,
        ).toFixed();

        return new UserRedeemToken({
            ...nftToken,
            valueUSD,
        });
    }

    async lockedEsdtTokenUSD(nftToken: NftToken): Promise<UserLockedEsdtToken> {
        const decodedAttributes =
            this.simpleLockService.decodeLockedTokenAttributes({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            decodedAttributes.originalTokenID,
        );

        let userEsdtToken: UserToken;
        const esdtToken = new EsdtToken({
            identifier: decodedAttributes.originalTokenID,
            balance: nftToken.balance,
            decimals: nftToken.decimals,
        });
        if (pairAddress) {
            userEsdtToken = await this.userEsdtCompute.lpTokenUSD(
                esdtToken,
                pairAddress,
            );
        } else {
            userEsdtToken = await this.userEsdtCompute.esdtTokenUSD(esdtToken);
        }

        return new UserLockedEsdtToken({
            ...nftToken,
            decodedAttributes,
            valueUSD: userEsdtToken.valueUSD,
        });
    }

    async lockedSimpleLpTokenUSD(
        nftToken: NftToken,
    ): Promise<UserLockedSimpleLpToken> {
        const decodedAttributes =
            this.simpleLockService.decodeLpProxyTokenAttributes({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            decodedAttributes.lpTokenID,
        );
        const userEsdtToken = await this.userEsdtCompute.lpTokenUSD(
            new EsdtToken({
                identifier: decodedAttributes.lpTokenID,
                balance: nftToken.balance,
                decimals: nftToken.decimals,
            }),
            pairAddress,
        );

        return new UserLockedSimpleLpToken({
            ...nftToken,
            decodedAttributes,
            valueUSD: userEsdtToken.valueUSD,
            pairAddress,
        });
    }

    async lockedSimpleFarmTokenUSD(
        nftToken: NftToken,
    ): Promise<UserLockedSimpleFarmToken> {
        const decodedAttributes =
            this.simpleLockService.decodeFarmProxyTokenAttributes({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });

        const farmTokenIdentifier = tokenIdentifier(
            decodedAttributes.farmTokenID,
            decodedAttributes.farmTokenNonce,
        );
        const farmToken = await this.getNftByTokenIdentifier(
            nftToken.creator,
            farmTokenIdentifier,
        );
        if (farmToken === undefined) {
            return undefined;
        }

        const userFarmToken = await this.farmTokenUSD(
            new NftToken({
                ...farmToken,
                balance: nftToken.balance,
            }),
            nftToken.identifier,
        );

        if (!userFarmToken) {
            return undefined;
        }

        return new UserLockedSimpleFarmToken({
            ...nftToken,
            decodedAttributes,
            valueUSD: userFarmToken.valueUSD,
            pairAddress: userFarmToken.pairAddress,
        });
    }

    async lockedTokenEnergyUSD(
        nftToken: NftToken,
    ): Promise<UserLockedTokenEnergy> {
        const decodedAttributes =
            this.simpleLockService.decodeLockedTokenAttributes({
                identifier: nftToken.identifier,
                attributes: nftToken.attributes,
            });

        const esdtToken = new EsdtToken({
            identifier: decodedAttributes.originalTokenID,
            balance: nftToken.balance,
            decimals: nftToken.decimals,
        });

        const userEsdtToken = await this.userEsdtCompute.esdtTokenUSD(
            esdtToken,
        );

        return new UserLockedTokenEnergy({
            ...nftToken,
            decodedAttributes,
            valueUSD: userEsdtToken.valueUSD,
        });
    }

    async wrappedLockedTokenEnergyUSD(
        nftWrappedToken: NftToken,
    ): Promise<UserWrappedLockedToken> {
        const decodedAttributes =
            this.lockedTokenWrapperService.decodeWrappedLockedTokenAttributes({
                identifier: nftWrappedToken.identifier,
                attributes: nftWrappedToken.attributes,
            });

        const originalTokenID = await this.energyAbi.lockedTokenID();

        const nftLockedToken = await this.getNftByTokenIdentifier(
            scAddress.lockedTokenWrapper,
            tokenIdentifier(
                originalTokenID,
                decodedAttributes.lockedTokenNonce,
            ),
        );

        if (nftLockedToken === undefined) {
            return undefined;
        }

        nftLockedToken.balance = nftWrappedToken.balance;

        const userNftLockedToken = await this.lockedTokenEnergyUSD(
            nftLockedToken,
        );

        return new UserWrappedLockedToken({
            ...nftWrappedToken,
            decodedAttributes,
            valueUSD: userNftLockedToken.valueUSD,
        });
    }

    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    private async getNftByTokenIdentifier(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        return this.getNftByTokenIdentifierRaw(address, nftIdentifier);
    }

    private async getNftByTokenIdentifierRaw(
        address: string,
        nftIdentifier: string,
    ): Promise<NftToken> {
        try {
            return await this.apiService.getNftByTokenIdentifier(
                address,
                nftIdentifier,
            );
        } catch (error) {
            return undefined;
        }
    }
}
