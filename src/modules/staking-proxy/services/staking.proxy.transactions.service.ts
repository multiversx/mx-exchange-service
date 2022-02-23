import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ContextTransactionsService } from 'src/services/context/context.transactions.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import {
    ClaimDualYieldArgs,
    ProxyStakeFarmArgs,
    UnstakeFarmTokensArgs,
} from '../models/staking.proxy.args.model';
import { StakingProxyGetterService } from './staking.proxy.getter.service';
import { StakingProxyService } from './staking.proxy.service';

@Injectable()
export class StakingProxyTransactionService {
    constructor(
        private readonly stakeProxyService: StakingProxyService,
        private readonly stakeProxyGetter: StakingProxyGetterService,
        private readonly pairService: PairService,
        private readonly contextTransactions: ContextTransactionsService,
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async stakeFarmTokens(
        sender: string,
        args: ProxyStakeFarmArgs,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(
                args.proxyStakingAddress,
                args.payments,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                StakingProxyTransactionService.name,
                this.stakeFarmTokens.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        const gasLimit =
            args.payments.length > 1
                ? gasConfig.stakeProxy.stakeFarmTokens.withTokenMerge
                : gasConfig.stakeProxy.stakeFarmTokens.default;
        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            args.payments,
            this.stakeFarmTokens.name,
            [],
            new GasLimit(gasLimit),
        );
    }

    async claimDualYield(
        sender: string,
        args: ClaimDualYieldArgs,
    ): Promise<TransactionModel> {
        const dualYieldTokenID = await this.stakeProxyGetter.getDualYieldTokenID(
            args.proxyStakingAddress,
        );
        for (const payment of args.payments) {
            if (payment.tokenID !== dualYieldTokenID) {
                throw new Error('invalid dual yield token for claim');
            }
        }

        const contract = await this.elrondProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        return this.contextTransactions.multiESDTNFTTransfer(
            new Address(sender),
            contract,
            args.payments,
            this.claimDualYield.name,
            [],
            new GasLimit(gasConfig.stakeProxy.claimDualYield),
        );
    }

    async unstakeFarmTokens(
        sender: string,
        args: UnstakeFarmTokensArgs,
    ): Promise<TransactionModel> {
        const decodedAttributes = this.stakeProxyService.decodeDualYieldTokenAttributes(
            {
                batchAttributes: [
                    {
                        identifier: args.payment.tokenID,
                        attributes: args.attributes,
                    },
                ],
            },
        );
        const pairAddress = await this.stakeProxyGetter.getPairAddress(
            args.proxyStakingAddress,
        );
        const liquidityPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            decodedAttributes[0].lpFarmTokenAmount,
        );
        const amount0Min = new BigNumber(liquidityPosition.firstTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();
        const amount1Min = new BigNumber(liquidityPosition.secondTokenAmount)
            .multipliedBy(1 - args.tolerance)
            .integerValue();

        const contract = await this.elrondProxy.getStakingProxySmartContract(
            args.proxyStakingAddress,
        );

        const transactionArgs = [
            BytesValue.fromUTF8(args.payment.tokenID),
            new U32Value(args.payment.nonce),
            new BigUIntValue(new BigNumber(args.payment.amount)),
            BytesValue.fromHex(new Address(args.proxyStakingAddress).hex()),
            BytesValue.fromUTF8(this.unstakeFarmTokens.name),
            new BigUIntValue(amount0Min),
            new BigUIntValue(amount1Min),
        ];

        const transaction = this.contextTransactions.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.stakeProxy.unstakeFarmTokens),
        );

        transaction.receiver = sender;

        return transaction;
    }

    private async validateInputTokens(
        proxyStakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [lpFarmTokenID, dualYieldTokenID] = await Promise.all([
            this.stakeProxyGetter.getLpFarmTokenID(proxyStakeAddress),
            this.stakeProxyGetter.getDualYieldTokenID(proxyStakeAddress),
        ]);

        if (tokens[0].tokenID !== lpFarmTokenID) {
            throw new Error('invalid lp farm token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (
                inputToken.tokenID !== dualYieldTokenID ||
                inputToken.nonce === 0
            ) {
                throw new Error('invalid dual yield token provided');
            }
        }
    }
}
