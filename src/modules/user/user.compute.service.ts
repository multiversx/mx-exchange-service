import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from '../../config';
import { LockedAssetToken } from '../../models/tokens/lockedAssetToken.model';
import { LockedFarmToken } from '../../models/tokens/lockedFarmToken.model';
import { LockedLpToken } from '../../models/tokens/lockedLpToken.model';
import { NftToken } from '../../models/tokens/nftToken.model';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmGetterService } from '../farm/services/farm.getter.service';
import { FarmService } from '../farm/services/farm.service';
import { LockedAssetService } from '../locked-asset-factory/services/locked-asset.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ProxyService } from '../proxy/services/proxy.service';
import {
    UserDualYiledToken,
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedFarmToken,
    UserLockedLPToken,
    UserRedeemToken,
    UserStakeFarmToken,
    UserToken,
    UserUnbondFarmToken,
} from './models/user.model';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { computeValueUSD, tokenIdentifier } from '../../utils/token.converters';
import { ProxyGetterService } from '../proxy/services/proxy.getter.service';
import { StakeFarmToken } from 'src/models/tokens/stakeFarmToken.model';
import { StakingGetterService } from '../staking/services/staking.getter.service';
import { StakingProxyGetterService } from '../staking-proxy/services/staking.proxy.getter.service';
import { StakingService } from '../staking/services/staking.service';
import { StakingProxyService } from '../staking-proxy/services/staking.proxy.service';
import { DualYieldToken } from 'src/models/tokens/dualYieldToken.model';
import { PriceDiscoveryGetterService } from '../price-discovery/services/price.discovery.getter.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairComputeService } from '../pair/services/pair.compute.service';

