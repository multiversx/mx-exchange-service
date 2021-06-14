import { Injectable } from '@nestjs/common';
import { scAddress, tokensPriceData } from '../../config';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/farm.service';
import { NFTTokenModel } from '../models/nftToken.model';
import { PairService } from '../pair/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { ProxyService } from '../proxy/proxy.service';
import { CacheUserService } from '../../services/cache-manager/cache-user.service';
import {
    UserModel,
    UserNFTTokenModel,
    UserTokenModel,
} from '../models/user.model';
import BigNumber from 'bignumber.js';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { TokenModel } from '../models/esdtToken.model';

@Injectable()
export class UserService {
    constructor(
        private apiService: ElrondApiService,
        private cacheService: CacheUserService,
        private pairService: PairService,
        private priceFeed: PriceFeedService,
        private proxyService: ProxyService,
        private proxyPairService: ProxyPairService,
        private proxyFarmService: ProxyFarmService,
        private farmService: FarmService,
    ) {}

    getUser(userAddress: string): UserModel {
        const user = new UserModel();
        user.address = userAddress;
        return user;
    }

    async getAllEsdtTokens(userAddress: string): Promise<UserTokenModel[]> {
        const cachedData = await this.cacheService.getESDTTokens(userAddress);
        if (!!cachedData) {
            return cachedData.esdtTokens;
        }

        const userTokens: TokenModel[] = await this.apiService.getTokensForUser(
            userAddress,
        );
        const promises = userTokens.map(async token => {
            const tokenPriceUSD = await this.getEsdtTokenPriceUSD(token.token);
            const denominator = new BigNumber(`1e-${token.decimals}`);
            const value = new BigNumber(token.balance)
                .multipliedBy(denominator)
                .multipliedBy(new BigNumber(tokenPriceUSD))
                .toString();
            return { ...token, value: value };
        });

        const esdtTokens: UserTokenModel[] = await Promise.all(promises);
        this.cacheService.setESDTTokens(userAddress, {
            esdtTokens: esdtTokens,
        });
        return esdtTokens;
    }

    async getAllNFTTokens(userAddress: string): Promise<UserNFTTokenModel[]> {
        const cachedData = await this.cacheService.getNFTTokens(userAddress);
        if (!!cachedData) {
            return cachedData.nftTokens;
        }

        const userNFTs: NFTTokenModel[] = await this.apiService.getNftsForUser(
            userAddress,
        );
        const promises = userNFTs.map(async nftToken => {
            const value = await this.getNFTTokenValueUSD(nftToken);
            return { ...nftToken, value: value };
        });
        const nftTokens: UserNFTTokenModel[] = await Promise.all(promises);
        this.cacheService.setNFTTokens(userAddress, { nftTokens: nftTokens });
        return nftTokens;
    }

    private async getEsdtTokenPriceUSD(tokenID: string): Promise<string> {
        if (tokensPriceData.has(tokenID)) {
            return (
                await this.priceFeed.getTokenPrice(tokensPriceData.get(tokenID))
            ).toString();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            tokenID,
        );
        if (pairAddress) {
            return await this.pairService.getLpTokenPriceUSD(pairAddress);
        }

        return await this.pairService.getPriceUSDByPath(tokenID);
    }

    private async getNFTTokenValueUSD(
        nftToken: NFTTokenModel,
    ): Promise<string> {
        const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
            nftToken.token,
        );
        if (farmAddress) {
            return (
                await this.computeFarmTokenValue(farmAddress, nftToken)
            ).toString();
        }

        const lockedMEXID = await this.proxyService.getlockedAssetToken();
        const assetToken = await this.proxyService.getAssetToken();
        if (nftToken.token === lockedMEXID.token) {
            const tokenPriceUSD = await this.pairService.getPriceUSDByPath(
                assetToken.token,
            );
            const denominator = new BigNumber(`1e-${assetToken.decimals}`);

            return new BigNumber(nftToken.balance)
                .multipliedBy(denominator)
                .multipliedBy(new BigNumber(tokenPriceUSD))
                .toString();
        }

        const wrappedLpToken = await this.proxyPairService.getwrappedLpToken();
        if (nftToken.token === wrappedLpToken.token) {
            const decodedWLPTAttributes = await this.proxyService.getWrappedLpTokenAttributes(
                [nftToken.attributes],
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

                return new BigNumber(nftToken.balance)
                    .multipliedBy(denominator)
                    .multipliedBy(new BigNumber(tokenPriceUSD))
                    .toString();
            }
        }

        const wrappedFarmToken = await this.proxyFarmService.getwrappedFarmToken();
        if (nftToken.token === wrappedFarmToken.token) {
            const decodedWFMTAttributes = await this.proxyService.getWrappedFarmTokenAttributes(
                [nftToken.attributes],
            );
            const farmAddress = await this.farmService.getFarmAddressByFarmTokenID(
                decodedWFMTAttributes[0].farmTokenID,
            );
            if (farmAddress) {
                const farmToken = await this.apiService.getNftByTokenIdentifier(
                    scAddress.proxyDexAddress,
                    decodedWFMTAttributes[0].farmTokenIdentifier,
                );
                return (
                    await this.computeFarmTokenValue(farmAddress, farmToken)
                ).toString();
            }
        }
        return '0';
    }

    private async computeFarmTokenValue(
        farmAddress: string,
        farmToken: NFTTokenModel,
    ): Promise<BigNumber> {
        const decodedFarmAttributes = await this.farmService.decodeFarmTokenAttributes(
            farmToken.identifier,
            farmToken.attributes,
        );
        const tokenPriceUSD = await this.farmService.getFarmTokenPriceUSD(
            farmAddress,
        );
        const lpToken = await this.farmService.getFarmingToken(farmAddress);
        const denominator = new BigNumber(`1e-${lpToken.decimals}`);
        return new BigNumber(farmToken.balance)
            .dividedBy(decodedFarmAttributes.aprMultiplier)
            .multipliedBy(denominator)
            .multipliedBy(new BigNumber(tokenPriceUSD));
    }
}
