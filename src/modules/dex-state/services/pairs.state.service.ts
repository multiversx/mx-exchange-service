import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    PairSortField,
    SortOrder,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { SortingOrder } from 'src/modules/common/page.data';
import { PairModel } from 'src/modules/pair/models/pair.model';
import {
    PairsFilter,
    PairSortableFields,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';

const sortFieldMap = {
    [PairSortableFields.DEPLOYED_AT]: PairSortField.PAIRS_SORT_DEPLOYED_AT,
    [PairSortableFields.FEES_24]: PairSortField.PAIRS_SORT_FEES,
    [PairSortableFields.TRADES_COUNT]: PairSortField.PAIRS_SORT_TRADES_COUNT,
    [PairSortableFields.TRADES_COUNT_24]:
        PairSortField.PAIRS_SORT_TRADES_COUNT_24H,
    [PairSortableFields.TVL]: PairSortField.PAIRS_SORT_TVL,
    [PairSortableFields.VOLUME_24]: PairSortField.PAIRS_SORT_VOLUME,
    [PairSortableFields.APR]: PairSortField.PAIRS_SORT_APR,
};

@Injectable()
export class PairsStateService implements OnModuleInit {
    private dexStateServive: IDexStateServiceClient;

    constructor(@Inject(DEX_STATE_CLIENT) private client: ClientGrpc) {}

    onModuleInit() {
        this.dexStateServive = this.client.getService<IDexStateServiceClient>(
            DEX_STATE_SERVICE_NAME,
        );
    }

    async getPairs(
        addresses: string[],
        fields: string[] = [],
    ): Promise<PairModel[]> {
        const profiler = new PerformanceProfiler();
        const result = await firstValueFrom(
            this.dexStateServive.getPairs({
                addresses,
                fields: { paths: fields },
            }),
        );

        profiler.stop();

        console.log('GET PAIRS', profiler.duration);

        return result.pairs.map(
            (pair) =>
                new PairModel({
                    ...pair,
                    // type: token.type as unknown as string,
                }),
        );
    }

    async getAllPairs(fields: string[] = []): Promise<PairModel[]> {
        const profiler = new PerformanceProfiler();
        const result = await firstValueFrom(
            this.dexStateServive.getAllPairs({
                fields: { paths: fields },
            }),
        );

        profiler.stop();

        console.log('GET ALL PAIRS', profiler.duration);

        return result.pairs.map(
            (pair) =>
                new PairModel({
                    ...pair,
                    // type: token.type as unknown as string,
                }),
        );
    }

    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sortArgs: PairSortingArgs,
        fields: string[] = [],
    ): Promise<{ pairs: PairModel[]; count: number }> {
        const sortOrder = sortArgs
            ? sortArgs.sortOrder === SortingOrder.ASC
                ? SortOrder.SORT_ASC
                : SortOrder.SORT_DESC
            : SortOrder.SORT_ORDER_UNSPECIFIED;

        const sortField =
            sortArgs && sortArgs.sortField
                ? sortFieldMap[sortArgs.sortField]
                : PairSortField.PAIRS_SORT_UNSPECIFIED;

        const result = await firstValueFrom(
            this.dexStateServive.getFilteredPairs({
                ...filters,
                offset,
                limit,
                sortField,
                sortOrder,
                fields: { paths: fields },
            }),
        );

        // profiler.stop();

        // console.log('GET FILTERED TOKENS', profiler.duration);

        return {
            pairs:
                result.pairs?.map((pair) => new PairModel({ ...pair })) ?? [],
            count: result.count,
        };
    }
}
