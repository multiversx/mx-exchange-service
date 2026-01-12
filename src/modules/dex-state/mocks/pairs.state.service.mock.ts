import { pairs, PairsData } from 'src/modules/pair/mocks/pair.constants';
import { PairModel } from 'src/modules/pair/models/pair.model';
import {
    PairsFilter,
    PairSortingArgs,
} from 'src/modules/router/models/filter.args';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairsStateService } from '../services/pairs.state.service';

export class PairsStateServiceMock {
    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sortArgs?: PairSortingArgs,
        fields: (keyof PairModel)[] = [],
    ): Promise<{ pairs: PairModel[]; count: number }> {
        const pairAddresses: string[] = [];

        for (const pair of pairs) {
            if (filters.state && !filters.state.includes(pair.state)) {
                continue;
            }

            pairAddresses.push(pair.address);
        }

        const pairModels = await this.getPairs(
            pairAddresses.slice(offset, offset + limit),
            fields,
        );

        return { pairs: pairModels, count: pairAddresses.length };
    }

    async getPairs(
        addresses: string[],
        fields: (keyof PairModel)[] = [],
    ): Promise<PairModel[]> {
        return addresses.map(
            (address) => PairsData(address) as unknown as PairModel,
        );
    }

    async getPairsWithTokens(
        addresses: string[],
        pairFields: (keyof PairModel)[] = [],
        tokenFields: (keyof EsdtToken)[] = [],
    ): Promise<PairModel[]> {
        return this.getPairs(addresses, pairFields);
        // return addresses.map((address) => {
        //   const pair = PairsData(address);

        //   return pair
        // })
    }
}

export const PairsStateServiceProvider = {
    provide: PairsStateService,
    useClass: PairsStateServiceMock,
};
