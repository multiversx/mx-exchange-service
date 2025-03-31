import { DualYieldTokenAttributes } from '@multiversx/sdk-exchange';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ruleOfThree } from 'src/helpers/helpers';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CalculateRewardsArgs } from 'src/modules/farm/models/farm.args';
import { PairService } from 'src/modules/pair/services/pair.service';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { CacheService } from 'src/services/caching/cache.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { DualYieldTokenAttributesModel } from '../models/dualYieldTokenAttributes.model';
import {
    DualYieldRewardsModel,
    StakingProxyModel,
    UnstakeFarmTokensReceiveModel,
} from '../models/staking.proxy.model';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { StakingProxyAbiService } from './staking.proxy.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { CollectionType } from 'src/modules/common/collection.type';
import { PaginationArgs } from 'src/modules/dex.model';
import { StakingProxiesFilter } from '../models/staking.proxy.args.model';
import { StakingProxyFilteringService } from './staking.proxy.filtering.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';

@Injectable()
export class StakingProxyService {
    constructor(
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly stakingService: StakingService,
        private readonly stakingAbiService: StakingAbiService,
        private readonly farmFactory: FarmFactoryService,
        private readonly pairService: PairService,
        private readonly tokenService: TokenService,
        private readonly apiService: MXApiService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        @Inject(forwardRef(() => StakingProxyFilteringService))
        private readonly stakingProxyFilteringService: StakingProxyFilteringService,
    ) {}

    async getStakingProxies(): Promise<StakingProxyModel[]> {
        const stakingProxiesAddress: string[] =
            await this.remoteConfigGetterService.getStakingProxyAddresses();

        const stakingProxies: StakingProxyModel[] = [];
        for (const address of stakingProxiesAddress) {
            stakingProxies.push(
                new StakingProxyModel({
                    address,
                }),
            );
        }
        return stakingProxies;
    }

    async getFilteredStakingProxies(
        pagination: PaginationArgs,
        filters: StakingProxiesFilter,
    ): Promise<CollectionType<StakingProxyModel>> {
        let stakingProxiesAddresses: string[] =
            await this.remoteConfigGetterService.getStakingProxyAddresses();

        stakingProxiesAddresses =
            this.stakingProxyFilteringService.stakingProxiesByAddress(
                filters,
                stakingProxiesAddresses,
            );

        stakingProxiesAddresses =
            await this.stakingProxyFilteringService.stakingProxiesByPairAdddress(
                filters,
                stakingProxiesAddresses,
            );

        stakingProxiesAddresses =
            await this.stakingProxyFilteringService.stakingProxiesByLpFarmAdddress(
                filters,
                stakingProxiesAddresses,
            );

        stakingProxiesAddresses =
            await this.stakingProxyFilteringService.stakingProxiesByStakingFarmAdddress(
                filters,
                stakingProxiesAddresses,
            );

        stakingProxiesAddresses =
            await this.stakingProxyFilteringService.stakingProxiesByToken(
                filters,
                stakingProxiesAddresses,
            );

        const stakingProxies = stakingProxiesAddresses.map(
            (address) =>
                new StakingProxyModel({
                    address,
                }),
        );

        return new CollectionType({
            count: stakingProxies.length,
            items: stakingProxies.slice(
                pagination.offset,
                pagination.offset + pagination.limit,
            ),
        });
    }

    async getStakingToken(stakingProxyAddress: string): Promise<EsdtToken> {
        const stakingTokenID = await this.stakingProxyAbi.stakingTokenID(
            stakingProxyAddress,
        );
        return this.tokenService.tokenMetadata(stakingTokenID);
    }

    async getFarmToken(stakingProxyAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.stakingProxyAbi.farmTokenID(
            stakingProxyAddress,
        );
        return this.tokenService.getNftCollectionMetadata(farmTokenID);
    }

    async getDualYieldToken(
        stakingProxyAddress: string,
    ): Promise<NftCollection> {
        const dualYieldTokenID = await this.stakingProxyAbi.dualYieldTokenID(
            stakingProxyAddress,
        );
        return this.tokenService.getNftCollectionMetadata(dualYieldTokenID);
    }

    async getLpFarmToken(stakingProxyAddress: string): Promise<NftCollection> {
        const lpFarmTokenID = await this.stakingProxyAbi.lpFarmTokenID(
            stakingProxyAddress,
        );
        return this.tokenService.getNftCollectionMetadata(lpFarmTokenID);
    }

    async getBatchRewardsForPosition(
        positions: CalculateRewardsArgs[],
    ): Promise<DualYieldRewardsModel[]> {
        const promises = positions.map((position) => {
            return this.getRewardsForPosition(position);
        });
        return Promise.all(promises);
    }

