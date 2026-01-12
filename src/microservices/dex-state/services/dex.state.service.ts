import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    AddPairLpTokenRequest,
    AddPairRequest,
    Farms,
    GetAllFarmsRequest,
    GetAllPairsRequest,
    GetAllStakingFarmsRequest,
    GetAllStakingProxiesRequest,
    GetAllTokensRequest,
    GetFeesCollectorRequest,
    GetFilteredPairsRequest,
    GetFilteredTokensRequest,
    GetPairsAndTokensRequest,
    GetWeeklyTimekeepingRequest,
    InitStateRequest,
    InitStateResponse,
    PaginatedPairs,
    PaginatedTokens,
    PairAndTokens,
    Pairs,
    PairsAndTokensResponse,
    PairSortField,
    SortOrder,
    StakingFarms,
    StakingProxies,
    Tokens,
    TokenSortField,
    UpdatePairsRequest,
    UpdatePairsResponse,
    UpdateTokensRequest,
    UpdateTokensResponse,
    UpdateUsdcPriceRequest,
    UpdateUsdcPriceResponse,
} from '../interfaces/dex_state.interfaces';
import { StateTasks, TaskDto } from 'src/modules/dex-state/entities';
import { BulkUpdatesService } from './bulk.updates.service';
import { queueStateTasks } from 'src/modules/dex-state/dex.state.utils';
import { CacheService } from 'src/services/caching/cache.service';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import {
    PairCompoundedAPRModel,
    PairModel,
} from 'src/modules/pair/models/pair.model';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import {
    BoostedYieldsFactors,
    FarmModel,
} from 'src/modules/farm/models/farm.v2.model';
import { constantsConfig, scAddress } from 'src/config';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FarmRewardType } from 'src/modules/farm/models/farm.model';

const TOKEN_SORT_FIELD_MAP = {
    [TokenSortField.TOKENS_SORT_PRICE]: 'price',
    [TokenSortField.TOKENS_SORT_VOLUME]: 'volumeUSD24h',
    [TokenSortField.TOKENS_SORT_PREV_24H_PRICE]: 'previous24hPrice',
    [TokenSortField.TOKENS_SORT_PREV_7D_PRICE]: 'previous7dPrice',
    [TokenSortField.TOKENS_SORT_PREV_24H_VOLUME]: 'previous24hVolume',
    [TokenSortField.TOKENS_SORT_PRICE_CHANGE_7D]: 'priceChange7d',
    [TokenSortField.TOKENS_SORT_PRICE_CHANGE_24H]: 'priceChange24h',
    [TokenSortField.TOKENS_SORT_VOLUME_CHANGE_24H]: 'volumeUSDChange24h',
    [TokenSortField.TOKENS_SORT_TRADES_CHANGE_24H]: 'tradeChange24h',
    [TokenSortField.TOKENS_SORT_LIQUIDITY]: 'liquidityUSD',
    [TokenSortField.TOKENS_SORT_TRADES_COUNT]: 'swapCount24h',
    [TokenSortField.TOKENS_SORT_TRENDING_SCORE]: 'trendingScore',
    [TokenSortField.TOKENS_SORT_CREATED_AT]: 'createdAt',
};

const PAIR_SORT_FIELD_MAP = {
    [PairSortField.PAIRS_SORT_DEPLOYED_AT]: 'deployedAt',
    [PairSortField.PAIRS_SORT_FEES]: 'feesUSD24h',
    [PairSortField.PAIRS_SORT_TRADES_COUNT]: 'tradesCount',
    [PairSortField.PAIRS_SORT_TRADES_COUNT_24H]: 'tradesCount24h',
    [PairSortField.PAIRS_SORT_TVL]: 'lockedValueUSD',
    [PairSortField.PAIRS_SORT_VOLUME]: 'volumeUSD24h',
    [PairSortField.PAIRS_SORT_APR]: 'compoundedAprValue',
};

@Injectable()
export class DexStateService implements OnModuleInit {
    private readonly bulkUpdatesService: BulkUpdatesService;
    private tokens = new Map<string, EsdtToken>();
    private pairs = new Map<string, PairModel>();
    private farms = new Map<string, FarmModel>();
    private stakingFarms = new Map<string, StakingModel>();
    private stakingProxies = new Map<string, StakingProxyModel>();
    private feesCollector: FeesCollectorModel;
    private tokenPairs = new Map<string, string[]>();
    private tokensByType = new Map<EsdtTokenType, string[]>();
    private activePairs = new Set<string>();
    private activePairsTokens = new Set<string>();

    private commonTokenIDs: string[] = [];
    private usdcPrice: number;

    private initialized = false;

    constructor(private readonly cacheService: CacheService) {
        this.bulkUpdatesService = new BulkUpdatesService();
    }

    async onModuleInit() {
        await queueStateTasks(this.cacheService, [
            new TaskDto({
                name: StateTasks.INIT_STATE,
            }),
        ]);
    }

    isReady(): boolean {
        return this.initialized;
    }

