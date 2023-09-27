import {
    Address,
    AddressValue,
    BigUIntValue,
    BytesValue,
    TokenTransfer,
    TypedValue,
    U64Value,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { StakingAbiService } from './staking.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class StakingTransactionService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    @ErrorLoggerAsync()
    async stakeFarm(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        await this.validateInputTokens(stakeAddress, payments);

        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        const gasLimit =
            payments.length > 1
                ? gasConfig.stake.stakeFarm.withTokenMerge
                : gasConfig.stake.stakeFarm.default;
        const mappedPayments = payments.map((payment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );

        return contract.methodsExplicit
            .stakeFarm()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unstakeFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .unstakeFarm()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stake.unstakeFarm)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unbondFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .unbondFarm()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stake.unbondFarm)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .claimRewards()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stake.claimRewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimRewardsWithNewValue(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
        newValue: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .claimRewardsWithNewValue([
                new BigUIntValue(new BigNumber(newValue)),
            ])
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stake.claimRewardsWithNewValue)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async compoundRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .compoundRewards()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stake.compoundRewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async topUpRewards(
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .topUpRewards([])
            .withSingleESDTTransfer(
                TokenTransfer.fungibleFromBigInteger(
                    payment.tokenID,
                    new BigNumber(payment.amount),
                ),
            )
            .withGasLimit(gasConfig.stake.admin.topUpRewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeFarmTokens(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const mappedPayments = payments.map((payment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );
        return contract.methodsExplicit
            .mergeFarmTokens()
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.stake.mergeTokens)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPenaltyPercent(
        stakeAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_penalty_percent([new BigUIntValue(new BigNumber(percent))])
            .withGasLimit(gasConfig.stake.admin.set_penalty_percent)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMinimumFarmingEpochs(
        stakeAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_minimum_farming_epochs([
                new BigUIntValue(new BigNumber(epochs)),
            ])
            .withGasLimit(gasConfig.stake.admin.set_minimum_farming_epochs)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setBurnGasLimit(
        stakeAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_burn_gas_limit([new BigUIntValue(new BigNumber(gasLimit))])
            .withGasLimit(gasConfig.stake.admin.set_burn_gas_limit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setTransferExecGasLimit(
        stakeAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_transfer_exec_gas_limit([
                new BigUIntValue(new BigNumber(gasLimit)),
            ])
            .withGasLimit(gasConfig.stake.admin.set_transfer_exec_gas_limit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setAddressWhitelist(
        stakeAddress: string,
        address: string,
        whitelist: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        if (whitelist)
            return contract.methodsExplicit
                .addAddressToWhitelist([
                    new AddressValue(Address.fromString(address)),
                ])
                .withGasLimit(gasConfig.stake.admin.whitelist)
                .withChainID(mxConfig.chainID)
                .buildTransaction()
                .toPlainObject();

        return contract.methodsExplicit
            .removeAddressFromWhitelist([
                new AddressValue(Address.fromString(address)),
            ])
            .withGasLimit(gasConfig.stake.admin.whitelist)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setState(
        stakeAddress: string,
        state: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        if (state)
            return contract.methodsExplicit
                .resume()
                .withGasLimit(gasConfig.stake.admin.setState)
                .withChainID(mxConfig.chainID)
                .buildTransaction()
                .toPlainObject();

        return contract.methodsExplicit
            .pause()
            .withGasLimit(gasConfig.stake.admin.setState)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRolesFarmToken(
        stakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setLocalRolesFarmToken()
            .withGasLimit(gasConfig.stake.admin.setLocalRolesFarmToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async registerFarmToken(
        stakeAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromUTF8(tokenName),
            BytesValue.fromUTF8(tokenTicker),
            new U64Value(new BigNumber(decimals)),
        ];
        return contract.methodsExplicit
            .registerFarmToken(transactionArgs)
            .withGasLimit(gasConfig.stake.admin.registerFarmToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPerBlockRewardAmount(
        stakeAddress: string,
        perBlockAmount: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setPerBlockRewardAmount([
                new BigUIntValue(new BigNumber(perBlockAmount)),
            ])
            .withGasLimit(gasConfig.stake.admin.setPerBlockRewardAmount)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMaxApr(
        stakeAddress: string,
        maxApr: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setMaxApr([new BigUIntValue(new BigNumber(maxApr))])
            .withGasLimit(gasConfig.stake.admin.setMaxApr)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMinUnbondEpochs(
        stakeAddress: string,
        minUnboundEpoch: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setMinUnbondEpochs([new U64Value(new BigNumber(minUnboundEpoch))])
            .withGasLimit(gasConfig.stake.admin.setMinUnbondEpochs)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setRewardsState(
        stakeAddress: string,
        rewards: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getStakingSmartContract(
            stakeAddress,
        );

        if (rewards)
            return contract.methodsExplicit
                .startProduceRewards()
                .withGasLimit(gasConfig.stake.admin.setRewardsState)
                .withChainID(mxConfig.chainID)
                .buildTransaction()
                .toPlainObject();

        return contract.methodsExplicit
            .end_produce_rewards()
            .withGasLimit(gasConfig.stake.admin.setRewardsState)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputTokens(
        stakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.stakingAbi.farmTokenID(stakeAddress),
            this.stakingAbi.farmingTokenID(stakeAddress),
        ]);

        if (tokens[0].tokenID !== farmingTokenID || tokens[0].nonce > 0) {
            throw new Error('invalid farming token provided');
        }

        for (const inputToken of tokens.slice(1)) {
            if (inputToken.tokenID !== farmTokenID || inputToken.nonce === 0) {
                throw new Error('invalid farm token provided');
            }
        }
    }
}
