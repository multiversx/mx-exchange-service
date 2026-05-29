import { Address } from '@multiversx/sdk-core';

export const farms = [
    {
        address: Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000021',
        ).toBech32(),
        farmedTokenID: 'MEX-123456',
        farmTokenID: 'EGLDMEXFL-abcdef',
        farmingTokenID: 'EGLDMEXLP-abcdef',
        farmTotalSupply: '2000000000000000000',
        farmingTokenReserve: '1500000000000000000',
        rewardsPerBlock: '1000000000000000000',
        rewardPerShare: '0',
    },
    {
        address: Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000031',
        ).toBech32(),
        farmedTokenID: 'MEX-123456',
        farmTokenID: 'EGLDMEXF-abcdef',
        farmingTokenID: 'EGLDMEXLP-abcdef',
        farmTotalSupply: '1000000000000000000',
        farmingTokenReserve: '1000000000000000000',
        rewardsPerBlock: '1000000000000000000',
        rewardPerShare: '0',
    },
    {
        address: Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000032',
        ).toBech32(),
        farmedTokenID: 'MEX-123456',
        farmTokenID: 'EGLDMEXFL-bcdefg',
        farmingTokenID: 'EGLDMEXLP-abcdef',
        farmTotalSupply: '1000000000000000000',
        farmingTokenReserve: '1000000000000000000',
        rewardsPerBlock: '1000000000000000000',
        rewardPerShare: '0',
    },
    {
        address: Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000033',
        ).toBech32(),
        farmedTokenID: 'TOK4-123456',
        farmTokenID: 'EGLDTOK4FL-abcdef',
        farmingTokenID: 'EGLDTOK4LP-abcdef',
        farmTotalSupply: '1000000000000000000',
        farmingTokenReserve: '1000000000000000000',
        rewardsPerBlock: '2000000000000000000',
        rewardPerShare: '0',
    },
    {
        address: Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000041',
        ).toBech32(),
        farmedTokenID: 'MEX-123456',
        farmTokenID: 'EGLDMEXFL-ghijkl',
        farmingTokenID: 'EGLDMEXLP-abcdef',
        farmTotalSupply: '1000000000000000000',
        farmingTokenReserve: '1000000000000000000',
        rewardsPerBlock: '2000000000000000000',
        rewardsPerSecond: '2000000000000000000',
        rewardPerShare: '0',
    },
];
