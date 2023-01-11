import LRU from 'lru-cache';
import { elrondConfig } from '../config';

export default new LRU({
  max: elrondConfig.localCacheMaxItems,
  // for use with tracking overall storage size
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});