    initState(request: InitStateRequest): InitStateResponse {
        const {
            tokens,
            pairs,
            farms,
            stakingFarms,
            stakingProxies,
            feesCollector,
            commonTokenIDs,
            usdcPrice,
        } = request;

        const lockedTokenCollection = 'XMEX-82f2f4';

        this.tokens.clear();
        this.pairs.clear();
        this.farms.clear();
        this.stakingFarms.clear();
        this.stakingProxies.clear();

        this.tokensByType.clear();
        this.tokenPairs.clear();
        this.activePairs.clear();
        this.activePairsTokens.clear();

        this.tokensByType.set(EsdtTokenType.FungibleToken, []);
        this.tokensByType.set(EsdtTokenType.FungibleLpToken, []);

        this.usdcPrice = usdcPrice;
        this.commonTokenIDs = commonTokenIDs;

        for (const token of tokens) {
            this.tokens.set(token.identifier, { ...token });
            this.tokensByType
                .get(token.type as EsdtTokenType)
                .push(token.identifier);
        }

        for (const pair of pairs.values()) {
            pair.compoundedAPR = new PairCompoundedAPRModel({
                feesAPR: pair.feesAPR ?? '0',
                farmBaseAPR: '0',
                farmBoostedAPR: '0',
                dualFarmBaseAPR: '0',
                dualFarmBoostedAPR: '0',
            });

            this.pairs.set(pair.address, { ...pair });

            if (!this.tokenPairs.has(pair.firstTokenId)) {
                this.tokenPairs.set(pair.firstTokenId, []);
            }

            if (!this.tokenPairs.has(pair.secondTokenId)) {
                this.tokenPairs.set(pair.secondTokenId, []);
            }

            this.tokenPairs.get(pair.firstTokenId).push(pair.address);
            this.tokenPairs.get(pair.secondTokenId).push(pair.address);

            if (pair.state === 'Active') {
                this.activePairs.add(pair.address);
                this.activePairsTokens.add(pair.firstTokenId);
                this.activePairsTokens.add(pair.secondTokenId);
            }
        }

        for (const farm of farms.values()) {
            const completeFarm = this.computeMissingFarmFields(farm);

            const pair = this.pairs.get(completeFarm.pairAddress);

            if (pair && completeFarm.rewardType !== FarmRewardType.DEPRECATED) {
                pair.hasFarms = true;
                pair.farmAddress = completeFarm.address;
                pair.farmRewardCollection = lockedTokenCollection;

                pair.compoundedAPR.farmBaseAPR = completeFarm.baseApr;
                pair.compoundedAPR.farmBoostedAPR = completeFarm.boostedApr;

                this.pairs.set(pair.address, pair);
            }

            this.farms.set(completeFarm.address, { ...completeFarm });
        }

        for (const stakingFarm of stakingFarms.values()) {
            const completeStakingFarm =
                this.computeMissingStakingFarmFields(stakingFarm);

            this.stakingFarms.set(completeStakingFarm.address, {
                ...completeStakingFarm,
            });
        }

        for (const stakingProxy of stakingProxies.values()) {
            const completeStakingProxy =
                this.computeMissingStakingProxyFields(stakingProxy);

            const pair = this.pairs.get(completeStakingProxy.pairAddress);
            const stakingFarm = this.stakingFarms.get(
                stakingProxy.stakingFarmAddress,
            );

            if (pair && stakingFarm) {
                pair.hasDualFarms = true;
                pair.stakingProxyAddress = stakingProxy.address;
                pair.dualFarmRewardTokenId = stakingProxy.stakingTokenId;
                pair.stakingFarmAddress = stakingProxy.stakingFarmAddress;
                pair.compoundedAPR.dualFarmBaseAPR = stakingFarm.baseApr;
                pair.compoundedAPR.dualFarmBoostedAPR =
                    stakingFarm.maxBoostedApr;
            }

            this.stakingProxies.set(completeStakingProxy.address, {
                ...completeStakingProxy,
            });
        }

        const completeFeesCollector =
            this.computeMissingFeesCollectorFields(feesCollector);

        this.feesCollector = { ...completeFeesCollector };

        this.initialized = true;

        return {
            tokensCount: this.tokens.size,
            pairsCount: this.pairs.size,
            farmsCount: this.farms.size,
            stakingFarmsCount: this.stakingFarms.size,
            stakingProxiesCount: this.stakingProxies.size,
        };
    }

    getPairs(addresses: string[], fields: string[] = []): Pairs {
        const profiler = new PerformanceProfiler();
        const result: Pairs = {
            pairs: [],
        };

        for (const address of addresses) {
            const statePair = { ...this.pairs.get(address) };

            if (!statePair) {
                throw new Error(`Pair ${address} not found`);
            }

            if (fields.length === 0) {
                result.pairs.push(statePair);
                continue;
            }

            const pair: Partial<PairModel> = {};
            for (const field of fields) {
                pair[field] = statePair[field];
            }

            result.pairs.push(pair as PairModel);
        }

        profiler.stop();
        console.log('SERVER GET PAIRS', profiler.duration);

        return result;
    }

    getFarms(addresses: string[], fields: string[] = []): Farms {
        const result: Farms = {
            farms: [],
        };

        for (const address of addresses) {
            const stateFarm = { ...this.farms.get(address) };

            if (!stateFarm) {
                throw new Error(`Farm ${address} not found`);
            }

            if (fields.length === 0) {
                result.farms.push(stateFarm);
                continue;
            }

            const farm: Partial<FarmModel> = {};
            for (const field of fields) {
                farm[field] = stateFarm[field];
            }

            result.farms.push(farm as FarmModel);
        }

        return result;
    }

    getAllFarms(request: GetAllFarmsRequest): Farms {
        const fields = request.fields?.paths ?? [];

        return this.getFarms(Array.from(this.farms.keys()), fields);
    }

    getStakingFarms(addresses: string[], fields: string[] = []): StakingFarms {
        const result: StakingFarms = {
            stakingFarms: [],
        };

        for (const address of addresses) {
            const stateStakingFarm = { ...this.stakingFarms.get(address) };

            if (!stateStakingFarm) {
                throw new Error(`Staking farm ${address} not found`);
            }

            if (fields.length === 0) {
                result.stakingFarms.push(stateStakingFarm);
                continue;
            }

            const stakingFarm: Partial<StakingModel> = {};
            for (const field of fields) {
                stakingFarm[field] = stateStakingFarm[field];
            }

            result.stakingFarms.push(stakingFarm as StakingModel);
        }

        return result;
    }

