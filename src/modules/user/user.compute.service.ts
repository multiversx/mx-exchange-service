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
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedFarmToken,
    UserLockedLPToken,
} from './models/user.model';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { computeValueUSD } from '../../utils/token.converters';
import { ProxyGetterService } from '../proxy/services/proxy.getter.service';

@Injectable()
export class UserComputeService {
    constructor(
        private apiService: ElrondApiService,
        private farmService: FarmService,
        private farmGetterService: FarmGetterService,
        private pairService: PairService,
        private pairGetterService: PairGetterService,
        private lockedAssetService: LockedAssetService,
        private proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterService,
    ) {}

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
}
