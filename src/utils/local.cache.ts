import LRU from 'lru-cache';

export default new LRU({
  max: 10000,
  // for use with tracking overall storage size
  maxSize: 50000,
  allowStale: false,
  sizeCalculation: (_, _key) => {
    return 1;
  },
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});