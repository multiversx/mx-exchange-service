import { Injectable } from '@nestjs/common';
import { scAddress, tokensPriceData } from '../../config';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/farm.service';
import { NftToken } from '../../models/tokens/nftToken.model';
import { PairService } from '../pair/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { ProxyService } from '../proxy/proxy.service';
import { UserToken } from '../../models/user.model';
import BigNumber from 'bignumber.js';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { UserNftTokens } from './nfttokens.union';
import { UserTokensArgs } from './dto/user.args';

type EsdtTokenDetails = {
    priceUSD: string;
    type: EsdtTokenType;
};

enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

@Injectable()
export class UserService {
    constructor(
        private apiService: ElrondApiService,
        private pairService: PairService,
        private priceFeed: PriceFeedService,
        private proxyService: ProxyService,
        private proxyPairService: ProxyPairService,
        private proxyFarmService: ProxyFarmService,
        private farmService: FarmService,
    ) {}

    async getAllEsdtTokens(args: UserTokensArgs): Promise<UserToken[]> {
        const userTokens: EsdtToken[] = await this.apiService.getTokensForUser(
            args.address,
            args.offset,
            args.limit,
        );
        const promises = userTokens.map(async token => {
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

        const esdtTokens: UserToken[] = await Promise.all(promises);

        return esdtTokens;
    }

    async getAllNftTokens(
        args: UserTokensArgs,
    ): Promise<Array<typeof UserNftTokens>> {
        const userNFTs: NftToken[] = await this.apiService.getNftsForUser(
            args.address,
            args.offset,
            args.limit,
        );
        const promises = userNFTs.map(async nftToken => {
            const userNftToken = await this.getNftTokenValueUSD(nftToken);
            return userNftToken;
        });
        const nftTokens = await Promise.all(promises);

        return nftTokens;
    }

    private async getEsdtTokenDetails(
        tokenID: string,
    ): Promise<EsdtTokenDetails> {
        if (tokensPriceData.has(tokenID)) {
            const tokenPriceUSD = await this.priceFeed.getTokenPrice(
                tokensPriceData.get(tokenID),
            );
            return {
                type: EsdtTokenType.FungibleToken,
                priceUSD: tokenPriceUSD.toFixed(),
            };
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            tokenID,
        );
        if (pairAddress) {
            const tokenPriceUSD = await this.pairService.getLpTokenPriceUSD(
                pairAddress,
            );
            return {
                type: EsdtTokenType.FungibleLpToken,
                priceUSD: tokenPriceUSD,
            };
        }
        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(tokenID);
        return {
            type: EsdtTokenType.FungibleToken,
            priceUSD: tokenPriceUSD.toFixed(),
        };
    }

    private async getNftTokenValueUSD(
        nftToken: NftToken,
    ): Promise<typeof UserNftTokens> {
        const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
            nftToken.collection,
        );
        if (farmAddress) {
            return this.computeFarmTokenValue(farmAddress, nftToken);
        }

        const lockedMEXID = await this.proxyService.getlockedAssetToken();
        const assetToken = await this.proxyService.getAssetToken();
        if (nftToken.collection === lockedMEXID.collection) {
            const tokenPriceUSD = await this.pairService.getPriceUSDByPath(
                assetToken.identifier,
            );
            const denominator = new BigNumber(`1e-${assetToken.decimals}`);
            const valueUSD = new BigNumber(nftToken.balance)
                .multipliedBy(denominator)
                .multipliedBy(new BigNumber(tokenPriceUSD));
            return {
                ...nftToken,
                decimals: assetToken.decimals,
                valueUSD: valueUSD.toFixed(),
                decodedAttributes: '',
            };
        }

        const wrappedLpToken = await this.proxyPairService.getwrappedLpToken();
        if (nftToken.collection === wrappedLpToken.collection) {
            const decodedWLPTAttributes = await this.proxyService.getWrappedLpTokenAttributes(
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
                const tokenPriceUSD = await this.pairService.getLpTokenPriceUSD(
                    pairAddress,
                );
                const lpToken = await this.pairService.getLpToken(pairAddress);
                const denominator = new BigNumber(`1e-${lpToken.decimals}`);
                const valueUSD = new BigNumber(nftToken.balance)
                    .multipliedBy(denominator)
                    .multipliedBy(new BigNumber(tokenPriceUSD));
                return {
                    ...nftToken,
                    decimals: lpToken.decimals,
                    valueUSD: valueUSD.toFixed(),
                    decodedAttributes: decodedWLPTAttributes[0],
                };
            }
        }

        const wrappedFarmToken = await this.proxyFarmService.getwrappedFarmToken();
        if (nftToken.collection === wrappedFarmToken.collection) {
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
            const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
                decodedWFMTAttributes[0].farmTokenID,
            );
            if (farmAddress) {
                const farmToken = await this.apiService.getNftByTokenIdentifier(
                    scAddress.proxyDexAddress,
                    decodedWFMTAttributes[0].farmTokenIdentifier,
                );
                const userFarmToken = await this.computeFarmTokenValue(
                    farmAddress,
                    farmToken,
                );
                return {
                    ...userFarmToken,
                    valueUSD: userFarmToken.valueUSD,
                    decodedAttributes: decodedWFMTAttributes[0],
                };
            }
        }
        return {
            ...nftToken,
            decimals: 0,
            valueUSD: '0',
            decodedAttributes: '',
        };
    }

    private async computeFarmTokenValue(
        farmAddress: string,
        farmToken: NftToken,
    ): Promise<typeof UserNftTokens> {
        const decodedFarmAttributes = await this.farmService.decodeFarmTokenAttributes(
            farmToken.identifier,
            farmToken.attributes,
        );
        const tokenPriceUSD = await this.farmService.getFarmTokenPriceUSD(
            farmAddress,
        );
        const lpToken = await this.farmService.getFarmingToken(farmAddress);
        const denominator = new BigNumber(`1e-${lpToken.decimals}`);
        const valueUSD = new BigNumber(farmToken.balance)
            .dividedBy(decodedFarmAttributes.aprMultiplier)
            .multipliedBy(denominator)
            .multipliedBy(new BigNumber(tokenPriceUSD));

        return {
            ...farmToken,
            decimals: lpToken.decimals,
            valueUSD: valueUSD.toFixed(),
            decodedAttributes: decodedFarmAttributes,
        };
    }
}
