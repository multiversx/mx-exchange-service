import { Address, BigUIntValue, TokenPayment } from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { farmType } from 'src/utils/farm.utils';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import {
    EnterFarmArgs,
    ExitFarmArgs,
    ClaimRewardsArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { FarmAbiServiceV2 } from './farm.v2.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';

@Injectable()
export class FarmTransactionServiceV2 extends TransactionsFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly farmAbi: FarmAbiServiceV2,
        protected readonly pairService: PairService,
        protected readonly pairAbi: PairAbiService,
    ) {
        super(mxProxy, farmAbi, pairService, pairAbi);
    }

    @ErrorLoggerAsync({
        className: FarmTransactionServiceV2.name,
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
                ? gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V2].enterFarm.default;

        await this.validateInputTokens(args.farmAddress, args.tokens);

        const mappedPayments = args.tokens.map((tokenPayment) =>
            TokenPayment.metaEsdtFromBigInteger(
                tokenPayment.tokenID,
                tokenPayment.nonce,
                new BigNumber(tokenPayment.amount),
            ),
        );

        return contract.methodsExplicit
            .enterFarm()
            .withMultiESDTNFTTransfer(
                mappedPayments,
                Address.fromString(sender),
            )
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        if (!args.exitAmount && !new BigNumber(args.exitAmount).isPositive()) {
            throw new Error('Invalid exit amount');
        }
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );
        const gasLimit = await this.getExitFarmGasLimit(
            args,
            FarmVersion.V2,
            farmType(args.farmAddress),
        );

        return contract.methodsExplicit
            .exitFarm([new BigUIntValue(new BigNumber(args.exitAmount))])
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    args.farmTokenID,
                    args.farmTokenNonce,
                    new BigNumber(args.amount),
                ),
                Address.fromString(sender),
            )
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
            gasConfig.farms[FarmVersion.V2][type].claimRewards +
            lockedAssetCreateGas;

        const contract = await this.mxProxy.getFarmSmartContract(
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
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    compoundRewards(): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }
}
