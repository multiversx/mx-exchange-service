import { BigUIntValue, Token, TokenTransfer } from '@multiversx/sdk-core';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { MetabondingAbiService } from './metabonding.abi.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class MetabondingTransactionService {
    constructor(
        private readonly metabondingAbi: MetabondingAbiService,
        private readonly mxProxy: MXProxyService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async stakeLockedAsset(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const userEntry = await this.metabondingAbi.userEntry(sender);

        const gasLimit =
            userEntry.tokenNonce > 0
                ? gasConfig.metabonding.stakeLockedAsset.withTokenMerge
                : gasConfig.metabonding.stakeLockedAsset.default;

        return await this.mxProxy.getMetabondingStakingSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'stakeLockedAsset',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputToken.tokenID,
                            nonce: BigInt(inputToken.nonce),
                        }),
                        amount: BigInt(inputToken.amount),
                    }),
                ],
            }),
        );
    }

    async unstake(
        sender: string,
        unstakeAmount: string,
    ): Promise<TransactionModel> {
        return await this.mxProxy.getMetabondingStakingSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.metabonding.unstake,
                function: 'unstake',
                arguments: [new BigUIntValue(new BigNumber(unstakeAmount))],
            }),
        );
    }

    async unbond(sender: string): Promise<TransactionModel> {
        await this.pubSub.publish('deleteCacheKeys', [`${sender}.userEntry`]);

        return await this.mxProxy.getMetabondingStakingSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.metabonding.unbond,
                function: 'unbond',
            }),
        );
    }
}