@Injectable()
export class UserComputeService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly farmService: FarmService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly lockedAssetService: LockedAssetService,
        private readonly proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly stakingGetter: StakingGetterService,
        private readonly stakingService: StakingService,
        private readonly stakingProxyGetter: StakingProxyGetterService,
        private readonly stakingProxyService: StakingProxyService,
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
    ) {}

    async esdtTokenUSD(esdtToken: EsdtToken): Promise<UserToken> {
        const tokenPriceUSD = await this.pairComputeService.computeTokenPriceUSD(
            esdtToken.identifier,
        );
        return new UserToken({
            ...esdtToken,
            valueUSD: computeValueUSD(
                esdtToken.balance,
                esdtToken.decimals,
                tokenPriceUSD.toFixed(),
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
        });
    }

    async farmTokenUSD(
        nftToken: NftToken,
        farmAddress: string,
    ): Promise<UserFarmToken> {
        const farmingTokenID = await this.farmGetterService.getFarmingTokenID(
            farmAddress,
        );
        const decodedFarmAttributes = this.farmService.decodeFarmTokenAttributes(
            farmAddress,
            nftToken.identifier,
            nftToken.attributes,
        );

        const farmTokenBalance = decodedFarmAttributes.aprMultiplier
            ? new BigNumber(nftToken.balance).dividedBy(
                  decodedFarmAttributes.aprMultiplier,
              )
            : new BigNumber(nftToken.balance);
        if (scAddress.has(farmingTokenID)) {
            const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
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
            });
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        const farmTokenBalanceUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmTokenBalance.toFixed(),
        );
        return new UserFarmToken({
            ...nftToken,
            valueUSD: farmTokenBalanceUSD,
            decodedAttributes: decodedFarmAttributes,
        });
    }

    async lockedAssetTokenUSD(
        nftToken: LockedAssetToken,
    ): Promise<UserLockedAssetToken> {
        const [assetToken, decodedAttributes] = await Promise.all([
            this.proxyGetter.getAssetToken(),
            this.lockedAssetService.decodeLockedAssetAttributes({
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            }),
        ]);

        const tokenPriceUSD = await this.pairGetterService.getSecondTokenPriceUSD(
            scAddress.get(assetToken.identifier),
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
        const decodedWLPTAttributes = this.proxyService.getWrappedLpTokenAttributes(
            {
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            },
        );
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            decodedWLPTAttributes[0].lpTokenID,
        );
        if (pairAddress) {
            const valueUSD = await this.pairService.getLiquidityPositionUSD(
                pairAddress,
                nftToken.balance,
            );
            return new UserLockedLPToken({
                ...nftToken,
                valueUSD: valueUSD,
                decodedAttributes: decodedWLPTAttributes[0],
            });
        }
    }

    async lockedFarmTokenUSD(
        nftToken: LockedFarmToken,
    ): Promise<UserLockedFarmToken> {
        const decodedWFMTAttributes = await this.proxyService.getWrappedFarmTokenAttributes(
            {
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            },
        );
        const [farmAddress, farmToken] = await Promise.all([
            this.farmService.getFarmAddressByFarmTokenID(
                decodedWFMTAttributes[0].farmTokenID,
            ),
            this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                decodedWFMTAttributes[0].farmTokenIdentifier,
            ),
        ]);
        const userFarmToken = await this.farmTokenUSD(farmToken, farmAddress);
        return new UserLockedFarmToken({
            ...nftToken,
            valueUSD: userFarmToken.valueUSD,
            decodedAttributes: decodedWFMTAttributes[0],
        });
    }

    async stakeFarmUSD(
        nftToken: StakeFarmToken,
    ): Promise<UserStakeFarmToken | UserUnbondFarmToken> {
        const stakeFarmAddress = await this.stakingService.getStakeFarmAddressByStakeFarmTokenID(
            nftToken.collection,
        );
        const farmingToken = await this.stakingGetter.getFarmingToken(
            stakeFarmAddress,
        );
        const priceUSD = await this.pairGetterService.getTokenPriceUSD(
            farmingToken.identifier,
        );
        const valueUSD = computeValueUSD(
            nftToken.balance,
            farmingToken.decimals,
            priceUSD,
        ).toFixed();
        if (nftToken.attributes.length === 12) {
            const unbondDecodedAttributes = await this.stakingService.decodeUnboundTokenAttributes(
                {
                    batchAttributes: [
                        {
                            attributes: nftToken.attributes,
                            identifier: nftToken.identifier,
                        },
                    ],
                },
            );
            return new UserUnbondFarmToken({
                ...nftToken,
                valueUSD,
                decodedAttributes: unbondDecodedAttributes[0],
            });
        } else {
            const stakeDecodedAttributes = this.stakingService.decodeStakingTokenAttributes(
                {
                    batchAttributes: [
                        {
                            attributes: nftToken.attributes,
                            identifier: nftToken.identifier,
                        },
                    ],
                },
            );
            return new UserStakeFarmToken({
                ...nftToken,
                valueUSD,
                decodedAttributes: stakeDecodedAttributes[0],
            });
        }
    }

    async dualYieldTokenUSD(
        nftToken: DualYieldToken,
    ): Promise<UserDualYiledToken> {
        const decodedAttributes = this.stakingProxyService.decodeDualYieldTokenAttributes(
            {
                batchAttributes: [
                    {
                        attributes: nftToken.attributes,
                        identifier: nftToken.identifier,
                    },
                ],
            },
        );

        const stakingProxyAddress = await this.stakingProxyService.getStakingProxyAddressByDualYieldTokenID(
            nftToken.collection,
        );
        const farmTokenID = await this.stakingProxyGetter.getLpFarmTokenID(
            stakingProxyAddress,
        );

        const farmTokenIdentifier = tokenIdentifier(
            farmTokenID,
            decodedAttributes[0].lpFarmTokenNonce,
        );
        console.log({
            farmTokenIdentifier,
        });
        const [farmToken, farmAddress] = await Promise.all([
            this.apiService.getNftByTokenIdentifier(
                stakingProxyAddress,
                farmTokenIdentifier,
            ),
            this.farmService.getFarmAddressByFarmTokenID(farmTokenID),
        ]);
        const farmTokenUSD = await this.farmTokenUSD(farmToken, farmAddress);

        return new UserDualYiledToken({
            ...nftToken,
            valueUSD: farmTokenUSD.valueUSD,
            decodedAttributes: decodedAttributes[0],
        });
    }

    async redeemTokenUSD(
        nftToken: NftToken,
        priceDiscoveryAddress: string,
    ): Promise<UserRedeemToken> {
        const [
            launcedTokenPriceUSD,
            acceptedTokenPriceUSD,
        ] = await Promise.all([
            this.priceDiscoveryGetter.getLaunchedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getAcceptedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
        ]);

        const valueUSD = computeValueUSD(
            nftToken.balance,
            nftToken.decimals,
            nftToken.nonce === 1 ? launcedTokenPriceUSD : acceptedTokenPriceUSD,
        ).toFixed();

        return new UserRedeemToken({
            ...nftToken,
            valueUSD,
        });
    }
}
