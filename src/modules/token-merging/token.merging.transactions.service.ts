import {
    Address,
    BigUIntValue,
    BytesValue,
    GasLimit,
    Interaction,
    TypedValue,
    U32Value,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import {
    TokensMergingArgs,
    CompoundRewardsArgs,
    DepositTokenArgs,
    SftInteractionArgs,
    SmartContractType,
    WithdrawTokenFromDepositArgs,
} from './dto/token.merging.args';

@Injectable()
export class TokenMergingTransactionsService {
    constructor(
        private readonly context: ContextService,
        private readonly elrondProxy: ElrondProxyService,
    ) {}

    async mergeTokens(args: TokensMergingArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );

        let interaction: Interaction;
        switch (args.smartContractType) {
            case SmartContractType.FARM:
                interaction = contract.methods.mergeFarmTokens([]);
            case SmartContractType.LOCKED_ASSET_FACTORY:
                interaction = contract.methods.mergeLockedAssetTokens([]);
            case SmartContractType.PROXY_PAIR:
                interaction = contract.methods.mergeWrappedLpTokens([]);
            case SmartContractType.PROXY_FARM:
                interaction = contract.methods.mergeWrappedFarmTokens([
                    BytesValue.fromHex(new Address(args.address).hex()),
                ]);
        }

        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.default));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async withdrawAllTokensFromDeposit(
        args: TokensMergingArgs,
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

    async depositTokens(args: DepositTokenArgs): Promise<TransactionModel> {
        switch (args.smartContractType) {
            case SmartContractType.FARM:
                return this.SftInteraction(args, 'depositFarmTokens');
            case SmartContractType.LOCKED_ASSET_FACTORY:
                return this.SftInteraction(args, 'depositLockedAssetTokens');
            case SmartContractType.PROXY_PAIR:
                return this.SftInteraction(args, 'depositWrappedTokens');
            case SmartContractType.PROXY_FARM:
                return this.SftInteraction(args, 'depositWrappedTokens');
        }
    }

    async compoundRewards(
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        switch (args.smartContractType) {
            case SmartContractType.FARM:
                return this.SftInteraction(args, 'compoundRewards');
            case SmartContractType.PROXY_FARM:
                return this.SftInteraction(args, 'compoundRewardsProxy', [
                    BytesValue.fromHex(new Address(args.address).hex()),
                ]);
        }
    }

    private async SftInteraction(
        args: SftInteractionArgs,
        method: string,
        methodArgs?: TypedValue[],
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
            ...methodArgs,
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
