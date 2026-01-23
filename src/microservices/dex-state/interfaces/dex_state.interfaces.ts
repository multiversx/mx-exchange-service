import { Observable } from 'rxjs';
import { FieldMask } from './google/protobuf/field_mask.interfaces';
import { Empty } from './google/protobuf/empty.interfaces';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FarmModelV2 } from 'src/modules/farm/models/farm.v2.model';

export const protobufPackage = 'dex_state';

export enum TokenSortField {
    TOKENS_SORT_UNSPECIFIED = 0,
    TOKENS_SORT_PRICE = 1,
    TOKENS_SORT_VOLUME = 2,
    TOKENS_SORT_PREV_24H_PRICE = 3,
    TOKENS_SORT_PREV_7D_PRICE = 4,
    TOKENS_SORT_PREV_24H_VOLUME = 5,
    TOKENS_SORT_PRICE_CHANGE_7D = 6,
    TOKENS_SORT_PRICE_CHANGE_24H = 7,
    TOKENS_SORT_VOLUME_CHANGE_24H = 8,
    TOKENS_SORT_TRADES_CHANGE_24H = 9,
    TOKENS_SORT_LIQUIDITY = 10,
    TOKENS_SORT_TRADES_COUNT = 11,
    TOKENS_SORT_TRENDING_SCORE = 12,
    TOKENS_SORT_CREATED_AT = 13,
    UNRECOGNIZED = -1,
}

export enum PairSortField {
    PAIRS_SORT_UNSPECIFIED = 0,
    PAIRS_SORT_TRADES_COUNT = 1,
    PAIRS_SORT_TRADES_COUNT_24H = 2,
    PAIRS_SORT_TVL = 3,
    PAIRS_SORT_VOLUME = 4,
    PAIRS_SORT_FEES = 5,
    PAIRS_SORT_DEPLOYED_AT = 6,
    PAIRS_SORT_APR = 7,
    UNRECOGNIZED = -1,
}

export enum SortOrder {
    SORT_ORDER_UNSPECIFIED = 0,
    SORT_ASC = 1,
    SORT_DESC = 2,
    UNRECOGNIZED = -1,
}

export interface Pairs {
    pairs: PairModel[];
}

export interface PaginatedPairs {
    pairs: PairModel[];
    count: number;
}

export interface GetPairsRequest {
    addresses: string[];
    fields: FieldMask;
}

export interface GetFilteredPairsRequest {
    addresses: string[];
    state: string[];
    lpTokenIds: string[];
    farmTokens: string[];
    firstTokenID: string;
    secondTokenID: string;
    searchToken: string;
    minVolume: number;
    minLockedValueUSD: number;
    minTradesCount: number;
    minTradesCount24h: number;
    minDeployedAt: number;
    issuedLpToken: boolean;
    feeState: boolean;
    hasFarms: boolean;
    hasDualFarms: boolean;
    offset: number;
    limit: number;
    sortField: PairSortField;
    sortOrder: SortOrder;
    fields: FieldMask;
}

export interface GetAllPairsRequest {
    fields: FieldMask;
}

export interface GetPairsAndTokensRequest {
    addresses: string[];
    pairFields: FieldMask;
    tokenFields: FieldMask;
}

export interface PairsAndTokensResponse {
    pairsWithTokens: PairAndTokens[];
}

export interface PairAndTokens {
    pair: PairModel;
    firstToken: EsdtToken;
    secondToken: EsdtToken;
    lpToken?: EsdtToken;
}

export interface Tokens {
    tokens: EsdtToken[];
}

export interface PaginatedTokens {
    tokens: EsdtToken[];
    count: number;
}

export interface GetTokensRequest {
    identifiers: string[];
    fields: FieldMask;
}

export interface GetFilteredTokensRequest {
    identifiers: string[];
    enabledSwaps: boolean;
    searchToken: string;
    minLiquidity: number;
    type: string;
    offset: number;
    limit: number;
    sortField: TokenSortField;
    sortOrder: SortOrder;
    fields: FieldMask;
}

export interface GetAllTokensRequest {
    fields: FieldMask;
}

export interface GetTokenPairsRequest {
    identifier: string;
    fields: FieldMask;
}

export interface UpdatePairsRequest {
    pairs: PairModel[];
    updateMask: FieldMask;
}

export interface UpdatePairsResponse {
    updatedCount: number;
    tokensWithPriceUpdates: string[];
    failedAddresses: string[];
}

export interface UpdateTokensRequest {
    tokens: EsdtToken[];
    updateMask: FieldMask;
}

export interface UpdateTokensResponse {
    updatedCount: number;
    failedIdentifiers: string[];
}

