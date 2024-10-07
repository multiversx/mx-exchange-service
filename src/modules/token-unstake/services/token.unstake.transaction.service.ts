import { Injectable } from '@nestjs/common';
import { gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { TokenUnstakeAbiService } from './token.unstake.abi.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class TokenUnstakeTransactionService {
    constructor(
        private readonly tokenUnstakeAbi: TokenUnstakeAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    async claimUnlockedTokens(sender: string): Promise<TransactionModel> {
        const unstakedTokens = await this.tokenUnstakeAbi.unlockedTokensForUser(
            sender,
        );
        const gasLimit =
            gasConfig.tokenUnstake.claimUnlockedTokens.default +
            gasConfig.tokenUnstake.claimUnlockedTokens.additionalTokens *
                unstakedTokens.length;

        return await this.mxProxy.getTokenUnstakeSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'claimUnlockedTokens',
            }),
        );
    }

    async cancelUnbond(sender: string): Promise<TransactionModel> {
        const unstakedTokens = await this.tokenUnstakeAbi.unlockedTokensForUser(
            sender,
        );

        const gasLimit =
            gasConfig.tokenUnstake.cancelUnbond.default +
            gasConfig.tokenUnstake.cancelUnbond.additionalTokens *
                unstakedTokens.length;

        return await this.mxProxy.getTokenUnstakeSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasLimit,
                function: 'cancelUnbond',
            }),
        );
    }
}