    getAllStakingFarms(request: GetAllStakingFarmsRequest): StakingFarms {
        const fields = request.fields?.paths ?? [];

        return this.getStakingFarms(
            Array.from(this.stakingFarms.keys()),
            fields,
        );
    }

    getStakingProxies(
        addresses: string[],
        fields: string[] = [],
    ): StakingProxies {
        const result: StakingProxies = {
            stakingProxies: [],
        };

        for (const address of addresses) {
            const stateStakingProxy = { ...this.stakingProxies.get(address) };

            if (!stateStakingProxy) {
                throw new Error(`Staking proxy ${address} not found`);
            }

            if (fields.length === 0) {
                result.stakingProxies.push(stateStakingProxy);
                continue;
            }

            const stakingProxy: Partial<StakingProxyModel> = {};
            for (const field of fields) {
                stakingProxy[field] = stateStakingProxy[field];
            }

            result.stakingProxies.push(stakingProxy as StakingProxyModel);
        }

        return result;
    }

    getAllStakingProxies(request: GetAllStakingProxiesRequest): StakingProxies {
        const fields = request.fields?.paths ?? [];

        return this.getStakingProxies(
            Array.from(this.stakingProxies.keys()),
            fields,
        );
    }

    getFeesCollector(request: GetFeesCollectorRequest): FeesCollectorModel {
        const fields = request.fields?.paths ?? [];

        if (fields.length === 0) {
            return { ...this.feesCollector };
        }

        const feesCollector: Partial<FeesCollectorModel> = {};
        for (const field of fields) {
            feesCollector[field] = this.feesCollector[field];
        }

        return feesCollector as FeesCollectorModel;
    }

    getWeeklyTimekeeping(
        request: GetWeeklyTimekeepingRequest,
    ): WeekTimekeepingModel {
        const fields = request.fields?.paths ?? [];
        const { address } = request;

        if (!address) {
            throw new Error(`SC Address missing`);
        }

        let time: WeekTimekeepingModel;

        if (this.farms.has(address)) {
            time = { ...this.farms.get(address).time };
        }

        if (this.stakingFarms.has(address)) {
            time = { ...this.stakingFarms.get(address).time };
        }

        if (this.feesCollector.address === address) {
            time = { ...this.feesCollector.time };
        }

        if (time === undefined) {
            throw new Error(`Could not find time for SC ${address}`);
        }

        if (fields.length === 0) {
            return time;
        }

        const partialTime: Partial<WeekTimekeepingModel> = {};
        for (const field of fields) {
            partialTime[field] = time[field];
        }

        return partialTime as WeekTimekeepingModel;
    }

    getAllPairs(request: GetAllPairsRequest): Pairs {
        const fields = request.fields?.paths ?? [];

        return this.getPairs(Array.from(this.pairs.keys()), fields);
    }

    getFilteredPairs(request: GetFilteredPairsRequest): PaginatedPairs {
        const profiler = new PerformanceProfiler();

        const fields = request.fields?.paths ?? [];
        const {
            addresses,
            issuedLpToken,
            lpTokenIds,
            firstTokenID,
            secondTokenID,
            searchToken,
            // farmTokens,
            state,
            feeState,
            hasFarms,
            hasDualFarms,
            minVolume,
            minLockedValueUSD,
            minTradesCount,
            minTradesCount24h,
            minDeployedAt,
            offset,
            limit,
            sortField,
            sortOrder,
        } = request;

        let minVolumeBN: BigNumber;
        let minLockedValueBN: BigNumber;

        if (minVolume) {
            minVolumeBN = new BigNumber(minVolume);
        }

        if (minLockedValueUSD) {
            minLockedValueBN = new BigNumber(minLockedValueUSD);
        }

        const pairAddresses: string[] = [];
        this.pairs.forEach((pair) => {
            if (issuedLpToken && !pair.liquidityPoolTokenId) {
                return;
            }

            if (addresses && !addresses.includes(pair.address)) {
                return;
            }

            if (
                lpTokenIds &&
                pair.liquidityPoolTokenId &&
                !lpTokenIds.includes(pair.liquidityPoolTokenId)
            ) {
                return;
            }

            if (firstTokenID && secondTokenID) {
                if (
                    ![firstTokenID, secondTokenID].includesEvery([
                        pair.firstTokenId,
                        pair.secondTokenId,
                    ])
                ) {
                    return;
                }
            } else if (firstTokenID && pair.firstTokenId !== firstTokenID) {
                return;
            } else if (secondTokenID && pair.secondTokenId !== secondTokenID) {
                return;
            }

            if (state && !state.includes(pair.state)) {
                return;
            }

            if (feeState !== undefined && pair.feeState !== feeState) {
                return;
            }

            if (hasFarms !== undefined && pair.hasFarms !== hasFarms) {
                return;
            }

            if (
                hasDualFarms !== undefined &&
                pair.hasDualFarms !== hasDualFarms
            ) {
                return;
            }

            if (minVolumeBN && minVolumeBN.gt(pair.volumeUSD24h)) {
                return;
            }

            if (minLockedValueBN && minLockedValueBN.gt(pair.lockedValueUSD)) {
                return;
            }

            if (minTradesCount && minTradesCount > pair.tradesCount) {
                return;
            }

            if (minTradesCount24h && minTradesCount24h > pair.tradesCount24h) {
                return;
            }

            if (minDeployedAt && minDeployedAt > pair.deployedAt) {
                return;
            }

            if (searchToken && searchToken.trim().length > 0) {
                const firstToken = this.tokens.get(pair.firstTokenId);
                const secondToken = this.tokens.get(pair.secondTokenId);
                const searchTerm = searchToken.toUpperCase().trim();

                if (
                    !firstToken.name.toUpperCase().includes(searchTerm) &&
                    !firstToken.identifier.toUpperCase().includes(searchTerm) &&
                    !firstToken.ticker.toUpperCase().includes(searchTerm) &&
                    !secondToken.name.toUpperCase().includes(searchTerm) &&
                    !secondToken.identifier
                        .toUpperCase()
                        .includes(searchTerm) &&
                    !secondToken.ticker.toUpperCase().includes(searchTerm)
                ) {
                    return;
                }
            }

            pairAddresses.push(pair.address);
        });

        if (sortField === PairSortField.PAIRS_SORT_UNSPECIFIED) {
            const { pairs } = this.getPairs(
                pairAddresses.slice(offset, offset + limit),
                fields,
            );

            return {
                count: pairAddresses.length,
                pairs,
            };
        }

        const decodedSortField = PAIR_SORT_FIELD_MAP[sortField];

        const sortedAddresses = pairAddresses
            .map((address) => ({
                address,
                sortValue: new BigNumber(
                    this.pairs.get(address)[decodedSortField],
                ),
            }))
            .sort((a, b) => {
                if (sortOrder === SortOrder.SORT_ASC) {
                    return a.sortValue.comparedTo(b.sortValue);
                }

                return b.sortValue.comparedTo(a.sortValue);
            })
            .map((item) => item.address);

        const { pairs } = this.getPairs(
            sortedAddresses.slice(offset, offset + limit),
            fields,
        );

        profiler.stop();

        console.log('SERVER FILTERED PAIRS', profiler.duration);

        return {
            count: sortedAddresses.length,
            pairs,
        };
    }

