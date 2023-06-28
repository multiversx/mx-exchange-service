import { Address } from '@multiversx/sdk-core/out';
import { scAddress } from 'src/config';
import { AssetsModel } from 'src/modules/tokens/models/assets.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { RolesModel } from 'src/modules/tokens/models/roles.model';

export const Tokens = (tokenID: string): EsdtToken => {
    switch (tokenID) {
        case 'WEGLD-123456':
            return new EsdtToken({
                identifier: 'WEGLD-123456',
                ticker: 'WEGLD',
                name: 'WrappedEgld',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
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
                type: 'Core',
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '1',
                roles: new RolesModel(),
            });
        case 'MEX-123456':
            return new EsdtToken({
                identifier: 'MEX-123456',
                name: 'MEX',
                ticker: 'MEX',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
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
                type: 'Core',
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '1',
                roles: new RolesModel(),
            });
        case 'USDC-123456':
            return new EsdtToken({
                identifier: 'USDC-123456',
                name: 'CircleUSD',
                ticker: 'USDC',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                supply: '1000000000000',
                decimals: 6,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                type: '',
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '1',
                roles: new RolesModel(),
            });
        case 'TOK4-123456':
            return new EsdtToken({
                identifier: 'TOK4-123456',
                name: 'Token4',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000001',
                ).bech32(),
                ticker: 'TOK4',
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
                type: 'Community',
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
            });
        case 'EGLDUSDCLP-abcdef':
            return new EsdtToken({
                identifier: 'EGLDUSDCLP-abcdef',
                name: 'EGLDUSDCLPToken',
                owner: scAddress.routerAddress,
                ticker: 'EGLDUSDCLP',
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
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '1',
                roles: new RolesModel(),
            });
        case 'EGLDMEXLP-abcdef':
            return new EsdtToken({
                identifier: 'EGLDMEXLP-abcdef',
                name: 'EGLDMEXLPToken',
                ticker: 'EGLDMEXLP',
                type: 'FungibleESDT',
                owner: scAddress.routerAddress,
                supply: '0',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
            });
        case 'EGLDTOK4LP-abcdef':
            return new EsdtToken({
                identifier: 'EGLDTOK4LP-abcdef',
                name: 'EGLDTOK4LP',
                ticker: 'EGLDTOK4LP',
                type: 'FungibleESDT',
                owner: scAddress.routerAddress,
                supply: '1000000000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                minted: '900000000000000000000000',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '10',
                roles: new RolesModel(),
            });
        case 'EGLDTOK4FL-abcdef':
            return {
                identifier: 'EGLDTOK4FL-abcdef',
                name: 'EGLDTOK4LPStaked',
                ticker: 'EGLDTOK4FL',
                type: 'FungibleESDT',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                derivedEGLD: '0',
                supply: '0',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '1',
                roles: new RolesModel(),
            };
        case 'EGLDMEXFL-abcdef':
            return {
                identifier: 'EGLDMEXFL-abcdef',
                name: 'EGLDMEXLPStaked',
                ticker: 'EGLDMEXFL',
                type: 'FungibleESDT',
                owner: Address.fromHex(
                    '0000000000000000000000000000000000000000000000000000000000000021',
                ).bech32(),
                derivedEGLD: '0',
                supply: '10000000000000000000000000000',
                decimals: 18,
                isPaused: false,
                canUpgrade: true,
                canMint: true,
                canBurn: true,
                canChangeOwner: true,
                canPause: true,
                canFreeze: true,
                canWipe: true,
                minted: '1',
                burnt: '1',
                circulatingSupply: '1',
                accounts: 1,
                transactions: 1,
                assets: new AssetsModel(),
                initialMinted: '1',
                price: '1',
                roles: new RolesModel(),
            };
        default:
            break;
    }
};

export const pairs = [
    {
        address: Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000012',
        ).bech32(),
        firstToken: Tokens('WEGLD-123456'),
        secondToken: Tokens('MEX-123456'),
        liquidityPoolToken: Tokens('EGLDMEXLP-abcdef'),
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
    },
    {
        address: Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000013',
        ).bech32(),
        firstToken: Tokens('WEGLD-123456'),
        secondToken: Tokens('USDC-123456'),
        liquidityPoolToken: Tokens('EGLDUSDCLP-abcdef'),
        info: {
            reserves0: '1000000000000000000',
            reserves1: '800000000000000000000000',
            totalSupply: '1000000000000000000',
        },
        firstTokenPrice: '20',
        firstTokenPriceUSD: '200',
        secondTokenPrice: '10',
        secondTokenPriceUSD: '100',
        liquidityPoolTokenPriceUSD: '80020000',
        firstTokenLockedValueUSD: '200000000000000000000',
        secondTokenLockedValueUSD: '80000000000000000000000000',
        lockedValueUSD: '40010000000000000000000000',
        totalFeePercent: 0.003,
        state: 'Active',
    },
    {
        address: Address.fromHex(
            '0000000000000000000000000000000000000000000000000000000000000014',
        ).bech32(),
        firstToken: Tokens('TOK4-123456'),
        secondToken: Tokens('WEGLD-123456'),
        liquidityPoolToken: Tokens('EGLDTOK4LP-abcdef'),
        info: {
            reserves0: '1000000000000000000',
            reserves1: '800000000000000000000000',
            totalSupply: '1000000000000000000',
        },
        firstTokenPrice: '20',
        firstTokenPriceUSD: '200',
        secondTokenPrice: '10',
        secondTokenPriceUSD: '100',
        liquidityPoolTokenPriceUSD: '80020000',
        firstTokenLockedValueUSD: '200000000000000000000',
        secondTokenLockedValueUSD: '80000000000000000000000000',
        lockedValueUSD: '40010000000000000000000000',
        totalFeePercent: 0.003,
        state: 'Active',
    },
];

export async function PairsMap(): Promise<Map<string, string[]>> {
    const pairsMap: Map<string, string[]> = new Map();
    pairsMap.set('WEGLD-123456', ['MEX-123456', 'USDC-123456', 'TOK4-123456']);
    pairsMap.set('MEX-123456', ['WEGLD-123456']);
    pairsMap.set('USDC-123456', ['WEGLD-123456']);
    pairsMap.set('TOK4-123456', ['WEGLD-123456']);
    return pairsMap;
}

export const PairsData = (pairAddress: string) => {
    return pairs.find((p) => p.address === pairAddress);
};
