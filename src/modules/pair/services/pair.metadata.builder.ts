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
import { Injectable } from '@nestjs/common';

@Injectable()
export class PairsMetadataBuilder {
    constructor(
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
    ) {}

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
    ): Promise<PairModel[]> {
        let pairs = pairsMetadata.map(
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

        for (const filterFunction of PairsMetadataBuilder.availableFilters) {
            pairs = await this[filterFunction](filters, pairs);
        }

        return pairs;
    }

    async filterByIssuedLpToken(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) =>
                (pair.liquidityPoolToken =
                    lpTokensIDs[index] !== undefined
                        ? new EsdtToken({
                              identifier: lpTokensIDs[index],
                          })
                        : undefined),
        );

        return PairFilteringService.pairsByIssuedLpToken(filters, pairs);
    }

    async filterByAddress(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        return PairFilteringService.pairsByAddress(filters, pairs);
    }

    async filterByTokens(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairsFilter) {
            const pairsFirstToken = await this.pairService.getAllFirstTokens(
                pairs.map((pair) => pair.address),
            );
            const pairsSecondToken = await this.pairService.getAllSecondTokens(
                pairs.map((pair) => pair.address),
            );

            pairs.forEach((pair, index) => {
                pair.firstToken = pairsFirstToken[index];
                pair.secondToken = pairsSecondToken[index];
            });
        }

        return PairFilteringService.pairsByTokens(filters, pairs);
    }

    async filterByLpTokens(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairFilterArgs) {
            return pairs;
        }

        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) =>
                (pair.liquidityPoolToken =
                    lpTokensIDs[index] !== undefined
                        ? new EsdtToken({
                              identifier: lpTokensIDs[index],
                          })
                        : undefined),
        );

        return PairFilteringService.pairsByLpTokenIds(filters, pairs);
    }

    async filterByFarmTokens(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (
            filters instanceof PairFilterArgs ||
            filters.farmTokens === undefined ||
            filters.farmTokens.length === 0
        ) {
            return pairs;
        }

        const farmTokens = await Promise.all(
            pairs.map((pairMetadata) =>
                this.pairCompute.getPairFarmToken(pairMetadata.address),
            ),
        );

        return PairFilteringService.pairsByFarmTokens(
            filters,
            pairs,
            farmTokens,
        );
    }

    async filterByState(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        const pairsStates = await this.pairService.getAllStates(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach((pair, index) => (pair.state = pairsStates[index]));

        return PairFilteringService.pairsByState(filters, pairs);
    }

    async filterByFeeState(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        const pairsFeeStates = await this.pairService.getAllFeeStates(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach((pair, index) => (pair.feeState = pairsFeeStates[index]));

        return PairFilteringService.pairsByFeeState(filters, pairs);
    }

    async filterByVolume(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        const pairsVolumes = await this.pairCompute.getAllVolumeUSD(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) => (pair.volumeUSD24h = pairsVolumes[index]),
        );

        return PairFilteringService.pairsByVolume(filters, pairs);
    }

    async filterByLockedValueUSD(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        const pairsLiquidityUSD = await this.pairService.getAllLockedValueUSD(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) => (pair.lockedValueUSD = pairsLiquidityUSD[index]),
        );

        return PairFilteringService.pairsByLockedValueUSD(filters, pairs);
    }

    async filterByTradesCount(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairFilterArgs) {
            return pairs;
        }

        const pairsTradesCount = await this.pairService.getAllTradesCount(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) => (pair.tradesCount = pairsTradesCount[index]),
        );

        return PairFilteringService.pairsByTradesCount(filters, pairs);
    }

    async filterByTradesCount24h(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairFilterArgs) {
            return pairs;
        }

        const pairsTradesCount24h = await this.pairCompute.getAllTradesCount24h(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) => (pair.tradesCount24h = pairsTradesCount24h[index]),
        );

        return PairFilteringService.pairsByTradesCount24h(filters, pairs);
    }

    async filterByHasFarms(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairFilterArgs) {
            return pairs;
        }

        const pairsHasFarms = await this.pairService.getAllHasFarms(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach((pair, index) => (pair.hasFarms = pairsHasFarms[index]));

        return PairFilteringService.pairsByHasFarms(filters, pairs);
    }

    async filterByHasDualFarms(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairFilterArgs) {
            return pairs;
        }

        const pairsHasDualFarms = await this.pairService.getAllHasDualFarms(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) => (pair.hasDualFarms = pairsHasDualFarms[index]),
        );

        return PairFilteringService.pairsByHasDualFarms(filters, pairs);
    }

    async filterByDeployedAt(
        filters: PairsFilter | PairFilterArgs,
        pairs: PairModel[],
    ): Promise<PairModel[]> {
        if (filters instanceof PairFilterArgs) {
            return pairs;
        }

        const pairsDeployedAt = await this.pairService.getAllDeployedAt(
            pairs.map((pair) => pair.address),
        );

        pairs.forEach(
            (pair, index) => (pair.deployedAt = pairsDeployedAt[index]),
        );

        return PairFilteringService.pairsByDeployedAt(filters, pairs);
    }
}
