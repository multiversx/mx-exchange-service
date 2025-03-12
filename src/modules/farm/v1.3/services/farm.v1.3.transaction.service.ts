import { Injectable } from '@nestjs/common';
import { mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairService } from 'src/modules/pair/services/pair.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { farmType } from 'src/utils/farm.utils';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import { Token, TokenTransfer } from '@multiversx/sdk-core';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { FarmAbiServiceV1_3 } from './farm.v1.3.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class FarmTransactionServiceV1_3 extends TransactionsFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly farmAbi: FarmAbiServiceV1_3,
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
                ? gasConfig.farms[FarmVersion.V1_3].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V1_3].enterFarm.default;

        return this.mxProxy.getFarmSmartContractTransaction(
            args.farmAddress,
            new TransactionOptions({
                sender: sender,
                chainID: mxConfig.chainID,
                gasLimit: gasLimit,
                function: 'enterFarm',
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
        const gasLimit = await this.getExitFarmGasLimit(
            args,
            FarmVersion.V1_3,
            farmType(args.farmAddress),
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
        const type = farmType(args.farmAddress);

        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const gasLimit =
            gasConfig.farms[FarmVersion.V1_3][type].claimRewards +
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
        const gasLimit = gasConfig.farms[FarmVersion.V1_3].compoundRewards;
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
                gasLimit: gasLimit,
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
}
