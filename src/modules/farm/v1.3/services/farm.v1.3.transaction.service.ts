import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { mxConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { farmType } from 'src/utils/farm.utils';
import { Logger } from 'winston';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Address, TokenPayment } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';

@Injectable()
export class FarmTransactionServiceV1_3 extends TransactionsFarmService {
    constructor(
        protected readonly mxProxy: MXProxyService,
        protected readonly farmGetterService: FarmGetterService,
        protected readonly pairService: PairService,
        protected readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            mxProxy,
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
        const contract = await this.mxProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V1_3].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V1_3].enterFarm.default;

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
            gasConfig.farms[FarmVersion.V1_3][type].claimRewards +
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

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const gasLimit = gasConfig.farms[FarmVersion.V1_3].compoundRewards;
        const [farmedTokenID, farmingTokenID] = await Promise.all([
            this.farmGetterService.getFarmedTokenID(args.farmAddress),
            this.farmGetterService.getFarmingTokenID(args.farmAddress),
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
}
