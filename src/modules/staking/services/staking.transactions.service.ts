import {
    Address,
    BigUIntValue,
    BytesValue,
    TokenPayment,
    TypedValue,
    U64Value,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionsFarmService } from 'src/modules/farm/services/transactions-farm.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { StakingGetterService } from './staking.getter.service';

@Injectable()
export class StakingTransactionService {
    constructor(
        private readonly stakeGetterService: StakingGetterService,
        private readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async stakeFarm(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(stakeAddress, payments);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsFarmService.name,
                this.stakeFarm.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );

        const gasLimit =
            payments.length > 1
                ? gasConfig.stake.stakeFarm.withTokenMerge
                : gasConfig.stake.stakeFarm.default;
        const mappedPayments = payments.map(payment =>
            TokenPayment.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );

        return contract.methodsExplicit
            .stakeFarm()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unstakeFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .unstakeFarm()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.unstakeFarm)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unbondFarm(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .unbondFarm()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.unbondFarm)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .claimRewards()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.claimRewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimRewardsWithNewValue(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
        newValue: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .claimRewardsWithNewValue([
                new BigUIntValue(new BigNumber(newValue)),
            ])
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.claimRewardsWithNewValue)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async compoundRewards(
        sender: string,
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .compoundRewards()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.compoundRewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async topUpRewards(
        stakeAddress: string,
        payment: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const transactionArgs = [
            BytesValue.fromUTF8(payment.tokenID),
            new BigUIntValue(new BigNumber(payment.amount)),
        ];
        return contract.methodsExplicit
            .topUpRewards(transactionArgs)
            .withSingleESDTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    payment.tokenID,
                    payment.nonce,
                    new BigNumber(payment.amount),
                ),
            )
            .withGasLimit(gasConfig.stake.admin.topUpRewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeFarmTokens(
        sender: string,
        stakeAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        const mappedPayments = payments.map(payment =>
            TokenPayment.metaEsdtFromBigInteger(
                payment.tokenID,
                payment.nonce,
                new BigNumber(payment.amount),
            ),
        );
        return contract.methodsExplicit
            .mergeFarmTokens()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.mergeTokens)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPenaltyPercent(
        stakeAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_penalty_percent([new BigUIntValue(new BigNumber(percent))])
            .withGasLimit(gasConfig.stake.admin.set_penalty_percent)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMinimumFarmingEpochs(
        stakeAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_minimum_farming_epochs([
                new BigUIntValue(new BigNumber(epochs)),
            ])
            .withGasLimit(gasConfig.stake.admin.set_minimum_farming_epochs)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setBurnGasLimit(
        stakeAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_burn_gas_limit([new BigUIntValue(new BigNumber(gasLimit))])
            .withGasLimit(gasConfig.stake.admin.set_burn_gas_limit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setTransferExecGasLimit(
        stakeAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .set_transfer_exec_gas_limit([
                new BigUIntValue(new BigNumber(gasLimit)),
            ])
            .withGasLimit(gasConfig.stake.admin.set_transfer_exec_gas_limit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async addAddressToWhitelist(
        stakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .addAddressToWhitelist([
                BytesValue.fromHex(Address.fromString(address).hex()),
            ])
            .withGasLimit(gasConfig.stake.admin.addAddressToWhitelist)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async removeAddressFromWhitelist(
        stakeAddress: string,
        address: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .removeAddressFromWhitelist([
                BytesValue.fromHex(Address.fromString(address).hex()),
            ])
            .withGasLimit(gasConfig.stake.admin.removeAddressFromWhitelist)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async pause(stakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .pause()
            .withGasLimit(gasConfig.stake.admin.pause)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async resume(stakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .resume()
            .withGasLimit(gasConfig.stake.admin.resume)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRolesFarmToken(
        stakeAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setLocalRolesFarmToken()
            .withGasLimit(gasConfig.stake.admin.setLocalRolesFarmToken)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async registerFarmToken(
        stakeAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
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
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPerBlockRewardAmount(
        stakeAddress: string,
        perBlockAmount: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setPerBlockRewardAmount([
                new BigUIntValue(new BigNumber(perBlockAmount)),
            ])
            .withGasLimit(gasConfig.stake.admin.setPerBlockRewardAmount)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMaxApr(
        stakeAddress: string,
        maxApr: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setMaxApr([new BigUIntValue(new BigNumber(maxApr))])
            .withGasLimit(gasConfig.stake.admin.setMaxApr)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMinUnbondEpochs(
        stakeAddress: string,
        minUnboundEpoch: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .setMinUnbondEpochs([new U64Value(new BigNumber(minUnboundEpoch))])
            .withGasLimit(gasConfig.stake.admin.setMinUnbondEpochs)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async startProduceRewards(stakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .start_produce_rewards()
            .withGasLimit(gasConfig.stake.admin.start_produce_rewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async endProduceRewards(stakeAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getStakingSmartContract(
            stakeAddress,
        );
        return contract.methodsExplicit
            .end_produce_rewards()
            .withGasLimit(gasConfig.stake.admin.end_produce_rewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputTokens(
        stakeAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.stakeGetterService.getFarmTokenID(stakeAddress),
            this.stakeGetterService.getFarmingTokenID(stakeAddress),
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
