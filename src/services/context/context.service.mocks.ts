import {
    ContractFunction,
    GasLimit,
    SmartContract,
    TypedValue,
} from '@elrondnetwork/erdjs/out';
import { elrondConfig } from '../../config';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { TransactionModel } from '../../models/transaction.model';
import { PairMetadata } from '../../modules/router/models/pair.metadata.model';

export const pairsMetadata: PairMetadata[] = [
    {
        firstTokenID: 'WEGLD-073650',
        secondTokenID: 'MEX-ec32fa',
        address:
            'erd1qqqqqqqqqqqqqpgquh2r06qrjesfv5xj6v8plrqm93c6xvw70n4sfuzpmc',
    },
    {
        firstTokenID: 'WEGLD-073650',
        secondTokenID: 'BUSD-f2c46d',
        address:
            'erd1qqqqqqqqqqqqqpgqmffr70826epqhdf2ggsmgxgur77g53hr0n4s38y2qe',
    },
];

export class ContextServiceMock {
    async getAllPairsAddress(): Promise<string[]> {
        const pairsAddress = [];
        for (const pair of pairsMetadata) {
            pairsAddress.push(pair.address);
        }
        return pairsAddress;
    }

    async getPairsMetadata(): Promise<PairMetadata[]> {
        return pairsMetadata;
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        return {
            identifier: tokenID,
            name: tokenID,
            type: 'FungibleESDT',
            owner: 'user_address_1',
            minted: '0',
            burnt: '0',
            decimals: 18,
            isPaused: false,
            canUpgrade: true,
            canMint: true,
            canBurn: true,
            canChangeOwner: true,
            canPause: true,
            canFreeze: true,
            canWipe: true,
        };
    }

    async getCurrentEpoch(): Promise<number> {
        return 1;
    }

    async getPairByTokens(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<PairMetadata> {
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return pair;
            }
        }
        return;
    }

    async getPairsMap(): Promise<Map<string, string[]>> {
        const pairsMap: Map<string, string[]> = new Map();
        pairsMap.set('WEGLD-073650', ['MEX-ec32fa', 'BUSD-f2c46d']);
        pairsMap.set('MEX-ec32fa', ['WEGLD-073650']);
        pairsMap.set('BUSD-f2c46d', ['WEGLD-073650']);

        return pairsMap;
    }

    isConnected(
        graph: Map<string, string[]>,
        input: string,
        output: string,
        discovered: Map<string, boolean>,
        path: string[] = [],
    ): boolean {
        discovered.set(input, true);
        path.push(input);
        if (input === output) {
            return true;
        }

        for (const vertex of graph.get(input)) {
            if (!discovered.get(vertex)) {
                if (this.isConnected(graph, vertex, output, discovered, path)) {
                    return true;
                }
            }
        }

        path.pop();
        return false;
    }

    esdtTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        const transaction = contract.call({
            func: new ContractFunction('ESDTTransfer'),
            args: args,
            gasLimit: gasLimit,
        });
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    nftTransfer(
        contract: SmartContract,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        const transaction = contract.call({
            func: new ContractFunction('ESDTNFTTransfer'),
            args: args,
            gasLimit: gasLimit,
        });

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }
}
