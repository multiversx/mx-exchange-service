import { Observable } from 'rxjs';
import { FieldMask } from './google/protobuf/field_mask.interfaces';
import { Pair } from './pairs.interfaces';
import { Token, TokenType } from './tokens.interfaces';

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
    pairs: Pair[];
}

export interface PaginatedPairs {
    pairs: Pair[];
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

export interface GetPairTokensRequest {
    address: string;
    fields: string[] | undefined;
}

export interface PairTokens {
    firstToken: Token | undefined;
    secondToken: Token | undefined;
}

export interface Tokens {
    tokens: Token[];
}

export interface PaginatedTokens {
    tokens: Token[];
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
    type: TokenType;
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
    fields: string[] | undefined;
}

export const DEX_STATE_PACKAGE_NAME = 'dex_state';

export interface IDexStateServiceClient {
    getPairs(request: GetPairsRequest): Observable<Pairs>;

    getFilteredPairs(
        request: GetFilteredPairsRequest,
    ): Observable<PaginatedPairs>;

    getAllPairs(request: GetAllPairsRequest): Observable<Pairs>;

    // getPairTokens(request: GetPairTokensRequest): Observable<PairTokens>;

    getTokens(request: GetTokensRequest): Observable<Tokens>;

    getFilteredTokens(
        request: GetFilteredTokensRequest,
    ): Observable<PaginatedTokens>;

    getAllTokens(request: GetAllTokensRequest): Observable<Tokens>;

    // getTokenPairs(request: GetTokenPairsRequest): Observable<Pairs>;
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

    // getPairTokens(
    //     request: GetPairTokensRequest,
    // ): Promise<PairTokens> | Observable<PairTokens> | PairTokens;

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
}

export const DEX_STATE_SERVICE_NAME = 'DexStateService';