    getPairsTokens(request: GetPairsAndTokensRequest): PairsAndTokensResponse {
        const { addresses, pairFields, tokenFields } = request;

        const pairTokenFields = [
            'firstTokenId',
            'secondTokenId',
            'liquidityPoolTokenId',
        ];

        const pairFieldsIncludingTokenIds = pairFields?.paths ?? [];
        const pairFieldsToRemove: string[] = [];

        if (pairFieldsIncludingTokenIds.length) {
            pairTokenFields.forEach((field) => {
                if (!pairFieldsIncludingTokenIds.includes(field)) {
                    pairFieldsIncludingTokenIds.push(field);
                    pairFieldsToRemove.push(field);
                }
            });
        }

        const { pairs } = this.getPairs(addresses, pairFieldsIncludingTokenIds);

        let tokenIds: string[] = [];
        pairs.forEach((pair) => {
            tokenIds.push(pair.firstTokenId);
            tokenIds.push(pair.secondTokenId);
            if (pair.liquidityPoolTokenId) {
                tokenIds.push(pair.liquidityPoolTokenId);
            }
        });

        tokenIds = [...new Set(tokenIds)];

        const { tokens: firstTokens } = this.getTokens(
            pairs.map((pair) => pair.firstTokenId),
            tokenFields?.paths ?? [],
        );
        const { tokens: secondTokens } = this.getTokens(
            pairs.map((pair) => pair.secondTokenId),
            tokenFields?.paths ?? [],
        );
        const { tokens: lpTokens } = this.getTokens(
            pairs.map((pair) => pair.liquidityPoolTokenId),
            tokenFields?.paths ?? [],
        );

        const pairsWithTokens: PairAndTokens[] = pairs.map((pair, index) => {
            const responsePair = { ...pair };

            if (pairFieldsToRemove.length) {
                pairFieldsToRemove.forEach((field) => {
                    delete responsePair[field];
                });
            }
            return {
                pair: responsePair,
                firstToken: firstTokens[index],
                secondToken: secondTokens[index],
                ...(lpTokens[index] && { lpToken: lpTokens[index] }),
            };
        });

        return { pairsWithTokens };
    }

    addPair(request: AddPairRequest): void {
        const { pair, firstToken, secondToken } = request;

        pair.compoundedAPR = new PairCompoundedAPRModel({
            feesAPR: pair.feesAPR,
            farmBaseAPR: '0',
            farmBoostedAPR: '0',
            dualFarmBaseAPR: '0',
            dualFarmBoostedAPR: '0',
        });

        this.pairs.set(pair.address, { ...pair });

        if (!this.tokens.has(firstToken.identifier)) {
            this.tokens.set(firstToken.identifier, { ...firstToken });
            this.tokensByType
                .get(firstToken.type as EsdtTokenType)
                .push(firstToken.identifier);
        }

        if (!this.tokens.has(secondToken.identifier)) {
            this.tokens.set(secondToken.identifier, { ...secondToken });
            this.tokensByType
                .get(secondToken.type as EsdtTokenType)
                .push(secondToken.identifier);
        }

        if (!this.tokenPairs.has(pair.firstTokenId)) {
            this.tokenPairs.set(pair.firstTokenId, []);
        }

        if (!this.tokenPairs.has(pair.secondTokenId)) {
            this.tokenPairs.set(pair.secondTokenId, []);
        }

        this.tokenPairs.get(pair.firstTokenId).push(pair.address);
        this.tokenPairs.get(pair.secondTokenId).push(pair.address);

        if (pair.state === 'Active') {
            this.activePairs.add(pair.address);
            this.activePairsTokens.add(pair.firstTokenId);
            this.activePairsTokens.add(pair.secondTokenId);
        }

        this.recomputeValues();
    }