export interface InitStateRequest {
    tokens: EsdtToken[];
    pairs: PairModel[];
    farms: FarmModelV2[];
    stakingFarms: StakingModel[];
    stakingProxies: StakingProxyModel[];
    feesCollector: FeesCollectorModel;
    commonTokenIDs: string[];
    usdcPrice: number;
    lockedTokenCollection: string;
}

export interface InitStateResponse {
    pairsCount: number;
    tokensCount: number;
    farmsCount: number;
    stakingFarmsCount: number;
    stakingProxiesCount: number;
}

export interface AddPairRequest {
    pair: PairModel;
    firstToken: EsdtToken;
    secondToken: EsdtToken;
}

export interface AddTokenRequest {
    token: EsdtToken;
}

export interface AddPairLpTokenRequest {
    address: string;
    token: EsdtToken | undefined;
}

export interface Farms {
    farms: FarmModelV2[];
}

export interface StakingFarms {
    stakingFarms: StakingModel[];
}

export interface StakingProxies {
    stakingProxies: StakingProxyModel[];
}

export interface GetFarmsRequest {
    addresses: string[];
    fields: FieldMask;
}

export interface GetAllFarmsRequest {
    fields: FieldMask;
}

export interface UpdateFarmsRequest {
    farms: FarmModelV2[];
    updateMask: FieldMask;
}

export interface UpdateFarmsResponse {
    updatedCount: number;
    failedAddresses: string[];
}

export interface GetStakingFarmsRequest {
    addresses: string[];
    fields: FieldMask;
}

export interface GetAllStakingFarmsRequest {
    fields: FieldMask;
}

export interface UpdateStakingFarmsRequest {
    stakingFarms: StakingModel[];
    updateMask: FieldMask;
}

export interface UpdateStakingFarmsResponse {
    updatedCount: number;
    failedAddresses: string[];
}

export interface GetStakingProxiesRequest {
    addresses: string[];
    fields: FieldMask;
}

export interface GetAllStakingProxiesRequest {
    fields: FieldMask;
}

export interface GetFeesCollectorRequest {
    fields: FieldMask;
}

export interface UpdateFeesCollectorRequest {
    feesCollector: FeesCollectorModel;
    updateMask: FieldMask;
}

export interface GetWeeklyTimekeepingRequest {
    address: string;
    fields: FieldMask;
}

export interface UpdateUsdcPriceRequest {
    usdcPrice: number;
}

export interface UpdateUsdcPriceResponse {
    tokensWithPriceUpdates: string[];
}

export const DEX_STATE_PACKAGE_NAME = 'dex_state';

export interface IDexStateServiceClient {
    getPairs(request: GetPairsRequest): Observable<Pairs>;

    getFilteredPairs(
        request: GetFilteredPairsRequest,
    ): Observable<PaginatedPairs>;

    getAllPairs(request: GetAllPairsRequest): Observable<Pairs>;

    getPairsTokens(
        request: GetPairsAndTokensRequest,
    ): Observable<PairsAndTokensResponse>;

    getTokens(request: GetTokensRequest): Observable<Tokens>;

    getFilteredTokens(
        request: GetFilteredTokensRequest,
    ): Observable<PaginatedTokens>;

    getAllTokens(request: GetAllTokensRequest): Observable<Tokens>;

    // getTokenPairs(request: GetTokenPairsRequest): Observable<Pairs>;

    initState(request: InitStateRequest): Observable<InitStateResponse>;

    updatePairs(request: UpdatePairsRequest): Observable<UpdatePairsResponse>;

    addPair(request: AddPairRequest): Observable<Empty>;

    addPairLpToken(request: AddPairLpTokenRequest): Observable<Empty>;

    updateTokens(
        request: UpdateTokensRequest,
    ): Observable<UpdateTokensResponse>;

    //  addToken(request: AddTokenRequest): Observable<Empty>;

    getFarms(request: GetFarmsRequest): Observable<Farms>;

    getAllFarms(request: GetAllFarmsRequest): Observable<Farms>;

    updateFarms(request: UpdateFarmsRequest): Observable<UpdateFarmsResponse>;

    getStakingFarms(request: GetStakingFarmsRequest): Observable<StakingFarms>;

    getAllStakingFarms(
        request: GetAllStakingFarmsRequest,
    ): Observable<StakingFarms>;

    updateStakingFarms(
        request: UpdateStakingFarmsRequest,
    ): Observable<UpdateStakingFarmsResponse>;

    getStakingProxies(
        request: GetStakingProxiesRequest,
    ): Observable<StakingProxies>;

