import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { StateRpcMetrics } from 'src/helpers/decorators/state.rpc.metrics.decorator';
import { DEX_STATE_CLIENT } from 'src/microservices/dex-state/dex.state.client.module';
import {
    DEX_STATE_SERVICE_NAME,
    IDexStateServiceClient,
    PairSortField,
    SortOrder,
    UpdatePairsResponse,
} from 'src/microservices/dex-state/interfaces/dex_state.interfaces';
import { SortingOrder } from 'src/modules/common/page.data';
import { PairModel } from 'src/modules/pair/models/pair.model';
import {
    PairsFilter,
    PairSortableFields,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { formatPair, formatToken } from '../dex.state.utils';

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

    @StateRpcMetrics()
    async addPair(
        pair: PairModel,
        firstToken: EsdtToken,
        secondToken: EsdtToken,
    ): Promise<void> {
        await firstValueFrom(
            this.dexStateServive.addPair({ pair, firstToken, secondToken }),
        );
    }

    @StateRpcMetrics()
    async addPairLpToken(address: string, token: EsdtToken): Promise<void> {
        await firstValueFrom(
            this.dexStateServive.addPairLpToken({ address, token }),
        );
    }

    @StateRpcMetrics()
    async getPairs(
        addresses: string[],
        fields: (keyof PairModel)[] = [],
    ): Promise<PairModel[]> {
        if (!addresses || addresses.length === 0) {
            return [];
        }

        const result = await firstValueFrom(
            this.dexStateServive.getPairs({
                addresses,
                fields: { paths: fields },
            }),
        );

        return result.pairs?.map((pair) => formatPair(pair, fields)) ?? [];
    }

    @StateRpcMetrics()
    async getAllPairs(fields: (keyof PairModel)[] = []): Promise<PairModel[]> {
        const result = await firstValueFrom(
            this.dexStateServive.getAllPairs({
                fields: { paths: fields },
            }),
        );

        return result.pairs?.map((pair) => formatPair(pair, fields)) ?? [];
    }

    @StateRpcMetrics()
    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sortArgs?: PairSortingArgs,
        fields: (keyof PairModel)[] = [],
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

        return {
            pairs: result.pairs?.map((pair) => formatPair(pair, fields)) ?? [],
            count: result.count,
        };
    }

    @StateRpcMetrics()
    async getPairsWithTokens(
        addresses: string[],
        pairFields: (keyof PairModel)[] = [],
        tokenFields: (keyof EsdtToken)[] = [],
    ): Promise<PairModel[]> {
        if (!addresses || addresses.length === 0) {
            return [];
        }

        const { pairsWithTokens } = await firstValueFrom(
            this.dexStateServive.getPairsTokens({
                addresses,
                pairFields: { paths: pairFields },
                tokenFields: { paths: tokenFields },
            }),
        );

        return pairsWithTokens && pairsWithTokens.length > 0
            ? pairsWithTokens.map((item) => {
                  const pair = formatPair(item.pair, pairFields);

                  pair.firstToken = formatToken(item.firstToken, tokenFields);
                  pair.secondToken = formatToken(item.secondToken, tokenFields);

                  if (item.lpToken) {
                      pair.liquidityPoolToken = formatToken(
                          item.lpToken,
                          tokenFields,
                      );
                  }

                  return pair;
              })
            : [];
    }

    @StateRpcMetrics()
    async updatePairs(
        pairUpdates: Map<string, Partial<PairModel>>,
    ): Promise<UpdatePairsResponse> {
        if (pairUpdates.size === 0) {
            return {
                failedAddresses: [],
                tokensWithPriceUpdates: [],
                updatedCount: 0,
            };
        }

        const pairs: PairModel[] = [];
        const paths: string[] = [];

        pairUpdates.forEach((pair, address) => {
            paths.push(...Object.keys(pair));

            pairs.push({
                address,
                ...(pair as PairModel),
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
