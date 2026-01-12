import BigNumber from 'bignumber.js';
import { SortOrder } from '../interfaces/dex_state.interfaces';

export function sortKeysByField<T>(
    keys: string[],
    store: Map<string, T>,
    sortField: string,
    sortOrder: SortOrder,
): string[] {
    return keys
        .map((key) => ({
            key,
            sortValue: new BigNumber(store.get(key)?.[sortField] ?? 0),
        }))
        .sort((a, b) => {
            if (sortOrder === SortOrder.SORT_ASC) {
                return a.sortValue.comparedTo(b.sortValue);
            }
            return b.sortValue.comparedTo(a.sortValue);
        })
        .map((item) => item.key);
}
