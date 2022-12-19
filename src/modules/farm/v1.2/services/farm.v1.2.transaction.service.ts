import {
    Address,
    AddressValue,
    BytesValue,
    TokenPayment,
} from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { Logger } from 'winston';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { farmVersion } from 'src/utils/farm.utils';

@Injectable()
export class FarmTransactionServiceV1_2 extends TransactionsFarmService {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        protected readonly farmGetterService: FarmGetterService,
        protected readonly pairService: PairService,
        protected readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            elrondProxy,
            farmGetterService,
            pairService,
            pairGetterService,
            logger,
        );
    }

    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
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

        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const interaction = args.lockRewards
            ? contract.methodsExplicit.enterFarmAndLockRewards([])
            : contract.methodsExplicit.enterFarm([]);
        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V1_2].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V1_2].enterFarm.default;

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
    ): Promise<TransactionModel> {
        const type = args.lockRewards
            ? FarmRewardType.LOCKED_REWARDS
            : FarmRewardType.UNLOCKED_REWARDS;

        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = await this.getExitFarmGasLimit(
            args,
            farmVersion(args.farmAddress),
            type,
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
    ): Promise<TransactionModel> {
        const type = args.lockRewards
            ? FarmRewardType.LOCKED_REWARDS
            : FarmRewardType.UNLOCKED_REWARDS;

        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const gasLimit =
            gasConfig.farms[FarmVersion.V1_2][type].claimRewards +
            lockedAssetCreateGas;

        const contract = await this.elrondProxy.getFarmSmartContract(
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
    ): Promise<TransactionModel> {
        const gasLimit = gasConfig.farms[FarmVersion.V1_2].compoundRewards;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID !== farmingTokenID) {
            throw new Error('failed to compound different tokens');
        }
        const contract = await this.elrondProxy.getFarmSmartContract(
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

    async migrateToNewFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = gasConfig.farms[FarmVersion.V1_2].migrateToNewFarm;
        return contract.methodsExplicit
            .migrateToNewFarm([new AddressValue(Address.fromString(sender))])
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

    async stopRewardsAndMigrateRps(
        farmAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            farmAddress,
        );
        return contract.methodsExplicit
            .stopRewardsAndMigrateRps()
            .withGasLimit(gasConfig.farms[FarmVersion.V1_2].stopRewards)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFarmMigrationConfig(
        args: FarmMigrationConfigArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
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
}