    addPairLpToken(request: AddPairLpTokenRequest): void {
        const { address, token } = request;

        const pair = { ...this.pairs.get(address) };

        pair.liquidityPoolTokenId = token.identifier;

        this.tokens.set(token.identifier, { ...token });
        this.pairs.set(address, pair);

        this.recomputeValues();
    }

    updatePairs(request: UpdatePairsRequest): UpdatePairsResponse {
        const { pairs: partialPairs, updateMask } = request;

        const updatedPairs = new Map<string, PairModel>();
        const failedAddresses: string[] = [];

        const nonUpdateableFields = [
            'address',
            'firstTokenId',
            'secondTokenId',
            'liquidityPoolTokenId',
        ];

        for (const partial of partialPairs) {
            if (!partial.address) {
                continue;
            }

            const pair = { ...this.pairs.get(partial.address) };

            if (!pair) {
                failedAddresses.push(partial.address);
                continue;
            }

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                if (field === 'info') {
                    const currentReserves: PairInfoModel = {
                        reserves0:
                            partial.info.reserves0 ?? pair.info.reserves0,
                        reserves1:
                            partial.info.reserves1 ?? pair.info.reserves1,
                        totalSupply:
                            partial.info.totalSupply ?? pair.info.totalSupply,
                    };
                    pair.info = currentReserves;
                } else {
                    pair[field] = partial[field];
                }
            }

            updatedPairs.set(partial.address, pair);
        }

        if (updatedPairs.size > 0) {
            updatedPairs.forEach((pair, address) => {
                this.pairs.set(address, pair);
            });
        }

        const tokensWithPriceUpdates = this.recomputeValues();

