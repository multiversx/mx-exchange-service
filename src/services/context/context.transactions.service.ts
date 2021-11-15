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
import { elrondConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';

export class ContextTransactionsService {
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
