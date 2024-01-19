import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import {
    ComposableTaskEnumType,
    ComposableTaskType,
} from '../models/composable.tasks.model';
import { TransactionModel } from 'src/models/transaction.model';
import {
    BigUIntValue,
    BytesType,
    BytesValue,
    EnumValue,
    EnumVariantDefinition,
    Field,
    List,
    ListType,
    Struct,
    TokenIdentifierValue,
    TokenTransfer,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core/out';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig } from 'src/config';
import { EgldOrEsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { decimalToHex } from 'src/utils/token.converters';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';

export type ComposableTask = {
    type: ComposableTaskType;
    arguments: BytesValue[];
};

@Injectable()
export class ComposableTasksTransactionService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly wrapAbi: WrapAbiService,
    ) {}

    async getComposeTasksTransaction(
        payment: EsdtTokenPayment,
        tokenOut: EgldOrEsdtTokenPayment,
        tasks: ComposableTask[],
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getComposableTasksSmartContract();

        let interaction = contract.methodsExplicit
            .composeTasks([
                new Struct(EgldOrEsdtTokenPayment.getStructure(), [
                    new Field(
                        new TokenIdentifierValue(tokenOut.tokenIdentifier),
                        'token_identifier',
                    ),
                    new Field(new U64Value(new BigNumber(0)), 'token_nonce'),
                    new Field(
                        new BigUIntValue(new BigNumber(tokenOut.amount)),
                        'amount',
                    ),
                ]),
                ...this.getRawTasks(tasks),
            ])
            .withGasLimit(gasConfig.composableTasks.default)
            .withChainID(mxConfig.chainID);

        switch (payment.tokenIdentifier) {
            case 'EGLD':
                interaction = interaction.withValue(
                    new BigUIntValue(new BigNumber(payment.amount)),
                );
                break;
            default:
                interaction = interaction.withSingleESDTTransfer(
                    TokenTransfer.fungibleFromBigInteger(
                        payment.tokenIdentifier,
                        new BigNumber(payment.amount),
                    ),
                );
                break;
        }

        return interaction.buildTransaction().toPlainObject();
    }

    async wrapEgldAndSwapFixedInputTransaction(
        value: string,
        tokenOutID: string,
        tokenOutAmountMin: string,
    ): Promise<TransactionModel> {
        const wrapTask: ComposableTask = {
            type: ComposableTaskType.WRAP_EGLD,
            arguments: [],
        };

        const swapTask: ComposableTask = {
            type: ComposableTaskType.SWAP,
            arguments: [
                new BytesValue(Buffer.from(tokenOutID, 'utf-8')),
                new BytesValue(
                    Buffer.from(
                        decimalToHex(new BigNumber(tokenOutAmountMin)),
                        'hex',
                    ),
                ),
            ],
        };

        return this.getComposeTasksTransaction(
            new EsdtTokenPayment({
                tokenIdentifier: 'EGLD',
                tokenNonce: 0,
                amount: value,
            }),
            new EgldOrEsdtTokenPayment({
                tokenIdentifier: tokenOutID,
                amount: tokenOutAmountMin,
            }),
            [wrapTask, swapTask],
        );
    }

    async swapFixedInputAndUnwrapEgldTransaction(
        payment: EsdtTokenPayment,
        minimumValue: string,
    ): Promise<TransactionModel> {
        const wrappedEgldTokenID = await this.wrapAbi.wrappedEgldTokenID();

        const swapTask: ComposableTask = {
            type: ComposableTaskType.SWAP,
            arguments: [
                new BytesValue(Buffer.from(wrappedEgldTokenID, 'utf-8')),
                new BytesValue(
                    Buffer.from(
                        decimalToHex(new BigNumber(minimumValue)),
                        'hex',
                    ),
                ),
            ],
        };
        const unwrapTask: ComposableTask = {
            type: ComposableTaskType.UNWRAP_EGLD,
            arguments: [],
        };

        return this.getComposeTasksTransaction(
            payment,
            new EgldOrEsdtTokenPayment({
                tokenIdentifier: 'EGLD',
                amount: minimumValue,
            }),
            [swapTask, unwrapTask],
        );
    }

    private getRawTasks(tasks: ComposableTask[]): TypedValue[] {
        const rawTasks: TypedValue[] = [];

        tasks.forEach((task) => {
            rawTasks.push(
                new EnumValue(
                    ComposableTaskEnumType.getEnumType(),
                    new EnumVariantDefinition(
                        task.type,
                        ComposableTaskEnumType.getEnumType().getVariantByName(
                            task.type,
                        ).discriminant,
                    ),
                    [],
                ),
            );
            rawTasks.push(
                new List(new ListType(new BytesType()), task.arguments),
            );
        });

        return rawTasks;
    }
}