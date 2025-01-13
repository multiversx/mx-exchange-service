import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import moment from 'moment';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import {
    PairEsdtTokens,
    PairFieldsType,
    TokenFieldsType,
} from 'src/modules/memory-store/entities/global.state';
import {
    PairCompoundedAPRModel,
    PairModel,
    PairRewardTokensModel,
} from 'src/modules/pair/models/pair.model';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import {
    formatNullOrUndefined,
    parseCachedNullOrUndefined,
} from 'src/utils/cache.utils';
import { farmsAddresses } from 'src/utils/farm.utils';
import { PUB_SUB } from '../redis.pubSub.module';
import { EnergyService } from 'src/modules/energy/services/energy.service';
import {
    UpdatePairPayload,
    UpdateTokenPayload,
} from 'src/modules/memory-store/entities/update.events.payloads';
import {
    MEMORY_STORE_CACHE_KEYS,
    MEMORY_STORE_CACHE_PREFIX,
    MEMORY_STORE_UPDATE_EVENTS,
} from 'src/modules/memory-store/entities/constants';

@Injectable()
export class MemoryStoreMaintainerService {
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly tokenCompute: TokenComputeService,
        private readonly energyService: EnergyService,
        private readonly farmCompute: FarmComputeServiceV2,
        private readonly stakingProxyAbi: StakingProxyAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly cacheService: CacheService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async cachePairsTokensAndFarms(
        pairsMetadata: PairMetadata[],
        lpTokens: EsdtToken[],
    ): Promise<void> {
        const pairAddresses = pairsMetadata.map((pair) => pair.address);
        const allLpTokenIDs = lpTokens.map((token) =>
            token ? token.identifier : undefined,
        );
        const farmAddresses = farmsAddresses([FarmVersion.V2]);

        const [
            allFarmAddresses,
            allPairsStakingProxyAddresses,
            allFeesAPR,
            allFarmBaseAPR,
            allFarmMaxBoostedAPR,
            lockedToken,
        ] = await Promise.all([
            this.pairCompute.getAllPairsFarmAddress(pairAddresses),
            this.pairCompute.getAllPairsStakingProxyAddress(pairAddresses),
            this.pairCompute.getAllFeesAPR(pairAddresses),
            this.farmCompute.getAllBaseAPR(farmAddresses),
            this.farmCompute.getAllMaxBoostedAPR(farmAddresses),
            this.energyService.getLockedToken(),
        ]);

        const pairsStakingProxies = allPairsStakingProxyAddresses.filter(
            (address) => address !== undefined,
        );

        const [stakeFarmAddresses, stakingTokenIDs] = await Promise.all([
            this.stakingProxyAbi.getAllStakingFarmAddresses(
                pairsStakingProxies,
            ),
            this.stakingProxyAbi.getAllStakingTokenIDs(pairsStakingProxies),
        ]);

        const allStakeFarmsAPRs =
            await this.stakingCompute.getAllBaseAndMaxBoostedAPRs(
                stakeFarmAddresses,
            );

        const allPairsStakingTokenIds = allPairsStakingProxyAddresses.map(
            (address) => {
                if (address === undefined) {
                    return undefined;
                }
                const stakingProxyIndex = pairsStakingProxies.findIndex(
                    (stakingProxyAddress) => stakingProxyAddress === address,
                );
                return stakingTokenIDs[stakingProxyIndex];
            },
        );

        for (const [index, pairMetadata] of pairsMetadata.entries()) {
            const pairEsdtTokens = new PairEsdtTokens({
                firstTokenID: pairMetadata.firstTokenID,
                secondTokenID: pairMetadata.secondTokenID,
                lpTokenID: allLpTokenIDs[index],
                dualFarmRewardTokenID: allPairsStakingTokenIds[index],
            });

            const compoundedAPR = new PairCompoundedAPRModel({
                address: pairMetadata.address,
                feesAPR: allFeesAPR[index],
                farmBaseAPR: '0',
                farmBoostedAPR: '0',
                dualFarmBaseAPR: '0',
                dualFarmBoostedAPR: '0',
            });

            if (allFarmAddresses[index] !== undefined) {
                const farmIndex = farmAddresses.findIndex(
                    (farmAddress) => farmAddress === allFarmAddresses[index],
                );
                compoundedAPR.farmBaseAPR = allFarmBaseAPR[farmIndex];
                compoundedAPR.farmBoostedAPR = allFarmMaxBoostedAPR[farmIndex];
            }

            if (allPairsStakingProxyAddresses[index] !== undefined) {
                const stakingProxyIndex = pairsStakingProxies.findIndex(
                    (stakingProxyAddress) =>
                        stakingProxyAddress ===
                        allPairsStakingProxyAddresses[index],
                );
                const { baseAPR, maxBoostedAPR } =
                    allStakeFarmsAPRs[stakingProxyIndex];

                compoundedAPR.dualFarmBaseAPR = baseAPR;
                compoundedAPR.dualFarmBoostedAPR = maxBoostedAPR;
            }

            // TODO remove after updating tokens in cron runnning on instance
            const [firstToken, secondToken, lpToken, dualFarmRewardToken] =
                await Promise.all([
                    this.getMemoryStoreHash(
                        `memoryStore.tokens.${pairEsdtTokens.firstTokenID}`,
                    ),
                    this.getMemoryStoreHash(
                        `memoryStore.tokens.${pairEsdtTokens.secondTokenID}`,
                    ),
                    this.getMemoryStoreHash(
                        `memoryStore.tokens.${pairEsdtTokens.lpTokenID}`,
                    ),
                    this.getMemoryStoreHash(
                        `memoryStore.tokens.${pairEsdtTokens.dualFarmRewardTokenID}`,
                    ),
                ]);

            const pair = new PairModel({
                address: pairMetadata.address,
                firstToken: new EsdtToken(firstToken),
                secondToken: new EsdtToken(secondToken),
                liquidityPoolToken: lpToken
                    ? new EsdtToken(lpToken)
                    : undefined,
                farmAddress: allFarmAddresses[index],
                stakingProxyAddress: allPairsStakingProxyAddresses[index],
                feesAPR: allFeesAPR[index],
                compoundedAPR,
                rewardTokens: new PairRewardTokensModel({
                    address: pairMetadata.address,
                    poolRewards: [
                        new EsdtToken(firstToken),
                        new EsdtToken(secondToken),
                    ],
                    farmReward: allFarmAddresses[index]
                        ? lockedToken
                        : undefined,
                    dualFarmReward: dualFarmRewardToken
                        ? new EsdtToken(dualFarmRewardToken)
                        : undefined,
                }),
            });

            await Promise.all([
                this.cachePairTokens(pairMetadata.address, pairEsdtTokens),
                this.cachePair(
                    pairMetadata.address,
                    pair,
                    PairFieldsType.tokensFarms,
                ),
            ]);
        }

        await this.cacheLpTokens(lpTokens);
    }

