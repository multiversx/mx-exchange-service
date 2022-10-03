import { TransactionModel } from '../../../models/transaction.model';
import { Inject, Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import {
    Address,
    AddressValue,
    BigUIntValue,
    Interaction,
    TokenPayment,
    TypedValue,
} from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
} from '../models/farm.args';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { FarmGetterService } from './farm.getter.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { FarmRewardType, FarmVersion } from '../models/farm.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';

@Injectable()
export class TransactionsFarmService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        protected readonly farmGetterService: FarmGetterService,
        protected readonly pairService: PairService,
        protected readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
        interaction: Interaction,
        gasLimit: number,
    ): Promise<TransactionModel> {
        try {
            await this.validateInputTokens(args.farmAddress, args.tokens);
        } catch (error) {
            const logMessage = generateLogMessage(
                TransactionsFarmService.name,
                this.enterFarm.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }

        const mappedPayments = args.tokens.map((tokenPayment) =>
            TokenPayment.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );

        return interaction
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
        version: FarmVersion,
        rewardType: FarmRewardType,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = await this.getExitFarmGasLimit(
            args,
            version,
            rewardType,
        );

        return contract.methodsExplicit
            .exitFarm()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        return contract.methodsExplicit
            .claimRewards()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID !== farmingTokenID) {
            throw new Error('failed to compound different tokens');
        }
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        return contract.methodsExplicit
            .compoundRewards()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFarmMigrationConfig(
        args: FarmMigrationConfigArgs,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.oldFarmAddress,
        );
        const transactionArgs = [
            new AddressValue(Address.fromString(args.oldFarmAddress)),
            BytesValue.fromUTF8(args.oldFarmTokenID),
            new AddressValue(Address.fromString(args.newFarmAddress)),
            BytesValue.fromHex(
                Address.fromString(args.newLockedFarmAddress).hex(),
            ),
        ];
        return contract.methodsExplicit
            .setFarmMigrationConfig(transactionArgs)
            .withGasLimit(gasConfig.farms.admin.setFarmMigrationConfig)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    private async validateInputTokens(
        farmAddress: string,
        tokens: InputTokenModel[],
    ): Promise<void> {
        const [farmTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmTokenID(farmAddress),
            this.farmGetterService.getFarmingTokenID(farmAddress),
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

    protected async getExitFarmGasLimit(
        args: ExitFarmArgs,
        version: FarmVersion,
        type: FarmRewardType,
    ): Promise<number> {
        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID === farmingTokenID) {
            const gasLimit = args.withPenalty
                ? gasConfig.farms[version][type].exitFarm.withPenalty.localBurn
                : gasConfig.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );

        if (pairAddress) {
            const trustedSwapPairs =
                await this.pairGetterService.getTrustedSwapPairs(pairAddress);
            const gasLimit = args.withPenalty
                ? trustedSwapPairs.length > 0
                    ? gasConfig.farms[version][type].exitFarm.withPenalty
                          .buybackAndBurn
                    : gasConfig.farms[version][type].exitFarm.withPenalty
                          .pairBurn
                : gasConfig.farms[version][type].exitFarm.default;
            return gasLimit + lockedAssetCreateGas;
        }

        const gasLimit = args.withPenalty
            ? gasConfig.farms[version][type].exitFarm.withPenalty.localBurn
            : gasConfig.farms[version][type].exitFarm.default;
        return gasLimit + lockedAssetCreateGas;
    }

    async endProduceRewards(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .end_produce_rewards()
            .withGasLimit(gasConfig.farms.admin.end_produce_rewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async startProduceRewards(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .start_produce_rewards()
            .withGasLimit(gasConfig.farms.admin.start_produce_rewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPerBlockRewardAmount(
        farmAddress: string,
        amount: string,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .setPerBlockRewardAmount([new BigUIntValue(new BigNumber(amount))])
            .withGasLimit(gasConfig.farms.admin.setPerBlockRewardAmount)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setPenaltyPercent(
        farmAddress: string,
        percent: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .set_penalty_percent([new BigUIntValue(new BigNumber(percent))])
            .withGasLimit(gasConfig.farms.admin.set_penalty_percent)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setMinimumFarmingEpochs(
        farmAddress: string,
        epochs: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .set_minimum_farming_epochs([
                new BigUIntValue(new BigNumber(epochs)),
            ])
            .withGasLimit(gasConfig.farms.admin.set_minimum_farming_epochs)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setTransferExecGasLimit(
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .set_transfer_exec_gas_limit([
                new BigUIntValue(new BigNumber(gasLimit)),
            ])
            .withGasLimit(gasConfig.farms.admin.set_transfer_exec_gas_limit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setBurnGasLimit(
        farmAddress: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .set_burn_gas_limit([new BigUIntValue(new BigNumber(gasLimit))])
            .withGasLimit(gasConfig.farms.admin.set_burn_gas_limit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async pause(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .pause()
            .withGasLimit(gasConfig.farms.admin.pause)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async resume(farmAddress: string): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .resume()
            .withGasLimit(gasConfig.farms.admin.resume)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async registerFarmToken(
        farmAddress: string,
        tokenName: string,
        tokenTicker: string,
        decimals: number,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const transactionArgs: TypedValue[] = [
            BytesValue.fromUTF8(tokenName),
            BytesValue.fromUTF8(tokenTicker),
            new BigUIntValue(new BigNumber(decimals)),
        ];
        return contract.methodsExplicit
            .registerFarmToken(transactionArgs)
            .withGasLimit(gasConfig.farms.admin.registerFarmToken)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setLocalRolesFarmToken(
        farmAddress: string,
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .setLocalRolesFarmToken()
            .withGasLimit(gasConfig.farms.admin.setLocalRolesFarmToken)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async mergeFarmTokens(
        sender: string,
        farmAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        const mappedPayments = payments.map((tokenPayment) =>
            TokenPayment.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );
        return contract.methodsExplicit
            .mergeFarmTokens()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(
                gasConfig.farms.admin.mergeFarmTokensMultiplier *
                    payments.length,
            )
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
