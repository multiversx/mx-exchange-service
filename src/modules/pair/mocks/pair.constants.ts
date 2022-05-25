export const Tokens = (tokenID: string) => {
    switch (tokenID) {
        case 'TOK1-1111':
            return {
                identifier: 'TOK1-1111',
                name: 'FirstToken',
                owner: 'owner_address',
                supply: '1000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            };
        case 'TOK2-2222':
            return {
                identifier: 'TOK2-2222',
                name: 'SecondToken',
                owner: 'owner_address',
                supply: '2000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            };
        case 'USDC-1111':
            return {
                identifier: 'USDC-1111',
                name: 'ThirdToken',
                owner: 'owner_address',
                supply: '2000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            };
        case 'LPT-1234':
            return {
                identifier: 'LPT-1234',
                name: 'LiquidityPoolToken1',
                owner: 'router_address',
                supply: '1000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            };
        case 'LPT-abcd':
            return {
                identifier: 'LPT-abcd',
                name: 'LiquidityPoolToken2',
                owner: 'router_address',
                supply: '1000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
            };
        default:
            break;
    }
};

export const PairsData = (pairAddress: string) => {
    switch (pairAddress) {
        case 'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u':
            return {
                address:
                    'erd1qqqqqqqqqqqqqpgqe8m9w7cv2ekdc28q5ahku9x3hcregqpn0n4sum0e3u',
                firstToken: Tokens('TOK1-1111'),
                secondToken: Tokens('TOK2-2222'),
                liquidityPoolToken: Tokens('LPT-1234'),
                info: {
                    reserves0: '1000000000000000000',
                    reserves1: '2000000000000000000',
                    totalSupply: '1000000000000000000',
                },
                firstTokenPrice: '2',
                firstTokenPriceUSD: '200',
                secondTokenPrice: '0.5',
                secondTokenPriceUSD: '100',
                liquidityPoolTokenPriceUSD: '2',
                firstTokenLockedValueUSD: '500',
                secondTokenLockedValueUSD: '500',
                lockedValueUSD: '1000',
                totalFeePercent: 0.003,
                state: 'Active',
            };
        case 'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx':
            return {
                address:
                    'erd1qqqqqqqqqqqqqpgqq67uv84ma3cekpa55l4l68ajzhq8qm3u0n4s20ecvx',
                firstToken: Tokens('TOK1-1111'),
                secondToken: Tokens('USDC-1111'),
                liquidityPoolToken: Tokens('LPT-abcd'),
                info: {
                    reserves0: '1000000000000000000',
                    reserves1: '200000000000000000000',
                    totalSupply: '1000000000000000000',
                },
                firstTokenPrice: '200',
                firstTokenPriceUSD: '200',
                secondTokenPrice: '0.005',
                secondTokenPriceUSD: '1',
                liquidityPoolTokenPriceUSD: '400',
                firstTokenLockedValueUSD: '200',
                secondTokenLockedValueUSD: '200',
                lockedValueUSD: '400',
                totalFeePercent: 0.003,
                state: 'Active',
            };
    }
};
