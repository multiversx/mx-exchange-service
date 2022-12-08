import { FactoryModel } from '../models/factory.model';
import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { PairModel } from '../../pair/models/pair.model';
import { RouterGetterService } from '../services/router.getter.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairMetadata } from '../models/pair.metadata.model';
import { PairFilterArgs } from '../models/filter.args';
import { CpuProfiler } from 'src/utils/cpu.profiler';
import { CachingService } from 'src/services/caching/cache.service';
import { oneSecond } from 'src/helpers/helpers';

@Injectable()
export class RouterService {
    constructor(
        private readonly routerGetterService: RouterGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

    async getAllPairs(
        offset: number,
        limit: number,
        pairFilter: PairFilterArgs,
    ): Promise<PairModel[]> {
        const totalProfiler = new CpuProfiler();
        const profiler = new CpuProfiler();
        let pairsMetadata = await this.routerGetterService.getPairsMetadata();
        profiler.stop('pairsMetadata');

        const profiler4 = new CpuProfiler();
        if (pairFilter.issuedLpToken) {
            pairsMetadata = await this.filterPairsByIssuedLpToken(
                pairsMetadata,
            );
        }
        profiler4.stop('filterPairsByIssuedLpToken');

        const profiler2 = new CpuProfiler();
        pairsMetadata = this.filterPairsByAddress(pairFilter, pairsMetadata);
        profiler2.stop('filterPairsByAddress');
        const profier3 = new CpuProfiler();
        pairsMetadata = this.filterPairsByTokens(pairFilter, pairsMetadata);
        profier3.stop('filterPairsByTokens');
        const profiler5 = new CpuProfiler();
        pairsMetadata = await this.filterPairsByState(
            pairFilter,
            pairsMetadata,
        );
        profiler5.stop('filterPairsByState');

        const res = pairsMetadata
            .map(
                (pairMetadata) =>
                    new PairModel({
                        address: pairMetadata.address,
                    }),
            )
            .slice(offset, limit);
        totalProfiler.stop(`getAllPairs offset: ${offset} limit: ${limit} pairFilter: ${JSON.stringify(pairFilter)}`);
        return res;
    }

    private filterPairsByAddress(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.address) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.address === pair.address,
            );
        }
        return pairsMetadata;
    }

    private filterPairsByTokens(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.firstTokenID) {
            if (pairFilter.secondTokenID) {
                pairsMetadata = pairsMetadata.filter(
                    (pair) =>
                        (pairFilter.firstTokenID === pair.firstTokenID &&
                            pairFilter.secondTokenID === pair.secondTokenID) ||
                        (pairFilter.firstTokenID === pair.secondTokenID &&
                            pairFilter.secondTokenID === pair.firstTokenID),
                );
            } else {
                pairsMetadata = pairsMetadata.filter(
                    (pair) => pairFilter.firstTokenID === pair.firstTokenID,
                );
            }
        } else if (pairFilter.secondTokenID) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.secondTokenID === pair.secondTokenID,
            );
        }
        return pairsMetadata;
    }

    private async filterPairsByIssuedLpToken(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        return await this.cachingService.getOrSet(
            'getPairsByIssuedLpToken',
            async () => await this.filterPairsByIssuedLpTokenRaw(pairsMetadata),
            oneSecond() * 30,
            oneSecond() * 6,
        )
    }

    private async filterPairsByIssuedLpTokenRaw(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        const promises = pairsMetadata.map((pairMetadata) =>
            this.pairGetterService.getLpTokenID(pairMetadata.address),
        );
        const lpTokensIDs = await Promise.all(promises);

        const filteredPairsMetadata = [];
        for (let index = 0; index < lpTokensIDs.length; index++) {
            if (
                lpTokensIDs[index] === undefined ||
                lpTokensIDs[index] === 'undefined'
            ) {
                continue;
            }
            filteredPairsMetadata.push(pairsMetadata[index]);
        }

        return filteredPairsMetadata;
    }

    private async filterPairsByState(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.state) {
            return pairsMetadata;
        }

        const promises = pairsMetadata.map((pairMetadata) =>
            this.pairGetterService.getState(pairMetadata.address),
        );
        const pairsStates = await Promise.all(promises);

        const filteredPairsMetadata = [];
        for (let index = 0; index < pairsStates.length; index++) {
            if (pairsStates[index] === pairFilter.state) {
                filteredPairsMetadata.push(pairsMetadata[index]);
            }
        }

        return filteredPairsMetadata;
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }

    async requireOwner(sender: string) {
        if ((await this.routerGetterService.getOwner()) !== sender)
            throw new Error('You are not the owner.');
    }
}
