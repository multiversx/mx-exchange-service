import { Address, BigUIntValue, TokenPayment } from '@elrondnetwork/erdjs/out';
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
            .compoundRewards()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.stake.mergeTokens)
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