    getAllStakingProxies(
        request: GetAllStakingProxiesRequest,
    ): Observable<StakingProxies>;

    getFeesCollector(
        request: GetFeesCollectorRequest,
    ): Observable<FeesCollectorModel>;

    updateFeesCollector(request: UpdateFeesCollectorRequest): Observable<Empty>;

    getWeeklyTimekeeping(
        request: GetWeeklyTimekeepingRequest,
    ): Observable<WeekTimekeepingModel>;

    updateUsdcPrice(
        request: UpdateUsdcPriceRequest,
    ): Observable<UpdateUsdcPriceResponse>;
}

export interface IDexStateService {
    getPairs(
        request: GetPairsRequest,
    ): Promise<Pairs> | Observable<Pairs> | Pairs;

    getFilteredPairs(
        request: GetFilteredPairsRequest,
    ): Promise<PaginatedPairs> | Observable<PaginatedPairs> | PaginatedPairs;

    getAllPairs(
        request: GetAllPairsRequest,
    ): Promise<Pairs> | Observable<Pairs> | Pairs;

    getPairsTokens(
        request: GetPairsAndTokensRequest,
    ):
        | Promise<PairsAndTokensResponse>
        | Observable<PairsAndTokensResponse>
        | PairsAndTokensResponse;

    getTokens(
        request: GetTokensRequest,
    ): Promise<Tokens> | Observable<Tokens> | Tokens;

    getFilteredTokens(
        request: GetFilteredTokensRequest,
    ): Promise<PaginatedTokens> | Observable<PaginatedTokens> | PaginatedTokens;

    getAllTokens(
        request: GetFilteredTokensRequest,
    ): Promise<Tokens> | Observable<Tokens> | Tokens;

    // getTokenPairs(
    //     request: GetTokenPairsRequest,
    // ): Promise<Pairs> | Observable<Pairs> | Pairs;

    initState(
        request: InitStateRequest,
    ):
        | Promise<InitStateResponse>
        | Observable<InitStateResponse>
        | InitStateResponse;

    updatePairs(
        request: UpdatePairsRequest,
    ):
        | Promise<UpdatePairsResponse>
        | Observable<UpdatePairsResponse>
        | UpdatePairsResponse;

    addPair(request: AddPairRequest): void;

    addPairLpToken(request: AddPairLpTokenRequest): void;

    updateTokens(
        request: UpdateTokensRequest,
    ):
        | Promise<UpdateTokensResponse>
        | Observable<UpdateTokensResponse>
        | UpdateTokensResponse;

    getFarms(
        request: GetFarmsRequest,
    ): Promise<Farms> | Observable<Farms> | Farms;

    getAllFarms(
        request: GetAllFarmsRequest,
    ): Promise<Farms> | Observable<Farms> | Farms;

    updateFarms(
        request: UpdateFarmsRequest,
    ):
        | Promise<UpdateFarmsResponse>
        | Observable<UpdateFarmsResponse>
        | UpdateFarmsResponse;

    getStakingFarms(
        request: GetStakingFarmsRequest,
    ): Promise<StakingFarms> | Observable<StakingFarms> | StakingFarms;

    getAllStakingFarms(
        request: GetAllStakingFarmsRequest,
    ): Promise<StakingFarms> | Observable<StakingFarms> | StakingFarms;

    updateStakingFarms(
        request: UpdateStakingFarmsRequest,
    ):
        | Promise<UpdateStakingFarmsResponse>
        | Observable<UpdateStakingFarmsResponse>
        | UpdateStakingFarmsResponse;

    getStakingProxies(
        request: GetStakingProxiesRequest,
    ): Promise<StakingProxies> | Observable<StakingProxies> | StakingProxies;

    getAllStakingProxies(
        request: GetAllStakingProxiesRequest,
    ): Promise<StakingProxies> | Observable<StakingProxies> | StakingProxies;

    getFeesCollector(
        request: GetFeesCollectorRequest,
    ):
        | Promise<FeesCollectorModel>
        | Observable<FeesCollectorModel>
        | FeesCollectorModel;

    updateFeesCollector(request: UpdateFeesCollectorRequest): void;

    getWeeklyTimekeeping(
        request: GetWeeklyTimekeepingRequest,
    ):
        | Promise<WeekTimekeepingModel>
        | Observable<WeekTimekeepingModel>
        | WeekTimekeepingModel;

    updateUsdcPrice(
        request: UpdateUsdcPriceRequest,
    ):
        | Promise<UpdateUsdcPriceResponse>
        | Observable<UpdateUsdcPriceResponse>
        | UpdateUsdcPriceResponse;
}

export const DEX_STATE_SERVICE_NAME = 'DexStateService';
