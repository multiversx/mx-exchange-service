import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
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
import { formatPair, formatToken } from '../state.format.utils';
import { StateGrpcClientService } from './state.grpc.client.service';

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
export class PairsStateService {
    constructor(private readonly stateGrpc: StateGrpcClientService) {}

    async addPair(
        pair: PairModel,
        firstToken: EsdtToken,
        secondToken: EsdtToken,
    ): Promise<void> {
        await firstValueFrom(
            this.stateGrpc.client.addPair({ pair, firstToken, secondToken }),
        );
    }

    async addPairLpToken(address: string, token: EsdtToken): Promise<void> {
        await firstValueFrom(
            this.stateGrpc.client.addPairLpToken({ address, token }),
        );
    }

    async getPairs(
        addresses: string[],
        fields: (keyof PairModel)[] = [],
    ): Promise<PairModel[]> {
        if (!addresses || addresses.length === 0) {
            return [];
        }

        const result = await firstValueFrom(
            this.stateGrpc.client.getPairs({
                addresses,
                fields: { paths: fields },
            }),
        );

        return result.pairs?.map((pair) => formatPair(pair, fields)) ?? [];
    }

    async getAllPairs(fields: (keyof PairModel)[] = []): Promise<PairModel[]> {
        const result = await firstValueFrom(
            this.stateGrpc.client.getAllPairs({
                fields: { paths: fields },
            }),
        );

        return result.pairs?.map((pair) => formatPair(pair, fields)) ?? [];
    }

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
            this.stateGrpc.client.getFilteredPairs({
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

    async getPairsWithTokens(
        addresses: string[],
        pairFields: (keyof PairModel)[] = [],
        tokenFields: (keyof EsdtToken)[] = [],
    ): Promise<PairModel[]> {
        if (!addresses || addresses.length === 0) {
            return [];
        }

        const { pairsWithTokens } = await firstValueFrom(
            this.stateGrpc.client.getPairsTokens({
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
            this.stateGrpc.client.updatePairs({
                pairs,
                updateMask: { paths: [...new Set(paths)] },
            }),
        );
    }
}
