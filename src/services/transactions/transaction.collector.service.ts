import { Injectable } from '@nestjs/common';
import { MetricsCollector } from '../../utils/metrics.collector';
import { cronConfig } from '../../config';
import { ShardTransaction } from './entities/shard.transaction';
import { HyperblockService } from './hyperblock.service';

@Injectable()
export class TransactionCollectorService {
    constructor(private readonly hyperblockService: HyperblockService) {}

    async getNewTransactions(): Promise<ShardTransaction[]> {
        let [currentNonce, lastProcessedNonce] = await Promise.all([
            this.hyperblockService.getCurrentNonce(),
            this.hyperblockService.getLastProcessedNonce(),
        ]);
        console.log({
            currentNonce: currentNonce,
            lastProcessedNonce: lastProcessedNonce,
        });
        if (!lastProcessedNonce) {
            await this.hyperblockService.setLastProcessedNonce(currentNonce);
        }

        if (currentNonce === lastProcessedNonce) {
            return [];
        }

        if (currentNonce < lastProcessedNonce) {
            await this.hyperblockService.setLastProcessedNonce(currentNonce);
        }

        // maximum last number of nonces, makes no sense to look too far behind
        const maxLookBehind = cronConfig.transactionCollectorMaxLookBehind;
        if (currentNonce > lastProcessedNonce + maxLookBehind) {
            lastProcessedNonce = currentNonce - maxLookBehind;
        }

        if (
            currentNonce >
            lastProcessedNonce + cronConfig.transactionCollectorMaxHyperblocks
        ) {
            currentNonce =
                lastProcessedNonce +
                cronConfig.transactionCollectorMaxHyperblocks;
        }

        let allTransactions: ShardTransaction[] = [];
        const promises = [];
        for (
            let nonce = lastProcessedNonce + 1;
            nonce <= currentNonce;
            nonce++
        ) {
            // Process transactions from hyperblock
            promises.push(this.getHyperblockTransactions(nonce));
        }

        const transactionsBulk = await Promise.all(promises);
        for (const transactions of transactionsBulk) {
            allTransactions = allTransactions.concat(...transactions);
        }
        await this.hyperblockService.setLastProcessedNonce(currentNonce);
        MetricsCollector.setLastProcessedNonce(
            this.hyperblockService.getShardID(),
            currentNonce,
        );
        return allTransactions;
    }

    async getHyperblockTransactions(
        nonce: number,
    ): Promise<ShardTransaction[]> {
        console.log({ nonce: nonce });
        const result = await this.hyperblockService.getHyperblockByNonce(nonce);
        if (result.data.hyperblock === undefined) {
            return [];
        }

        const transactions: ShardTransaction[] = result.data.hyperblock.transactions.map(
            (item: any) => {
                const transaction = new ShardTransaction();
                transaction.data = item.data;
                transaction.sender = item.sender;
                transaction.receiver = item.receiver;
                transaction.sourceShard = item.sourceShard;
                transaction.destinationShard = item.destinationShard;
                transaction.hash = item.hash;
                transaction.nonce = item.nonce;
                transaction.status = item.status;
                transaction.value = item.value;

                return transaction;
            },
        );

        return transactions;
    }
}
