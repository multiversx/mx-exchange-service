import { Address, BigUIntValue, TokenPayment } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { farmType } from 'src/utils/farm.utils';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import {
    EnterFarmArgs,
    ExitFarmArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';

@Injectable()
export class FarmTransactionServiceV2 extends TransactionsFarmService {
    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V2].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V2].enterFarm.default;

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
            .withChainID(elrondConfig.chainID)
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
        const contract = await this.elrondProxy.getFarmSmartContract(
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
            .withChainID(elrondConfig.chainID)
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
    compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }
}
