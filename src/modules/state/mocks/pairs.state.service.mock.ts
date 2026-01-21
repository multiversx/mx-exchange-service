import { pairs, PairsData } from 'src/modules/pair/mocks/pair.constants';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairsFilter } from 'src/modules/router/models/filter.args';
import { PairsStateService } from '../services/pairs.state.service';

export class PairsStateServiceMock {
    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
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
        );

        return { pairs: pairModels, count: pairAddresses.length };
    }

    async getPairs(addresses: string[]): Promise<PairModel[]> {
        return addresses.map(
            (address) => PairsData(address) as unknown as PairModel,
        );
    }

    async getPairsWithTokens(addresses: string[]): Promise<PairModel[]> {
        return this.getPairs(addresses);
    }
}

export const PairsStateServiceProvider = {
    provide: PairsStateService,
    useClass: PairsStateServiceMock,
};
