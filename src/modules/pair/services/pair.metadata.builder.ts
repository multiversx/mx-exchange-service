import { PairsFilter } from 'src/modules/router/models/filter.args';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { PairFilteringService } from './pair.filtering.service';

export class PairsMetadataBuilder {
    private pairsMetadata: PairMetadata[];
    private filters: PairsFilter;
    private filteringService: PairFilteringService;

    constructor(
        pairsMetadata: PairMetadata[],
        filters: PairsFilter,
        filteringService: PairFilteringService,
    ) {
        this.pairsMetadata = pairsMetadata;
        this.filters = filters;
        this.filteringService = filteringService;
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

    async applyAllFilters(): Promise<PairsMetadataBuilder> {
        for (const filterFunction of PairsMetadataBuilder.availableFilters) {
            await this[filterFunction]();
        }

        return this;
    }

    async filterByIssuedLpToken(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByIssuedLpToken(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByAddress(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByAddress(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByTokens(): Promise<PairsMetadataBuilder> {
        if (this.filters.searchToken) {
            this.pairsMetadata =
                await this.filteringService.pairsByWildcardToken(
                    this.filters,
                    this.pairsMetadata,
                );
        }

        this.pairsMetadata = await this.filteringService.pairsByTokens(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByLpTokens(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByLpTokenIds(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByFarmTokens(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByFarmTokens(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByState(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByState(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByFeeState(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByFeeState(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByVolume(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByVolume(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByLockedValueUSD(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByLockedValueUSD(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByTradesCount(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByTradesCount(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByTradesCount24h(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByTradesCount24h(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByHasFarms(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByHasFarms(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByHasDualFarms(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByHasDualFarms(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async filterByDeployedAt(): Promise<PairsMetadataBuilder> {
        this.pairsMetadata = await this.filteringService.pairsByDeployedAt(
            this.filters,
            this.pairsMetadata,
        );
        return this;
    }

    async build(): Promise<PairMetadata[]> {
        return this.pairsMetadata;
    }
}
