import {
    TokenIdentifierValue,
    U64Value,
    VariadicValue,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionOptions } from 'src/modules/common/transaction.options';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';

export const XOXNO_MAX_CLAIM_TOKENS = 90;

@Injectable()
export class XoxnoAggregatorTransactionService {
    constructor(private readonly mxProxy: MXProxyService) {}

    async claimReferralFees(
        sender: string,
        referralID: number,
        tokenIDs: string[],
    ): Promise<TransactionModel> {
        if (tokenIDs.length === 0) {
            throw new Error('At least one token is required');
        }
        if (tokenIDs.length > XOXNO_MAX_CLAIM_TOKENS) {
            throw new Error(
                `Cannot claim more than ${XOXNO_MAX_CLAIM_TOKENS} tokens at once`,
            );
        }

        const gas = gasConfig.xoxnoAggregator.claimReferralFees;

        return this.mxProxy.getXoxnoAggregatorSmartContractTransaction(
            new TransactionOptions({
                sender,
                gasLimit: gas.default + gas.perToken * tokenIDs.length,
                function: 'claimReferralFees',
                arguments: [
                    new U64Value(new BigNumber(referralID)),
                    VariadicValue.fromItems(
                        ...tokenIDs.map((id) => new TokenIdentifierValue(id)),
                    ),
                ],
            }),
        );
    }
}
