import { Injectable } from '@nestjs/common';
import { scAddress, tokensPriceData } from '../../config';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/farm.service';
import { NftToken } from '../../models/tokens/nftToken.model';
import { PairService } from '../pair/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { ProxyService } from '../proxy/proxy.service';
import {
    UserFarmToken,
    UserLockedAssetToken,
    UserLockedFarmToken,
    UserLockedLPToken,
    UserNftToken,
    UserToken,
} from './models/user.model';
import BigNumber from 'bignumber.js';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { UserNftTokens } from './nfttokens.union';
import { UserTokensArgs } from './models/user.args';
import { LockedAssetService } from '../locked-asset-factory/locked-asset.service';
import { WrapService } from '../wrapping/wrap.service';

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
        private lockedAssetService: LockedAssetService,
        private wrapService: WrapService,
    ) {}

    async getAllEsdtTokens(args: UserTokensArgs): Promise<UserToken[]> {
        const [wrappedEGLDTokenID, userTokens] = await Promise.all([
            this.wrapService.getWrappedEgldTokenID(),
            this.apiService.getTokensForUser(
                args.address,
                args.offset,
                args.limit,
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
        const userExchangeNFTs: NftToken[] = [];
        for (const userNft of userNFTs) {
            const [isFarmToken, isLockedToken] = await Promise.all([
                this.farmService.isFarmToken(userNft.collection),
                this.isLockedToken(userNft.collection),
            ]);
            if (isFarmToken || isLockedToken) {
                userExchangeNFTs.push(userNft);
            }
        }
        const promises = userExchangeNFTs.map(async nftToken => {
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

    private async isLockedToken(tokenID: string): Promise<boolean> {
        const [
            lockedMEXTokenID,
            lockedLpTokenID,
            lockedFarmTokenID,
        ] = await Promise.all([
            this.lockedAssetService.getLockedTokenID(),
            this.proxyPairService.getwrappedLpTokenID(),
            this.proxyFarmService.getwrappedFarmTokenID(),
        ]);

        if (
            tokenID === lockedMEXTokenID ||
            tokenID === lockedLpTokenID ||
            tokenID === lockedFarmTokenID
        ) {
            return true;
        }
        return false;
    }

    private async getNftTokenValueUSD(
        nftToken: NftToken,
    ): Promise<typeof UserNftTokens> {
        const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
            nftToken.collection,
        );
        if (farmAddress) {
            return await this.computeFarmTokenValue(farmAddress, nftToken);
        }

        const [lockedMEXID, assetToken] = await Promise.all([
            this.proxyService.getlockedAssetToken(),
            this.proxyService.getAssetToken(),
        ]);
        if (nftToken.collection === lockedMEXID.collection) {
            const [tokenPriceUSD, decodedAttributes] = await Promise.all([
                this.pairService.getPriceUSDByPath(assetToken.identifier),
                this.lockedAssetService.decodeLockedAssetAttributes({
                    batchAttributes: [
                        {
                            identifier: nftToken.identifier,
                            attributes: nftToken.attributes,
                        },
                    ],
                }),
            ]);
            const denominator = new BigNumber(`1e-${assetToken.decimals}`);
            const valueUSD = new BigNumber(nftToken.balance)
                .multipliedBy(denominator)
                .multipliedBy(new BigNumber(tokenPriceUSD));

            return new UserLockedAssetToken({
                ...nftToken,
                decimals: assetToken.decimals,
                valueUSD: valueUSD.toFixed(),
                decodedAttributes: decodedAttributes[0],
            });
        }

        const wrappedLpToken = await this.proxyPairService.getwrappedLpToken();
        if (nftToken.collection === wrappedLpToken.collection) {
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
                return new UserLockedFarmToken({
                    ...nftToken,
                    decimals: userFarmToken.decimals,
                    valueUSD: userFarmToken.valueUSD,
                    decodedAttributes: decodedWFMTAttributes[0],
                });
            }
        }
        return new UserNftToken({
            ...nftToken,
            decimals: 0,
            valueUSD: '0',
            decodedAttributes: '',
        });
    }

    private async computeFarmTokenValue(
        farmAddress: string,
        farmToken: NftToken,
    ): Promise<typeof UserNftTokens> {
        const decodedFarmAttributes = this.farmService.decodeFarmTokenAttributes(
            farmToken.identifier,
            farmToken.attributes,
        );

        const [lpToken, tokenPriceUSD] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.farmService.getFarmTokenPriceUSD(farmAddress),
        ]);

        const denominator = new BigNumber(`1e-${lpToken.decimals}`);
        const valueUSD = new BigNumber(farmToken.balance)
            .dividedBy(decodedFarmAttributes.aprMultiplier)
            .multipliedBy(denominator)
            .multipliedBy(new BigNumber(tokenPriceUSD));

        return new UserFarmToken({
            ...farmToken,
            decimals: lpToken.decimals,
            valueUSD: valueUSD.toFixed(),
            decodedAttributes: decodedFarmAttributes,
        });
    }

    async computeUserWorth(address: string): Promise<number | undefined> {
        let userBalanceWorth = new BigNumber(0);

        const [userEsdtTokensCount, userNftTokensCount] = await Promise.all([
            this.apiService.getTokensCountForUser(address),
            this.apiService.getNftsCountForUser(address),
        ]);

        const [
            egldPrice,
            userBalance,
            userEsdtTokens,
            userNftTokens,
        ] = await Promise.all([
            this.priceFeed.getTokenPrice('egld'),
            this.apiService.getAccountBalance(address),
            this.getAllEsdtTokens({
                address: address,
                offset: 0,
                limit: userEsdtTokensCount,
            }),
            this.getAllNftTokens({
                address: address,
                offset: 0,
                limit: userNftTokensCount,
            }),
        ]);
        if (!userBalance) {
            return undefined;
        }
        const userBalanceDenom = new BigNumber(userBalance).times('1e-18');

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
}
