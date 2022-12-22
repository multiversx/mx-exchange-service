import LRU from 'lru-cache';

export default new LRU({
  max: 10000,
  // for use with tracking overall storage size
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});