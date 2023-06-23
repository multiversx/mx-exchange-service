import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { gasConfig, mxConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { TokenUnstakeAbiService } from './token.unstake.abi.service';

@Injectable()
export class TokenUnstakeTransactionService {
    constructor(
        private readonly tokenUnstakeAbi: TokenUnstakeAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    async claimUnlockedTokens(sender: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getTokenUnstakeContract();

        const unstakedTokens = await this.tokenUnstakeAbi.unlockedTokensForUser(
            sender,
        );
        const gasLimit = new BigNumber(
            gasConfig.tokenUnstake.claimUnlockedTokens.default,
        ).plus(
            new BigNumber(
                gasConfig.tokenUnstake.claimUnlockedTokens.additionalTokens,
            ).multipliedBy(unstakedTokens.length),
        );

        return contract.methodsExplicit
            .claimUnlockedTokens()
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasLimit.integerValue().toNumber())
            .buildTransaction()
            .toPlainObject();
    }

    async cancelUnbond(sender: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getTokenUnstakeContract();

        const unstakedTokens = await this.tokenUnstakeAbi.unlockedTokensForUser(
            sender,
        );

        const gasLimit = new BigNumber(
            gasConfig.tokenUnstake.cancelUnbond.default,
        ).plus(
            new BigNumber(
                gasConfig.tokenUnstake.cancelUnbond.additionalTokens,
            ).multipliedBy(unstakedTokens.length),
        );

        return contract.methodsExplicit
            .cancelUnbond()
            .withChainID(mxConfig.chainID)
            .withGasLimit(gasLimit.integerValue().toNumber())
            .buildTransaction()
            .toPlainObject();
    }
}
