import { LRUCache } from 'lru-cache';
import { mxConfig } from '../config';

export default new LRUCache({
    max: mxConfig.localCacheMaxItems,
    // for use with tracking overall storage size
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
});
