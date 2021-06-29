import { Injectable } from '@nestjs/common';
import { ESDTTransferTransaction } from './entities/esdtTransfer.transaction';
import { ShardTransaction } from './entities/shard.transaction';

enum TransactionType {
    ESDT_TRANSFER = 'ESDTTransfer',
}

@Injectable()
export class TransactionInterpreterService {
    getESDTTransferTransactions(
        transactions: ShardTransaction[],
    ): ESDTTransferTransaction[] {
        const esdtTransferTransactions: ESDTTransferTransaction[] = [];

        for (const transaction of transactions) {
            const transactionType = transaction.getDataFunctionName();
            if (transactionType === TransactionType.ESDT_TRANSFER) {
                const esdtTransferTransaction = new ESDTTransferTransaction();
                esdtTransferTransaction.hash = transaction.hash;
                esdtTransferTransaction.nonce = transaction.nonce;
                esdtTransferTransaction.value = transaction.value;
                esdtTransferTransaction.receiver = transaction.receiver;
                esdtTransferTransaction.sender = transaction.sender;
                esdtTransferTransaction.data = transaction.data;

                esdtTransferTransactions.push(esdtTransferTransaction);
            }
        }

        return esdtTransferTransactions;
    }

    getSwapTransactions(
        transactions: ESDTTransferTransaction[],
    ): ESDTTransferTransaction[] {
        const swapTransactions: ESDTTransferTransaction[] = [];

        for (const transaction of transactions) {
            if (transaction.isSwapTransaction()) {
                swapTransactions.push(transaction);
            }
        }

        return swapTransactions;
    }
}
