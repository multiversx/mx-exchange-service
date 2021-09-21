import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from '../../config';
import { LockedAssetToken } from '../../models/tokens/lockedAssetToken.model';
import { LockedFarmToken } from '../../models/tokens/lockedFarmToken.model';
import { LockedLpToken } from '../../models/tokens/lockedLpToken.model';
import { NftToken } from '../../models/tokens/nftToken.model';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmService } from '../farm/services/farm.service';
import { LockedAssetService } from '../locked-asset-factory/locked-asset.service';
import { PairService } from '../pair/pair.service';
import { ProxyService } from '../proxy/proxy.service';
import {
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedFarmToken,
    UserLockedLPToken,
} from './models/user.model';
import { UserNftTokens } from './nfttokens.union';

@Injectable()
export class UserComputeService {
    constructor(
        private apiService: ElrondApiService,
        private farmService: FarmService,
        private pairService: PairService,
        private lockedAssetService: LockedAssetService,
        private proxyService: ProxyService,
    ) {}

    async farmTokenUSD(
        nftToken: NftToken,
        farmAddress: string,
    ): Promise<typeof UserNftTokens> {
        const decodedFarmAttributes = this.farmService.decodeFarmTokenAttributes(
            nftToken.identifier,
            nftToken.attributes,
        );

        const [lpToken, tokenPriceUSD] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.farmService.getFarmTokenPriceUSD(farmAddress),
        ]);

        const denominator = new BigNumber(`1e-${lpToken.decimals}`);
        const valueUSD = new BigNumber(nftToken.balance)
            .dividedBy(decodedFarmAttributes.aprMultiplier)
            .multipliedBy(denominator)
            .multipliedBy(new BigNumber(tokenPriceUSD));

        return new UserFarmToken({
            ...nftToken,
            decimals: lpToken.decimals,
            valueUSD: valueUSD.toFixed(),
            decodedAttributes: decodedFarmAttributes,
        });
    }

    async lockedAssetTokenUSD(
        nftToken: LockedAssetToken,
    ): Promise<typeof UserNftTokens> {
        const [assetToken, decodedAttributes] = await Promise.all([
            this.proxyService.getAssetToken(),
            this.lockedAssetService.decodeLockedAssetAttributes({
                batchAttributes: [
                    {
                        identifier: nftToken.identifier,
                        attributes: nftToken.attributes,
                    },
                ],
            }),
        ]);
        const tokenPriceUSD = await this.pairService.getSecondTokenPriceUSD(
            scAddress.get(assetToken.identifier),
        );
        nftToken.decimals = assetToken.decimals;

        const denominator = new BigNumber(`1e-${nftToken.decimals}`);
        const valueUSD = new BigNumber(nftToken.balance)
            .multipliedBy(denominator)
            .multipliedBy(new BigNumber(tokenPriceUSD));

        return new UserLockedAssetToken({
            ...nftToken,
            decimals: nftToken.decimals,
            valueUSD: valueUSD.toFixed(),
            decodedAttributes: decodedAttributes[0],
        });
    }

    async lockedLpTokenUSD(
        nftToken: LockedLpToken,
    ): Promise<typeof UserNftTokens> {
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
            const [lpToken, tokenPriceUSD] = await Promise.all([
                this.pairService.getLpToken(pairAddress),
                this.pairService.getLpTokenPriceUSD(pairAddress),
            ]);

            const denominator = new BigNumber(`1e-${lpToken.decimals}`);
            const valueUSD = new BigNumber(nftToken.balance)
                .multipliedBy(denominator)
                .multipliedBy(new BigNumber(tokenPriceUSD));
            return new UserLockedLPToken({
                ...nftToken,
                decimals: lpToken.decimals,
                valueUSD: valueUSD.toFixed(),
                decodedAttributes: decodedWLPTAttributes[0],
            });
        }
    }

    async lockedFarmTokenUSD(
        nftToken: LockedFarmToken,
    ): Promise<typeof UserNftTokens> {
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
            decimals: userFarmToken.decimals,
            valueUSD: userFarmToken.valueUSD,
            decodedAttributes: decodedWFMTAttributes[0],
        });
    }
}
