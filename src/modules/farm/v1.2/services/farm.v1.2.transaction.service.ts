import {
    Address,
    AddressValue,
    BytesValue,
    TokenTransfer,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import { farmVersion } from 'src/utils/farm.utils';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { FarmAbiServiceV1_2 } from './farm.v1.2.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class FarmTransactionServiceV1_2 extends TransactionsFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly farmAbi: FarmAbiServiceV1_2,
        protected readonly pairService: PairService,
        protected readonly pairAbi: PairAbiService,
    ) {
        super(mxProxy, farmAbi, pairService, pairAbi);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        await this.validateInputTokens(args.farmAddress, args.tokens);

        const contract = await this.mxProxy.getFarmSmartContract(
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
            TokenTransfer.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );

        return interaction
            .withMultiESDTNFTTransfer(mappedPayments)
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
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

        const contract = await this.mxProxy.getFarmSmartContract(
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
                TokenTransfer.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
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

        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );

        return contract.methodsExplicit
            .claimRewards()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const gasLimit = gasConfig.farms[FarmVersion.V1_2].compoundRewards;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmAbi.farmedTokenID(args.farmAddress),
            this.farmAbi.farmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID !== farmingTokenID) {
            throw new Error('failed to compound different tokens');
        }
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );

        return contract.methodsExplicit
            .compoundRewards()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async migrateToNewFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = gasConfig.farms[FarmVersion.V1_2].migrateToNewFarm;
        return contract.methodsExplicit
            .migrateToNewFarm([new AddressValue(Address.fromString(sender))])
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async stopRewardsAndMigrateRps(
        farmAddress: string,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(farmAddress);
        return contract.methodsExplicit
            .stopRewardsAndMigrateRps()
            .withGasLimit(gasConfig.farms[FarmVersion.V1_2].stopRewards)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async setFarmMigrationConfig(
        args: FarmMigrationConfigArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(
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
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
