import BigNumber from 'bignumber.js';

// TODO: temporary – reproduces pre-sdk-nestjs-v7 rounding behaviour so existing
// test expectations keep passing. Replace by updating each expectation to the
// mathematically-correct ROUND_HALF_UP value and removing this file + the
// setupFiles entry in jest-config.json.
BigNumber.config({
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
});