        return {
            failedAddresses,
            tokensWithPriceUpdates,
            updatedCount: updatedPairs.size,
        };
    }

    getTokens(tokenIDs: string[], fields: string[] = []): Tokens {
        const profiler = new PerformanceProfiler();

        const result: Tokens = {
            tokens: [],
        };

        if (!tokenIDs) {
            return result;
        }

        for (const tokenID of tokenIDs) {
            if (tokenID === undefined) {
                result.tokens.push(undefined);
                continue;
            }

            const stateToken = { ...this.tokens.get(tokenID) };

            if (!stateToken) {
                throw new Error(`Token ${tokenID} not found`);
            }

            if (fields.length === 0) {
                result.tokens.push(stateToken);
                continue;
            }

            const token: Partial<EsdtToken> = {};
            for (const field of fields) {
                token[field] = stateToken[field];
            }

            result.tokens.push(token as EsdtToken);
        }

        profiler.stop();
        console.log('SERVER GET TOKENS', profiler.duration);

        return result;
    }

    getAllTokens(request: GetAllTokensRequest): Tokens {
        const fields = request.fields?.paths ?? [];

        return this.getTokens(Array.from(this.tokens.keys()), fields);
    }

    getFilteredTokens(request: GetFilteredTokensRequest): PaginatedTokens {
        const profiler = new PerformanceProfiler();
        const fields = request.fields?.paths ?? [];
        const {
            enabledSwaps,
            identifiers,
            minLiquidity,
            searchToken,
            sortField,
            sortOrder,
            offset,
            limit,
        } = request;

        const tokenIDs = this.tokensByType
            .get(EsdtTokenType.FungibleToken)
            .filter((token) => {
                if (enabledSwaps && !this.activePairsTokens.has(token)) {
                    return false;
                }

                if (identifiers && !identifiers.includes(token)) {
                    return false;
                }

                let currentToken: EsdtToken;
                if (searchToken || minLiquidity) {
                    currentToken = this.tokens.get(token);
                }

                if (searchToken && searchToken.trim().length > 0) {
                    const { identifier, name, ticker } = currentToken;
                    const searchTerm = searchToken.toUpperCase().trim();

                    if (
                        !identifier.toUpperCase().includes(searchTerm) &&
                        !name.toUpperCase().includes(searchTerm) &&
                        !ticker.toUpperCase().includes(searchTerm)
                    ) {
                        return false;
                    }
                }

                if (minLiquidity) {
                    return new BigNumber(currentToken.liquidityUSD).gte(
                        minLiquidity,
                    );
                }

                return true;
            });

        if (sortField === TokenSortField.TOKENS_SORT_UNSPECIFIED) {
            const { tokens } = this.getTokens(
                tokenIDs.slice(offset, offset + limit),
                fields,
            );

            return {
                count: tokenIDs.length,
                tokens,
            };
        }

        const decodedSortField = TOKEN_SORT_FIELD_MAP[sortField];

        const sortedTokenIDs = tokenIDs
            .map((tokenID) => ({
                tokenID,
                sortValue: new BigNumber(
                    this.tokens.get(tokenID)[decodedSortField],
                ),
            }))
            .sort((a, b) => {
                if (sortOrder === SortOrder.SORT_ASC) {
                    return a.sortValue.comparedTo(b.sortValue);
                }

                return b.sortValue.comparedTo(a.sortValue);
            })
            .map((item) => item.tokenID);

        const { tokens } = this.getTokens(
            sortedTokenIDs.slice(offset, offset + limit),
            fields,
        );

        profiler.stop();

        console.log('SERVER FILTERED TOKENS', profiler.duration);

        return {
            count: tokenIDs.length,
            tokens,
        };
    }

    updateTokens(request: UpdateTokensRequest): UpdateTokensResponse {
        const { tokens: partialTokens, updateMask } = request;

        const updatedTokens = new Map<string, EsdtToken>();
        const failedIdentifiers: string[] = [];

        const nonUpdateableFields = ['identifier', 'decimals', 'type'];

        for (const partial of partialTokens) {
            if (!partial.identifier) {
                continue;
            }

            const token = { ...this.tokens.get(partial.identifier) };

            if (!token) {
                failedIdentifiers.push(partial.identifier);
                continue;
            }

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                token[field] = partial[field];
            }

            updatedTokens.set(partial.identifier, token);
        }

        if (updatedTokens.size > 0) {
            updatedTokens.forEach((token, identifier) => {
                this.tokens.set(identifier, token);
            });
        }

        this.recomputeValues();

        return {
            failedIdentifiers,
            updatedCount: updatedTokens.size,
        };
    }

    updateUsdcPrice(request: UpdateUsdcPriceRequest): UpdateUsdcPriceResponse {
        if (!request.usdcPrice) {
            return { tokensWithPriceUpdates: [] };
        }

        this.usdcPrice = request.usdcPrice;
        const tokensWithPriceUpdates = this.recomputeValues();

        return { tokensWithPriceUpdates };
    }

    private computeMissingFeesCollectorFields(
        feesCollector: FeesCollectorModel,
    ): FeesCollectorModel {
        this.refreshWeekStartAndEndEpochs(feesCollector.time);

        feesCollector.undistributedRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }
            globalInfo.rewardsDistributionForWeek = this.computeDistribution(
                globalInfo.totalRewardsForWeek,
            );
            globalInfo.apr = '0';
        });

        return feesCollector;
    }

    private computeMissingStakingProxyFields(
        stakingProxy: StakingProxyModel,
    ): StakingProxyModel {
        const stakingFarm = this.stakingFarms.get(
            stakingProxy.stakingFarmAddress,
        );

        stakingProxy.stakingMinUnboundEpochs =
            stakingFarm?.minUnboundEpochs ?? 0;

        return stakingProxy;
    }

    private computeMissingStakingFarmFields(
        stakingFarm: StakingModel,
    ): StakingModel {
        this.refreshWeekStartAndEndEpochs(stakingFarm.time);

        stakingFarm.boosterRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }
            globalInfo.rewardsDistributionForWeek = this.computeDistribution(
                globalInfo.totalRewardsForWeek,
            );
            globalInfo.apr = '0';
        });

        const farmingToken = this.tokens.get(stakingFarm.farmingTokenId);

        stakingFarm.isProducingRewards =
            !stakingFarm.produceRewardsEnabled ||
            new BigNumber(stakingFarm.accumulatedRewards).isEqualTo(
                stakingFarm.rewardCapacity,
            )
                ? false
                : true;

        stakingFarm.rewardsPerBlockAPRBound =
            this.computeRewardsPerBlockAPRBound(
                stakingFarm.farmTokenSupply,
                stakingFarm.annualPercentageRewards,
            );

        stakingFarm.rewardsRemainingDays = this.computeRewardsRemainingDaysBase(
            stakingFarm.perBlockRewards,
            stakingFarm.rewardCapacity,
            stakingFarm.accumulatedRewards,
            stakingFarm.rewardsPerBlockAPRBound,
        );

        stakingFarm.rewardsRemainingDaysUncapped =
            this.computeRewardsRemainingDaysBase(
                stakingFarm.perBlockRewards,
                stakingFarm.rewardCapacity,
                stakingFarm.accumulatedRewards,
            );

        stakingFarm.farmingTokenPriceUSD = farmingToken.price;

        stakingFarm.stakedValueUSD = computeValueUSD(
            stakingFarm.farmTokenSupply,
            stakingFarm.farmTokenDecimals,
            stakingFarm.farmingTokenPriceUSD,
        ).toFixed();

        const rewardsAPRBounded = new BigNumber(
            stakingFarm.rewardsPerBlockAPRBound,
        ).multipliedBy(constantsConfig.BLOCKS_IN_YEAR);

        stakingFarm.apr = this.computeStakeFarmAPR(
            stakingFarm.isProducingRewards,
            stakingFarm.perBlockRewards,
            stakingFarm.farmTokenSupply,
            stakingFarm.annualPercentageRewards,
            rewardsAPRBounded,
        );

        stakingFarm.aprUncapped = this.computeStakeFarmUncappedAPR(
            stakingFarm.perBlockRewards,
            stakingFarm.farmTokenSupply,
            stakingFarm.isProducingRewards,
        );

        stakingFarm.boostedApr = this.computeBoostedAPR(
            stakingFarm.boostedYieldsRewardsPercenatage,
            stakingFarm.apr,
        );

        stakingFarm.baseApr = new BigNumber(stakingFarm.apr)
            .minus(stakingFarm.boostedApr)
            .toFixed();

        stakingFarm.maxBoostedApr = this.computeMaxBoostedApr(
            stakingFarm.baseApr,
            stakingFarm.boostedYieldsFactors,
            stakingFarm.boostedYieldsRewardsPercenatage,
        );

        stakingFarm.optimalEnergyPerStaking =
            this.calculateOptimalEnergyPerStaking(stakingFarm);

        return stakingFarm;
    }

    private computeMissingFarmFields(farm: FarmModel): FarmModel {
        this.refreshWeekStartAndEndEpochs(farm.time);

        farm.boosterRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }
            globalInfo.rewardsDistributionForWeek = this.computeDistribution(
                globalInfo.totalRewardsForWeek,
            );
            globalInfo.apr = '0';
        });

        const pair = this.pairs.get(farm.pairAddress);
        const farmedToken = this.tokens.get(farm.farmedTokenId);

        farm.farmedTokenPriceUSD = farmedToken.price;
        farm.farmingTokenPriceUSD = pair.liquidityPoolTokenPriceUSD;
        farm.farmTokenPriceUSD = pair.liquidityPoolTokenPriceUSD;

        farm.totalValueLockedUSD = computeValueUSD(
            farm.farmTokenSupply,
            farm.farmTokenDecimals,
            farm.farmTokenPriceUSD,
        ).toFixed();

        const totalRewardsPerYear = new BigNumber(farm.perBlockRewards)
            .multipliedBy(constantsConfig.BLOCKS_IN_YEAR)
            .toFixed();

        const totalRewardsPerYearUSD = computeValueUSD(
            totalRewardsPerYear,
            farmedToken.decimals,
            farmedToken.price,
        );

        const baseApr = this.computeBaseRewards(
            totalRewardsPerYearUSD,
            farm.boostedYieldsRewardsPercenatage,
        ).div(farm.totalValueLockedUSD);

        farm.baseApr = baseApr.toFixed();
        farm.boostedApr = baseApr
            .multipliedBy(farm.boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(farm.boostedYieldsRewardsPercenatage)
            .dividedBy(
                constantsConfig.MAX_PERCENT -
                    farm.boostedYieldsRewardsPercenatage,
            )
            .toFixed();

        farm.boostedRewardsPerWeek = this.calculateBoostedRewardsPerWeek(farm);
        farm.optimalEnergyPerLp = this.calculateOptimalEnergyPerLP(farm);

        return farm;
    }

    private computeStakeFarmAPR(
        isProducingRewards: boolean,
        perBlockRewardAmount: string,
        farmTokenSupply: string,
        annualPercentageRewards: string,
        rewardsAPRBounded: BigNumber,
    ): string {
        if (!isProducingRewards) {
            return '0';
        }

        const rewardsUnboundedBig = new BigNumber(perBlockRewardAmount).times(
            constantsConfig.BLOCKS_IN_YEAR,
        );
        const stakedValueBig = new BigNumber(farmTokenSupply);

        return rewardsUnboundedBig.isLessThan(rewardsAPRBounded.integerValue())
            ? rewardsUnboundedBig.dividedBy(stakedValueBig).toFixed()
            : new BigNumber(annualPercentageRewards)
                  .dividedBy(constantsConfig.MAX_PERCENT)
                  .toFixed();
    }

    private computeStakeFarmUncappedAPR(
        perBlockRewardAmount: string,
        farmTokenSupply: string,
        isProducingRewards: boolean,
    ): string {
        if (!isProducingRewards) {
            return '0';
        }

        const rewardsUnboundedBig = new BigNumber(
            perBlockRewardAmount,
        ).multipliedBy(constantsConfig.BLOCKS_IN_YEAR);

        return rewardsUnboundedBig.dividedBy(farmTokenSupply).toFixed();
    }

    private computeBoostedAPR(
        boostedYieldsRewardsPercentage: number,
        apr: string,
    ): string {
        const bnBoostedRewardsPercentage = new BigNumber(
            boostedYieldsRewardsPercentage,
        )
            .dividedBy(constantsConfig.MAX_PERCENT)
            .multipliedBy(100);

        const boostedAPR = new BigNumber(apr).multipliedBy(
            bnBoostedRewardsPercentage.dividedBy(100),
        );

        return boostedAPR.toFixed();
    }

    private computeMaxBoostedApr(
        baseAPR: string,
        boostedYieldsFactors: BoostedYieldsFactors,
        boostedYieldsRewardsPercentage: number,
    ): string {
        const bnRawMaxBoostedApr = new BigNumber(baseAPR)
            .multipliedBy(boostedYieldsFactors.maxRewardsFactor)
            .multipliedBy(boostedYieldsRewardsPercentage)
            .dividedBy(
                constantsConfig.MAX_PERCENT - boostedYieldsRewardsPercentage,
            );

        return bnRawMaxBoostedApr.toFixed();
    }

    private computeRewardsPerBlockAPRBound(
        farmTokenSupply: string,
        annualPercentageRewards: string,
    ): string {
        return new BigNumber(farmTokenSupply)
            .multipliedBy(annualPercentageRewards)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .dividedBy(constantsConfig.BLOCKS_IN_YEAR)
            .toFixed();
    }

    private computeRewardsRemainingDaysBase(
        perBlockRewardAmount: string,
        rewardsCapacity: string,
        accumulatedRewards: string,
        extraRewardsAPRBoundedPerBlock?: string,
    ): number {
        const perBlockRewards = extraRewardsAPRBoundedPerBlock
            ? BigNumber.min(
                  extraRewardsAPRBoundedPerBlock,
                  perBlockRewardAmount,
              )
            : new BigNumber(perBlockRewardAmount);

        // 10 blocks per minute * 60 minutes per hour * 24 hours per day
        const blocksInDay = 10 * 60 * 24;

        return parseFloat(
            new BigNumber(rewardsCapacity)
                .minus(accumulatedRewards)
                .dividedBy(perBlockRewards)
                .dividedBy(blocksInDay)
                .toFixed(2),
        );
    }

    private computeBaseRewards(
        totalFarmRewards: BigNumber,
        boostedYieldsRewardsPercenatage: number,
    ): BigNumber {
        const boostedYieldsRewardsPercenatageBig = new BigNumber(
            boostedYieldsRewardsPercenatage,
        );

        if (boostedYieldsRewardsPercenatageBig.isPositive()) {
            const boosterFarmRewardsCut = totalFarmRewards
                .multipliedBy(boostedYieldsRewardsPercenatageBig)
                .dividedBy(constantsConfig.MAX_PERCENT);
            return totalFarmRewards.minus(boosterFarmRewardsCut);
        }
        return totalFarmRewards;
    }

    private computeWeekAPR(
        totalLockedTokensForWeek: string,
        totalRewardsForWeek: EsdtTokenPayment[],
        baseAssetToken: EsdtToken,
        lockedTokenId: string,
    ): string {
        if (!scAddress.has(baseAssetToken.identifier)) {
            return '0';
        }

        const tokenPriceUSD = scAddress.has(baseAssetToken.identifier)
            ? baseAssetToken.price
            : '0';

        const totalLockedTokensForWeekPriceUSD = new BigNumber(
            totalLockedTokensForWeek,
        )
            .multipliedBy(new BigNumber(tokenPriceUSD))
            .toFixed();

        const totalRewardsForWeekPriceUSD = this.computeTotalRewardsForWeekUSD(
            totalRewardsForWeek,
            baseAssetToken.identifier,
            lockedTokenId,
        );

        const weekAPR = new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD);

        return weekAPR.isNaN() || !weekAPR.isFinite() ? '0' : weekAPR.toFixed();
    }

    private computeTotalRewardsForWeekUSD(
        totalRewardsForWeek: EsdtTokenPayment[],
        baseAssetTokenId: string,
        lockedTokenId: string,
    ): string {
        return totalRewardsForWeek
            .reduce((acc, reward) => {
                const tokenID =
                    reward.tokenID === lockedTokenId
                        ? baseAssetTokenId
                        : reward.tokenID;

                const token = this.tokens.get(tokenID);

                if (!token) {
                    throw new Error(`Token ${reward.tokenID} missing`);
                }

                const rewardUSD = computeValueUSD(
                    reward.amount,
                    token.decimals,
                    token.price,
                );
                return acc.plus(rewardUSD);
            }, new BigNumber(0))
            .toFixed();
    }

    private computeDistribution(
        payments: EsdtTokenPayment[],
    ): TokenDistributionModel[] {
        let totalPriceUSD = new BigNumber(0);
        const paymentsValueUSD = payments.map((payment) => {
            const token = this.tokens.get(payment.tokenID);

            if (!token) {
                throw new Error(`Token ${payment.tokenID} missing`);
            }

            const reward = computeValueUSD(
                payment.amount,
                token.decimals,
                token.price,
            );

            totalPriceUSD = totalPriceUSD.plus(reward);
            return reward;
        });

        return payments.map((payment, index) => {
            const valueUSD = paymentsValueUSD[index];
            const percentage = totalPriceUSD.isZero()
                ? '0.0000'
                : valueUSD
                      .dividedBy(totalPriceUSD)
                      .multipliedBy(100)
                      .toFixed(4);
            return new TokenDistributionModel({
                tokenId: payment.tokenID,
                percentage,
            });
        });
    }

    private refreshWeekStartAndEndEpochs(time: WeekTimekeepingModel): void {
        time.startEpochForWeek =
            time.firstWeekStartEpoch +
            (time.currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
        time.endEpochForWeek =
            time.startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;
    }

    private calculateBoostedRewardsPerWeek(farm: FarmModel): string {
        const blocksInWeek = 14440 * 7;
        const totalRewardsPerWeek = new BigNumber(
            farm.perBlockRewards,
        ).multipliedBy(blocksInWeek);

        return totalRewardsPerWeek
            .multipliedBy(farm.boostedYieldsRewardsPercenatage)
            .dividedBy(constantsConfig.MAX_PERCENT)
            .integerValue()
            .toFixed();
    }

    private calculateOptimalEnergyPerLP(farm: FarmModel): string {
        const u = farm.boostedYieldsFactors.maxRewardsFactor;
        const A = farm.boostedYieldsFactors.userRewardsFarm;
        const B = farm.boostedYieldsFactors.userRewardsEnergy;

        const currentWeekGlobalInfo = farm.boosterRewards.find(
            (item) => item.week === farm.time.currentWeek,
        );

        if (currentWeekGlobalInfo === undefined) {
            throw new Error(
                `Missing farm rewards global info for ${farm.address}`,
            );
        }

        const optimisationConstant = new BigNumber(u)
            .multipliedBy(new BigNumber(A).plus(B))
            .minus(A)
            .dividedBy(B);
        return optimisationConstant
            .multipliedBy(currentWeekGlobalInfo.totalEnergyForWeek)
            .dividedBy(farm.farmTokenSupply)
            .integerValue()
            .toFixed();
    }

    private calculateOptimalEnergyPerStaking(
        stakingFarm: StakingModel,
    ): string {
        const u = stakingFarm.boostedYieldsFactors.maxRewardsFactor;
        const A = stakingFarm.boostedYieldsFactors.userRewardsFarm;
        const B = stakingFarm.boostedYieldsFactors.userRewardsEnergy;

        const currentWeekGlobalInfo = stakingFarm.boosterRewards.find(
            (item) => item.week === stakingFarm.time.currentWeek,
        );

        if (currentWeekGlobalInfo === undefined) {
            throw new Error(
                `Missing staking farm rewards global info for ${stakingFarm.address}`,
            );
        }

        const optimisationConstant = new BigNumber(u)
            .multipliedBy(new BigNumber(A).plus(B))
            .minus(A)
            .dividedBy(B);
        return optimisationConstant
            .multipliedBy(currentWeekGlobalInfo.totalEnergyForWeek)
            .dividedBy(stakingFarm.farmTokenSupply)
            .integerValue()
            .toFixed();
    }

    private recomputeValues(): string[] {
        return this.bulkUpdatesService.recomputeAllValues(
            this.pairs,
            this.tokens,
            this.usdcPrice,
            this.commonTokenIDs,
        );
    }
}
