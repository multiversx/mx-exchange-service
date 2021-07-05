import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    Interaction,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import {
    BaseNftDepositArgs,
    CompoundRewardsArgs,
    DepositTokenArgs,
    SftInteractionArgs,
    WithdrawTokenFromDepositArgs,
    WithdrawTokensFromDepositArgs,
} from './dto/token.merging.args';

@Injectable()
export class TokenMergingTransactionsService {
    constructor(
        private readonly context: ContextService,
        private readonly elrondProxy: ElrondProxyService,
    ) {}

    async mergeTokens(args: BaseNftDepositArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.mergeTokens([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async withdrawAllTokensFromDeposit(
        args: WithdrawTokensFromDepositArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.withdrawAllTokensFromDeposit(
            [],
        );
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async withdrawTokenFromDeposit(
        args: WithdrawTokenFromDepositArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );

        const interaction: Interaction = contract.methods.withdrawTokenFromDeposit(
            [new U32Value(args.tokenIndex)],
        );
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async depositToken(args: DepositTokenArgs): Promise<TransactionModel> {
        return this.SftInteraction(args, 'depositToken');
    }

    async compoundRewards(
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        return this.SftInteraction(args, 'compoundRewards');
    }

    private async SftInteraction(
        args: SftInteractionArgs,
        method: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenID),
            new U32Value(args.tokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(new Address(contract.getAddress().hex()).hex()),
            BytesValue.fromUTF8(method),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.exitFarm),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
