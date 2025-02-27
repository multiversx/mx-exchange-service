import {
    Address,
    AddressValue,
    BytesValue,
    Token,
    TokenTransfer,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
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
import { TransactionOptions } from 'src/modules/common/transaction.options';

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

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V1_2].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V1_2].enterFarm.default;

        return this.mxProxy.getFarmSmartContractTransaction(
            args.farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasLimit,
                function: args.lockRewards
                    ? 'enterFarmAndLockRewards'
                    : 'enterFarm',
                tokenTransfers: args.tokens.map(
                    (tokenPayment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: tokenPayment.tokenID,
                                nonce: BigInt(tokenPayment.nonce),
                            }),
                            amount: BigInt(tokenPayment.amount),
                        }),
                ),
            }),
        );
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const type = args.lockRewards
            ? FarmRewardType.LOCKED_REWARDS
            : FarmRewardType.UNLOCKED_REWARDS;

        const gasLimit = await this.getExitFarmGasLimit(
            args,
            farmVersion(args.farmAddress),
            type,
        );

        return this.mxProxy.getFarmSmartContractTransaction(
            args.farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasLimit,
                function: 'exitFarm',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.farmTokenID,
                            nonce: BigInt(args.farmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
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

        return this.mxProxy.getFarmSmartContractTransaction(
            args.farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasLimit,
                function: 'claimRewards',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.farmTokenID,
                            nonce: BigInt(args.farmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmAbi.farmedTokenID(args.farmAddress),
            this.farmAbi.farmingTokenID(args.farmAddress),
        ]);

        if (farmedTokenID !== farmingTokenID) {
            throw new Error('failed to compound different tokens');
        }

        return this.mxProxy.getFarmSmartContractTransaction(
            args.farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms[FarmVersion.V1_2].compoundRewards,
                function: 'compoundRewards',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.farmTokenID,
                            nonce: BigInt(args.farmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async migrateToNewFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            args.farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms[FarmVersion.V1_2].migrateToNewFarm,
                function: 'migrateToNewFarm',
                arguments: [new AddressValue(Address.newFromBech32(sender))],
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: args.farmTokenID,
                            nonce: BigInt(args.farmTokenNonce),
                        }),
                        amount: BigInt(args.amount),
                    }),
                ],
            }),
        );
    }

    async stopRewardsAndMigrateRps(
        sender: string,
        farmAddress: string,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms[FarmVersion.V1_2].stopRewards,
                function: 'stopRewardsAndMigrateRps',
            }),
        );
    }

    async setFarmMigrationConfig(
        sender: string,
        args: FarmMigrationConfigArgs,
    ): Promise<TransactionModel> {
        return this.mxProxy.getFarmSmartContractTransaction(
            args.oldFarmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.farms.admin.setFarmMigrationConfig,
                function: 'setFarmMigrationConfig',
                arguments: [
                    new AddressValue(Address.fromString(args.oldFarmAddress)),
                    BytesValue.fromUTF8(args.oldFarmTokenID),
                    new AddressValue(Address.fromString(args.newFarmAddress)),
                    BytesValue.fromHex(
                        Address.fromString(args.newLockedFarmAddress).hex(),
                    ),
                ],
            }),
        );
    }
}
