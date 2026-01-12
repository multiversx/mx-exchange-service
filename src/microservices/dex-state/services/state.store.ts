import { Injectable } from '@nestjs/common';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { FarmModel } from 'src/modules/farm/models/farm.v2.model';
import { StakingModel } from 'src/modules/staking/models/staking.model';
import { StakingProxyModel } from 'src/modules/staking-proxy/models/staking.proxy.model';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';

@Injectable()
export class StateStore {
    // Primary data stores
    private readonly _tokens = new Map<string, EsdtToken>();
    private readonly _pairs = new Map<string, PairModel>();
    private readonly _farms = new Map<string, FarmModel>();
    private readonly _stakingFarms = new Map<string, StakingModel>();
    private readonly _stakingProxies = new Map<string, StakingProxyModel>();
    private _feesCollector: FeesCollectorModel;

    // Derived indexes for query optimization
    private readonly _tokenPairs = new Map<string, string[]>();
    private readonly _tokensByType = new Map<EsdtTokenType, string[]>();
    private readonly _activePairs = new Set<string>();
    private readonly _activePairsTokens = new Set<string>();

    // Global state
    private _commonTokenIDs: string[] = [];
    private _usdcPrice = 0;
    private _initialized = false;

    // Getters for read access
    get tokens(): Map<string, EsdtToken> {
        return this._tokens;
    }

    get pairs(): Map<string, PairModel> {
        return this._pairs;
    }

    get farms(): Map<string, FarmModel> {
        return this._farms;
    }

    get stakingFarms(): Map<string, StakingModel> {
        return this._stakingFarms;
    }

    get stakingProxies(): Map<string, StakingProxyModel> {
        return this._stakingProxies;
    }

    get feesCollector(): FeesCollectorModel {
        return this._feesCollector;
    }

    get tokenPairs(): Map<string, string[]> {
        return this._tokenPairs;
    }

    get tokensByType(): Map<EsdtTokenType, string[]> {
        return this._tokensByType;
    }

    get activePairs(): Set<string> {
        return this._activePairs;
    }

    get activePairsTokens(): Set<string> {
        return this._activePairsTokens;
    }

    get commonTokenIDs(): string[] {
        return this._commonTokenIDs;
    }

    get usdcPrice(): number {
        return this._usdcPrice;
    }

    isInitialized(): boolean {
        return this._initialized;
    }

    // Setters for controlled mutation
    setToken(identifier: string, token: EsdtToken): void {
        this._tokens.set(identifier, token);
    }

    setPair(address: string, pair: PairModel): void {
        this._pairs.set(address, pair);
    }

    setFarm(address: string, farm: FarmModel): void {
        this._farms.set(address, farm);
    }

    setStakingFarm(address: string, stakingFarm: StakingModel): void {
        this._stakingFarms.set(address, stakingFarm);
    }

    setStakingProxy(address: string, stakingProxy: StakingProxyModel): void {
        this._stakingProxies.set(address, stakingProxy);
    }

    setFeesCollector(feesCollector: FeesCollectorModel): void {
        this._feesCollector = feesCollector;
    }

    setCommonTokenIDs(ids: string[]): void {
        this._commonTokenIDs = ids;
    }

    setUsdcPrice(price: number): void {
        this._usdcPrice = price;
    }

    setInitialized(initialized: boolean): void {
        this._initialized = initialized;
    }

    // Index management
    addTokenPair(tokenId: string, pairAddress: string): void {
        if (!this._tokenPairs.has(tokenId)) {
            this._tokenPairs.set(tokenId, []);
        }
        this._tokenPairs.get(tokenId).push(pairAddress);
    }

    addTokenByType(type: EsdtTokenType, tokenId: string): void {
        if (!this._tokensByType.has(type)) {
            this._tokensByType.set(type, []);
        }
        this._tokensByType.get(type).push(tokenId);
    }

    addActivePair(address: string): void {
        this._activePairs.add(address);
    }

    addActivePairsToken(tokenId: string): void {
        this._activePairsTokens.add(tokenId);
    }

    // Clear methods for initialization
    clearAll(): void {
        this._tokens.clear();
        this._pairs.clear();
        this._farms.clear();
        this._stakingFarms.clear();
        this._stakingProxies.clear();
        this._feesCollector = undefined;

        this._tokenPairs.clear();
        this._tokensByType.clear();
        this._activePairs.clear();
        this._activePairsTokens.clear();

        this._tokensByType.set(EsdtTokenType.FungibleToken, []);
        this._tokensByType.set(EsdtTokenType.FungibleLpToken, []);

        this._initialized = false;
    }
}
