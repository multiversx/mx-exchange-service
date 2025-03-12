import {
    Token,
    TokenTransfer,
    U64Type,
    U64Value,
    VariadicType,
    VariadicValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { UnlockType } from '../models/energy.model';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class EnergyTransactionService {
    constructor(
        protected readonly contextGetter: ContextGetterService,
        protected readonly mxProxy: MXProxyService,
    ) {}

    async lockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        lockEpochs: number,
    ): Promise<TransactionModel> {
        return this.mxProxy.getSimpleLockEnergySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLockEnergy.lockTokens,
                function: 'lockTokens',
                arguments: [new U64Value(new BigNumber(lockEpochs))],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputTokens.tokenID,
                            nonce: BigInt(inputTokens.nonce),
                        }),
                        amount: BigInt(inputTokens.amount),
                    }),
                ],
            }),
        );
    }

    async unlockTokens(
        sender: string,
        inputTokens: InputTokenModel,
        unlockType: UnlockType,
        newLockPeriod?: number,
    ): Promise<TransactionModel> {
        const transactionOptions = new TransactionOptions({
            sender: sender,
            tokenTransfers: [
                new TokenTransfer({
                    token: new Token({
                        identifier: inputTokens.tokenID,
                        nonce: BigInt(inputTokens.nonce),
                    }),
                    amount: BigInt(inputTokens.amount),
                }),
            ],
        });

        switch (unlockType) {
            case UnlockType.EARLY_UNLOCK:
                transactionOptions.function = 'unlockEarly';
                transactionOptions.gasLimit =
                    gasConfig.simpleLockEnergy.unlockTokens.unlockEarly;
                break;
            case UnlockType.REDUCE_PERIOD:
                transactionOptions.function = 'reduceLockPeriod';
                transactionOptions.arguments = [
                    new U64Value(new BigNumber(newLockPeriod)),
                ];
                transactionOptions.gasLimit =
                    gasConfig.simpleLockEnergy.unlockTokens.reduceLockPeriod;
                break;
            default:
                transactionOptions.function = 'unlockTokens';
                transactionOptions.gasLimit =
                    gasConfig.simpleLockEnergy.unlockTokens.default;
                break;
        }

        return this.mxProxy.getSimpleLockEnergySmartContractTransaction(
            transactionOptions,
        );
    }

    async mergeTokens(
        sender: string,
        inputTokens: InputTokenModel[],
    ): Promise<TransactionModel> {
        return this.mxProxy.getSimpleLockEnergySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit:
                    gasConfig.simpleLockEnergy.defaultMergeTokens *
                    inputTokens.length,
                function: 'mergeTokens',
                tokenTransfers: inputTokens.map(
                    (inputToken) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: inputToken.tokenID,
                                nonce: BigInt(inputToken.nonce),
                            }),
                            amount: BigInt(inputToken.amount),
                        }),
                ),
            }),
        );
    }

    async migrateOldTokens(
        sender: string,
        args: InputTokenModel[],
    ): Promise<TransactionModel> {
        return this.mxProxy.getSimpleLockEnergySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit:
                    gasConfig.simpleLockEnergy.migrateOldTokens * args.length,
                function: 'migrateOldTokens',
                tokenTransfers: args.map(
                    (inputToken) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: inputToken.tokenID,
                                nonce: BigInt(inputToken.nonce),
                            }),
                            amount: BigInt(inputToken.amount),
                        }),
                ),
            }),
        );
    }

    // Only owner transaction
    async addLockOptions(
        sender: string,
        lockOptions: number[],
    ): Promise<TransactionModel> {
        return this.mxProxy.getSimpleLockEnergySmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.simpleLockEnergy.admin.updateLockOptions,
                function: 'addLockOptions',
                arguments: [
                    new VariadicValue(
                        new VariadicType(new U64Type(), false),
                        lockOptions.map(
                            (lockOption) =>
                                new U64Value(new BigNumber(lockOption)),
                        ),
                    ),
                ],
            }),
        );
    }
}