    async cacheLpTokens(tokens: EsdtToken[]): Promise<void> {
        tokens = tokens.filter((token) => token !== undefined);

        const allCreatedAt = await this.tokenCompute.getAllTokensCreatedAt(
            tokens.map((token) => token.identifier),
        );
        for (const [index, token] of tokens.entries()) {
            token.derivedEGLD = '0';
            token.previous24hPrice = '0';
            token.previous7dPrice = '0';
            token.volumeUSD24h = '0';
            token.previous24hVolume = '0';
            token.liquidityUSD = '0';
            token.swapCount24h = 0;
            token.previous24hSwapCount = 0;
            token.trendingScore = '-1000000000';
            token.createdAt = allCreatedAt[index];
            await this.cacheEsdtToken(token.identifier, token, false, [
                TokenFieldsType.metadata,
                TokenFieldsType.extra,
            ]);
        }
    }

    async cacheTokensMetadata(tokens: EsdtToken[]): Promise<void> {
        tokens = tokens.filter((token) => token !== undefined);
        for (const token of tokens) {
            await this.cacheEsdtToken(token.identifier, token, false, [
                TokenFieldsType.metadata,
            ]);
        }
    }

    async cachePair(
        pairAddress: string,
        pair: PairModel,
        fieldsType?: PairFieldsType,
    ): Promise<void> {
        await this.setMemoryStoreHash(
            this.getHashKey('pairs', pairAddress),
            pair,
        );

        const currentTimestamp = moment().unix();

        await this.pubSub.publish(
            MEMORY_STORE_UPDATE_EVENTS.PAIR,
            new UpdatePairPayload({
                address: pairAddress,
                timestamp: currentTimestamp,
                fieldsType: fieldsType ?? undefined,
            }),
        );
    }

    async cachePairTokens(
        pairAddress: string,
        pairTokens: PairEsdtTokens,
    ): Promise<void> {
        await this.setMemoryStoreHash(
            this.getHashKey(
                MEMORY_STORE_CACHE_KEYS.PAIRS_ESDT_TOKENS,
                pairAddress,
            ),
            pairTokens,
        );

        await this.pubSub.publish(
            MEMORY_STORE_UPDATE_EVENTS.PAIR_ESDT_TOKENS,
            pairAddress,
        );
    }

    async cacheEsdtToken(
        identifier: string,
        token: EsdtToken,
        deleteAssetsAndRoles: boolean,
        fieldsTypes?: TokenFieldsType[],
    ): Promise<void> {
        if (deleteAssetsAndRoles) {
            delete token.assets;
            delete token.roles;
        }

        await this.setMemoryStoreHash(
            this.getHashKey(MEMORY_STORE_CACHE_KEYS.TOKENS, identifier),
            token,
        );

        const currentTimestamp = moment().unix();

        await this.pubSub.publish(
            MEMORY_STORE_UPDATE_EVENTS.TOKEN,
            new UpdateTokenPayload({
                identifier,
                timestamp: currentTimestamp,
                fieldsTypes: fieldsTypes ?? undefined,
            }),
        );
    }

    private async setMemoryStoreHash(key: string, fields: object) {
        const fieldEntries = Object.entries(fields).map(
            ([key, value]) =>
                [key, formatNullOrUndefined(value)] as [string, any],
        );
        await this.cacheService.hashSetManyRemote(key, fieldEntries, false);
    }

    private async getMemoryStoreHash(key: string): Promise<object> {
        const result = await this.cacheService.hashGetAllRemote(key);

        for (const key of Object.keys(result)) {
            result[key] = parseCachedNullOrUndefined(result[key]);
        }

        return Object.keys(result).length === 0 ? undefined : result;
    }

    private getHashKey(baseKey: string, key: string): string {
        return `${MEMORY_STORE_CACHE_PREFIX}.${baseKey}.${key}`;
    }
}
