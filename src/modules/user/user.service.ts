import { Inject, Injectable } from '@nestjs/common';
import { farmsConfig } from '../../config';
import { PriceFeedService } from '../../services/price-feed/price-feed.service';
import { FarmService } from '../farm/farm.service';
import { NftToken } from '../../models/tokens/nftToken.model';
import { PairService } from '../pair/pair.service';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { ProxyService } from '../proxy/proxy.service';
import { UserToken } from './models/user.model';
import BigNumber from 'bignumber.js';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { UserNftTokens } from './nfttokens.union';
import { UserTokensArgs } from './models/user.args';
import { LockedAssetService } from '../locked-asset-factory/locked-asset.service';
import { WrapService } from '../wrapping/wrap.service';
import { BoYAccount } from '../battle-of-yields/models/BoYAccount.model';
import { UserComputeService } from './user.compute.service';
import { LockedAssetToken } from 'src/models/tokens/lockedAssetToken.model';
import { LockedLpToken } from 'src/models/tokens/lockedLpToken.model';
import { LockedFarmToken } from 'src/models/tokens/lockedFarmToken.model';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from 'src/services/caching/cache.service';
import { oneMinute, oneSecond } from 'src/helpers/helpers';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

type EsdtTokenDetails = {
    priceUSD: string;
    type: EsdtTokenType;
};

enum EsdtTokenType {
    FungibleToken = 'FungibleESDT',
    FungibleLpToken = 'FungibleESDT-LP',
}

enum NftTokenType {
    FarmToken,
    LockedAssetToken,
    LockedLpToken,
    LockedFarmToken,
}

@Injectable()
export class UserService {
    constructor(
        private userComputeService: UserComputeService,
        private apiService: ElrondApiService,
        private cachingService: CachingService,
        private pairService: PairService,
        private priceFeed: PriceFeedService,
        private proxyService: ProxyService,
        private proxyPairService: ProxyPairService,
        private proxyFarmService: ProxyFarmService,
        private farmService: FarmService,
        private lockedAssetService: LockedAssetService,
        private wrapService: WrapService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
        const userStats = await this.apiService.getAccountStats(args.address);
        const cacheKey = this.getUserCacheKey(
            args.address,
            userStats.nonce,
            'nfts',
        );
        const getUserNfts = () =>
            this.apiService.getNftsForUser(
                args.address,
                args.offset,
                args.limit,
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
                default:
                    break;
            }
        }

        const nftTokens = await Promise.all(promises);
        return nftTokens;
    }

    private async getEsdtTokenDetails(
        tokenID: string,
    ): Promise<EsdtTokenDetails> {
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
        const tokenPriceUSD = await this.pairService.computeTokenPriceUSD(
            tokenID,
        );
        return {
            type: EsdtTokenType.FungibleToken,
            priceUSD: tokenPriceUSD.toFixed(),
        };
    }

    private async getNftTokenType(tokenID: string): Promise<NftTokenType> {
        const [
            lockedMEXTokenID,
            lockedLpTokenID,
            lockedFarmTokenID,
        ] = await Promise.all([
            this.lockedAssetService.getLockedTokenID(),
            this.proxyPairService.getwrappedLpTokenID(),
            this.proxyFarmService.getwrappedFarmTokenID(),
        ]);
        const promises: Promise<string>[] = [];
        for (const farmAddress of farmsConfig) {
            promises.push(this.farmService.getFarmTokenID(farmAddress));
        }
        const farmTokenIDs = await Promise.all(promises);
        switch (tokenID) {
            case lockedMEXTokenID:
                return NftTokenType.LockedAssetToken;
            case lockedLpTokenID:
                return NftTokenType.LockedLpToken;
            case lockedFarmTokenID:
                return NftTokenType.LockedFarmToken;
            default:
                if (farmTokenIDs.find(farmTokenID => farmTokenID === tokenID)) {
                    return NftTokenType.FarmToken;
                }
                return undefined;
        }
    }

    async computeUserWorth(address: string): Promise<BoYAccount> {
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
        return new BoYAccount({
            address: address,
            userTokens: userEsdtTokens,
            userNftTokens: userNftTokens,
            balance: userStats.balance,
            balanceUSD: new BigNumber(userBalanceDenom)
                .times(egldPrice)
                .toFixed(),
            netWorth: userBalanceWorth.toNumber(),
        });
    }

    private getUserCacheKey(address: string, nonce: string, ...args: any) {
        return generateCacheKeyFromParams('user', address, nonce, ...args);
    }
}
