import BigNumber from 'bignumber.js';
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
        const {
            state,
            feeState,
            firstTokenID,
            secondTokenID,
            minVolume,
            minLockedValueUSD,
        } = filters;

        let minVolumeBN: BigNumber;
        let minLockedValueBN: BigNumber;

        if (minVolume) {
            minVolumeBN = new BigNumber(minVolume);
        }

        if (minLockedValueUSD) {
            minLockedValueBN = new BigNumber(minLockedValueUSD);
        }

        for (const pair of pairs) {
            if (firstTokenID && secondTokenID) {
                if (
                    ![firstTokenID, secondTokenID].includesEvery([
                        pair.firstToken.identifier,
                        pair.secondToken.identifier,
                    ])
                ) {
                    continue;
                }
            } else if (
                firstTokenID &&
                pair.firstToken.identifier !== firstTokenID
            ) {
                continue;
            } else if (
                secondTokenID &&
                pair.secondToken.identifier !== secondTokenID
            ) {
                continue;
            }

            if (state && !state.includes(pair.state)) {
                continue;
            }

            if (feeState !== undefined && pair.feeState !== feeState) {
                continue;
            }

            if (minVolumeBN && minVolumeBN.gt(pair.volumeUSD)) {
                continue;
            }

            if (minLockedValueBN && minLockedValueBN.gt(pair.lockedValueUSD)) {
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
