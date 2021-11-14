import {
    Address,
    BigUIntValue,
    BytesValue,
    ContractFunction,
    GasLimit,
    SmartContract,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { BigNumber } from 'bignumber.js';
import { InputTokenModel } from 'src/models/inputToken.model';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { elrondConfig } from '../../../config';
import { EsdtToken } from '../../../models/tokens/esdtToken.model';
import { TransactionModel } from '../../../models/transaction.model';
import { PairMetadata } from '../../../modules/router/models/pair.metadata.model';

export const pairsMetadata: PairMetadata[] = [
    {
        firstTokenID: 'TOK1-1111',
        secondTokenID: 'TOK2-2222',
        address: 'pair_address_1',
    },
    {
        firstTokenID: 'TOK1-1111',
        secondTokenID: 'TOK3-3333',
        address: 'pair_address_2',
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
        return Tokens(tokenID);
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
        pairsMap.set('TOK1-1111', ['TOK2-2222', 'TOK3-3333']);
        pairsMap.set('TOK2-2222', ['TOK1-1111']);
        pairsMap.set('TOK3-3333', ['TOK1-1111']);

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

    multiESDTNFTTransfer(
        sender: Address,
        contract: SmartContract,
        tokens: InputTokenModel[],
        funcName: string,
        args: TypedValue[],
        gasLimit: GasLimit,
    ): TransactionModel {
        const receiverAddress = contract.getAddress();
        const transactionArgs: TypedValue[] = [];
        transactionArgs.push(BytesValue.fromHex(receiverAddress.hex()));

        transactionArgs.push(new U32Value(tokens.length));
        for (const token of tokens) {
            transactionArgs.push(BytesValue.fromUTF8(token.tokenID));
            transactionArgs.push(new U32Value(token.nonce));
            transactionArgs.push(new BigUIntValue(new BigNumber(token.amount)));
        }

        transactionArgs.push(BytesValue.fromUTF8(funcName));
        transactionArgs.push(...args);

        const transaction = contract.call({
            func: new ContractFunction('MultiESDTNFTTransfer'),
            args: transactionArgs,
            gasLimit: gasLimit,
        });

        return {
            ...transaction.toPlainObject(),
            receiver: sender.bech32(),
            chainID: elrondConfig.chainID,
        };
    }
}
