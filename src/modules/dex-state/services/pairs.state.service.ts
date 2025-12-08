import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    InitStateResponse,
    PairSortField,
    SortOrder,
    UpdatePairsResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { Pair } from 'src/microservices/dex-state/interfaces/pairs.interfaces';
import { Token } from 'src/microservices/dex-state/interfaces/tokens.interfaces';
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

    async initState(
        tokens: Token[],
        pairs: Pair[],
        commonTokenIDs: string[],
        usdcPrice: number,
    ): Promise<InitStateResponse> {
        const profiler = new PerformanceProfiler();
        const result = await firstValueFrom(
            this.dexStateServive.initState({
                tokens: [...tokens.values()],
                pairs: [...pairs.values()],
                commonTokenIDs,
                usdcPrice,
            }),
        );

        profiler.stop();

        console.log('INIT STATE CLIENT', profiler.duration);

        return result;
    }

    async addPair(
        pair: Pair,
        firstToken: Token,
        secondToken: Token,
    ): Promise<void> {
        const profiler = new PerformanceProfiler();
        await firstValueFrom(
            this.dexStateServive.addPair({ pair, firstToken, secondToken }),
        );

        profiler.stop();

        console.log('ADD PAIR CLIENT', profiler.duration);
    }

    async addPairLpToken(address: string, token: Token): Promise<void> {
        const profiler = new PerformanceProfiler();

        await firstValueFrom(
            this.dexStateServive.addPairLpToken({ address, token }),
        );

        profiler.stop();
        console.log('ADD PAIR LP TOKEN ', profiler.duration);
    }

    async getPairs(
        addresses: string[],
        fields: (keyof PairModel)[] = [],
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

        return (
            result.pairs?.map(
                (pair) =>
                    new PairModel({
                        ...pair,
                    }),
            ) ?? []
        );
    }

    async getAllPairs(fields: (keyof PairModel)[] = []): Promise<PairModel[]> {
        const profiler = new PerformanceProfiler();
        const result = await firstValueFrom(
            this.dexStateServive.getAllPairs({
                fields: { paths: fields },
            }),
        );

        profiler.stop();

        console.log('GET ALL PAIRS', profiler.duration);

        return (
            result.pairs?.map(
                (pair) =>
                    new PairModel({
                        ...pair,
                    }),
            ) ?? []
        );
    }

    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sortArgs?: PairSortingArgs,
        fields: (keyof PairModel)[] = [],
    ): Promise<{ pairs: PairModel[]; count: number }> {
        const profiler = new PerformanceProfiler();
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

        profiler.stop();

        console.log('GET FILTERED PAIRS', profiler.duration);

        return {
            pairs:
                result.pairs?.map((pair) => new PairModel({ ...pair })) ?? [],
            count: result.count,
        };
    }

    async updatePairs(
        pairUpdates: Map<string, Partial<Pair>>,
    ): Promise<UpdatePairsResponse> {
        if (pairUpdates.size === 0) {
            return {
                failedAddresses: [],
                updatedCount: 0,
            };
        }

        const pairs: Pair[] = [];
        const paths: string[] = [];

        pairUpdates.forEach((pair, address) => {
            paths.push(...Object.keys(pair));

            pairs.push({
                address,
                ...(pair as Pair),
            });
        });

        return firstValueFrom(
            this.dexStateServive.updatePairs({
                pairs,
                updateMask: { paths: [...new Set(paths)] },
            }),
        );
    }
}
