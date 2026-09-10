/**
 * Memoizes derived token prices for the lifetime of a single event.
 *
 * Entries are keyed by the token a traversal was *rooted* at, so a memo hit is
 * always the result of a walk that started from an empty `pairsNotToVisit`.
 * Sharing the inner `computedPrices` map across roots is not equivalent: those
 * entries are produced against a partially consumed `pairsNotToVisit` and would
 * hide pairs a fresh walk considers.
 *
 * Promises are stored rather than resolved values so that concurrent callers
 * share one traversal instead of each starting their own.
 *
 * Never pass an instance to a method decorated with `@GetOrSetCache` - the
 * decorator folds every argument into the cache key.
 */
export class PriceContext {
    private readonly derivedEGLD = new Map<string, Promise<string>>();
    private readonly derivedUSD = new Map<string, Promise<string>>();

    memoizeDerivedEGLD(
        tokenID: string,
        compute: () => Promise<string>,
    ): Promise<string> {
        return this.memoize(this.derivedEGLD, tokenID, compute);
    }

    memoizeDerivedUSD(
        tokenID: string,
        compute: () => Promise<string>,
    ): Promise<string> {
        return this.memoize(this.derivedUSD, tokenID, compute);
    }

    private memoize(
        store: Map<string, Promise<string>>,
        tokenID: string,
        compute: () => Promise<string>,
    ): Promise<string> {
        const pending = store.get(tokenID);
        if (pending !== undefined) {
            return pending;
        }

        const promise = compute().catch((error) => {
            store.delete(tokenID);
            throw error;
        });

        store.set(tokenID, promise);

        return promise;
    }
}