    async getUnstakeTokensReceived(
        position: CalculateRewardsArgs,
    ): Promise<UnstakeFarmTokensReceiveModel> {
        const decodedAttributes = this.decodeDualYieldTokenAttributes({
            batchAttributes: [
                {
                    attributes: position.attributes,
                    identifier: position.identifier,
                },
            ],
        });

        const lpFarmTokenAmount = ruleOfThree(
            new BigNumber(position.liquidity),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        );

        const pairAddress = await this.stakingProxyAbi.pairAddress(
            position.farmAddress,
        );

        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            lpFarmTokenAmount.toFixed(),
        );

        const dualYieldRewards = await this.getRewardsForPosition(position);

        return new UnstakeFarmTokensReceiveModel({
            liquidityPosition,
            farmRewards: dualYieldRewards.farmRewards.rewards,
            stakingRewards: dualYieldRewards.stakingRewards.rewards,
        });
    }

    async getRewardsForPosition(
        position: CalculateRewardsArgs,
    ): Promise<DualYieldRewardsModel> {
        const decodedAttributes = this.decodeDualYieldTokenAttributes({
            batchAttributes: [
                {
                    attributes: position.attributes,
                    identifier: position.identifier,
                },
            ],
        });

        const [farmAddress, stakingFarmAddress, farmTokenID, stakingTokenID] =
            await Promise.all([
                this.stakingProxyAbi.lpFarmAddress(position.farmAddress),
                this.stakingProxyAbi.stakingFarmAddress(position.farmAddress),
                this.stakingProxyAbi.lpFarmTokenID(position.farmAddress),
                this.stakingProxyAbi.farmTokenID(position.farmAddress),
            ]);

        const [farmToken, stakingToken] = await Promise.all([
            this.apiService.getNftByTokenIdentifier(
                position.farmAddress,
                tokenIdentifier(
                    farmTokenID,
                    decodedAttributes[0].lpFarmTokenNonce,
                ),
            ),
            this.apiService.getNftByTokenIdentifier(
                position.farmAddress,
                tokenIdentifier(
                    stakingTokenID,
                    decodedAttributes[0].stakingFarmTokenNonce,
                ),
            ),
        ]);

        const lpFarmTokenAmount = ruleOfThree(
            new BigNumber(position.liquidity),
            new BigNumber(decodedAttributes[0].stakingFarmTokenAmount),
            new BigNumber(decodedAttributes[0].lpFarmTokenAmount),
        );

        const [farmRewards, stakingRewards] = await Promise.all([
            this.farmFactory
                .useService(farmAddress)
                .getBatchRewardsForPosition([
                    {
                        attributes: farmToken.attributes,
                        identifier: farmToken.identifier,
                        farmAddress,
                        user: position.user,
                        liquidity: lpFarmTokenAmount.toFixed(),
                        vmQuery: position.vmQuery,
                    },
                ]),
            this.stakingService.getRewardsForPosition({
                attributes: stakingToken.attributes,
                identifier: stakingToken.identifier,
                farmAddress: stakingFarmAddress,
                user: position.user,
                liquidity: position.liquidity,
                vmQuery: position.vmQuery,
            }),
        ]);

        return new DualYieldRewardsModel({
            attributes: position.attributes,
            identifier: position.identifier,
            farmRewards: farmRewards[0],
            stakingRewards,
        });
    }

    decodeDualYieldTokenAttributes(
        args: DecodeAttributesArgs,
    ): DualYieldTokenAttributesModel[] {
        return args.batchAttributes.map((arg) => {
            return new DualYieldTokenAttributesModel({
                ...DualYieldTokenAttributes.fromAttributes(
                    arg.attributes,
                ).toJSON(),
                attributes: arg.attributes,
                identifier: arg.identifier,
            });
        });
    }

    async getStakingProxyAddressByDualYieldTokenID(
        tokenID: string,
    ): Promise<string> {
        const cachedValue: string = await this.cachingService.get(
            `${tokenID}.stakingProxyAddress`,
        );
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }
        const stakingProxiesAddress: string[] =
            await this.remoteConfigGetterService.getStakingProxyAddresses();

        for (const address of stakingProxiesAddress) {
            const dualYieldTokenID =
                await this.stakingProxyAbi.dualYieldTokenID(address);
            if (dualYieldTokenID === tokenID) {
                await this.cachingService.set(
                    `${tokenID}.stakingProxyAddress`,
                    address,
                    Constants.oneHour(),
                );
                return address;
            }
        }

        return undefined;
    }

    async getStakingFarmMinUnboundEpochs(
        stakingProxyAddress: string,
    ): Promise<number> {
        const stakingFarmAddress =
            await this.stakingProxyAbi.stakingFarmAddress(stakingProxyAddress);

        return this.stakingAbiService.minUnbondEpochs(stakingFarmAddress);
    }
}
