import {
    PairFilterArgs,
    PairsFilter,
} from 'src/modules/router/models/filter.args';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { PairModel } from '../models/pair.model';
import { PairService } from './pair.service';
import { PairComputeService } from './pair.compute.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairFilteringService } from './pair.filtering.service';

export class PairsMetadataBuilder {
    private pairs: PairModel[];
    private filters: PairsFilter | PairFilterArgs;
    private pairService: PairService;
    private pairCompute: PairComputeService;
    private lpTokensIndexed: boolean;

    constructor(pairService: PairService, pairCompute: PairComputeService) {
        this.pairService = pairService;
        this.pairCompute = pairCompute;
        this.lpTokensIndexed = false;
    }

    static get availableFilters() {
        return Object.getOwnPropertyNames(
            PairsMetadataBuilder.prototype,
        ).filter(
            (prop) =>
                prop.startsWith('filterBy') &&
                typeof this.prototype[prop] === 'function',
        );
    }

    async applyAllFilters(
        pairsMetadata: PairMetadata[],
        filters: PairsFilter | PairFilterArgs,
    ): Promise<PairsMetadataBuilder> {
        this.pairs = pairsMetadata.map(
            (pairMetadata) =>
                new PairModel({
                    address: pairMetadata.address,
                    firstToken: new EsdtToken({
                        identifier: pairMetadata.firstTokenID,
                    }),
                    secondToken: new EsdtToken({
                        identifier: pairMetadata.secondTokenID,
                    }),
                }),
        );
        this.filters = filters;
        for (const filterFunction of PairsMetadataBuilder.availableFilters) {
            await this[filterFunction]();
        }

        return this;
    }

    async filterByIssuedLpToken(): Promise<PairsMetadataBuilder> {
        await this.indexLpTokens();

        this.pairs = PairFilteringService.pairsByIssuedLpToken(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByAddress(): Promise<PairsMetadataBuilder> {
        this.pairs = PairFilteringService.pairsByAddress(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByTokens(): Promise<PairsMetadataBuilder> {
        if (this.filters instanceof PairsFilter) {
            const pairsFirstToken = await this.pairService.getAllFirstTokens(
                this.pairs.map((pair) => pair.address),
            );
            const pairsSecondToken = await this.pairService.getAllSecondTokens(
                this.pairs.map((pair) => pair.address),
            );

            this.pairs.forEach((pair, index) => {
                pair.firstToken = pairsFirstToken[index];
                pair.secondToken = pairsSecondToken[index];
            });
        }

        this.pairs = PairFilteringService.pairsByTokens(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByLpTokens(): Promise<PairsMetadataBuilder> {
        if (!(this.filters instanceof PairsFilter)) {
            return this;
        }

        await this.indexLpTokens();

        this.pairs = PairFilteringService.pairsByLpTokenIds(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByFarmTokens(): Promise<PairsMetadataBuilder> {
        if (
            !(this.filters instanceof PairsFilter) ||
            !this.filters.farmTokens ||
            this.filters.farmTokens.length === 0
        ) {
            return this;
        }

        const farmTokens = await Promise.all(
            this.pairs.map((pairMetadata) =>
                this.pairCompute.getPairFarmToken(pairMetadata.address),
            ),
        );

        this.pairs = PairFilteringService.pairsByFarmTokens(
            this.filters,
            this.pairs,
            farmTokens,
        );
        return this;
    }

    async filterByState(): Promise<PairsMetadataBuilder> {
        const pairsStates = await this.pairService.getAllStates(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach((pair, index) => (pair.state = pairsStates[index]));

        this.pairs = PairFilteringService.pairsByState(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByFeeState(): Promise<PairsMetadataBuilder> {
        const pairsFeeStates = await this.pairService.getAllFeeStates(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.feeState = pairsFeeStates[index]),
        );

        this.pairs = PairFilteringService.pairsByFeeState(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByVolume(): Promise<PairsMetadataBuilder> {
        const pairsVolumes = await this.pairCompute.getAllVolumeUSD(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.volumeUSD24h = pairsVolumes[index]),
        );

        this.pairs = PairFilteringService.pairsByVolume(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByLockedValueUSD(): Promise<PairsMetadataBuilder> {
        const pairsLiquidityUSD = await this.pairService.getAllLockedValueUSD(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.lockedValueUSD = pairsLiquidityUSD[index]),
        );

        this.pairs = PairFilteringService.pairsByLockedValueUSD(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByTradesCount(): Promise<PairsMetadataBuilder> {
        if (!(this.filters instanceof PairsFilter)) {
            return this;
        }

        const pairsTradesCount = await this.pairService.getAllTradesCount(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.tradesCount = pairsTradesCount[index]),
        );
        this.pairs = PairFilteringService.pairsByTradesCount(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByTradesCount24h(): Promise<PairsMetadataBuilder> {
        if (!(this.filters instanceof PairsFilter)) {
            return this;
        }

        const pairsTradesCount24h = await this.pairCompute.getAllTradesCount24h(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.tradesCount24h = pairsTradesCount24h[index]),
        );

        this.pairs = PairFilteringService.pairsByTradesCount24h(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByHasFarms(): Promise<PairsMetadataBuilder> {
        if (!(this.filters instanceof PairsFilter)) {
            return this;
        }

        const pairsHasFarms = await this.pairService.getAllHasFarms(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.hasFarms = pairsHasFarms[index]),
        );

        this.pairs = PairFilteringService.pairsByHasFarms(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByHasDualFarms(): Promise<PairsMetadataBuilder> {
        if (!(this.filters instanceof PairsFilter)) {
            return this;
        }

        const pairsHasDualFarms = await this.pairService.getAllHasDualFarms(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.hasDualFarms = pairsHasDualFarms[index]),
        );

        this.pairs = PairFilteringService.pairsByHasDualFarms(
            this.filters,
            this.pairs,
        );
        return this;
    }

    async filterByDeployedAt(): Promise<PairsMetadataBuilder> {
        if (!(this.filters instanceof PairsFilter)) {
            return this;
        }

        const pairsDeployedAt = await this.pairService.getAllDeployedAt(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) => (pair.deployedAt = pairsDeployedAt[index]),
        );

        this.pairs = PairFilteringService.pairsByDeployedAt(
            this.filters,
            this.pairs,
        );
        return this;
    }

    build(): PairModel[] {
        return this.pairs.map(
            (pair) => new PairModel({ address: pair.address }),
        );
    }

    private async indexLpTokens(): Promise<void> {
        if (this.lpTokensIndexed || this.pairs.length === 0) {
            return;
        }

        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            this.pairs.map((pair) => pair.address),
        );

        this.pairs.forEach(
            (pair, index) =>
                (pair.liquidityPoolToken =
                    lpTokensIDs[index] !== undefined
                        ? new EsdtToken({
                              identifier: lpTokensIDs[index],
                          })
                        : undefined),
        );
    }
}
