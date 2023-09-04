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
import { Address, TokenTransfer } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { FarmAbiServiceV1_3 } from './farm.v1.3.abi.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';

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
        className: FarmTransactionServiceV1_3.name,
        logArgs: true,
    })
    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V1_3].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V1_3].enterFarm.default;

        await this.validateInputTokens(args.farmAddress, args.tokens);

        const mappedPayments = args.tokens.map((tokenPayment) =>
            TokenTransfer.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );

        return contract.methodsExplicit
            .enterFarm()
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
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = await this.getExitFarmGasLimit(
            args,
            FarmVersion.V1_3,
            farmType(args.farmAddress),
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
        const type = farmType(args.farmAddress);

        const lockedAssetCreateGas =
            type === FarmRewardType.LOCKED_REWARDS
                ? gasConfig.lockedAssetCreate
                : 0;
        const gasLimit =
            gasConfig.farms[FarmVersion.V1_3][type].claimRewards +
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
        const gasLimit = gasConfig.farms[FarmVersion.V1_3].compoundRewards;
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
}
