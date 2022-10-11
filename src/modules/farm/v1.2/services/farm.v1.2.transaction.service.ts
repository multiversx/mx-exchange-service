import { Address, AddressValue, TokenPayment } from '@elrondnetwork/erdjs/out';
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
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { FarmGetterService } from '../../base-module/services/farm.getter.service';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';

@Injectable()
export class FarmV12TransactionService extends TransactionsFarmService {
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

        return super.enterFarm(sender, args, interaction, gasLimit);
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        const type = args.lockRewards
            ? FarmRewardType.LOCKED_REWARDS
            : FarmRewardType.UNLOCKED_REWARDS;
        return super.exitFarm(sender, args, FarmVersion.V1_2, type);
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

        return super.claimRewards(sender, args, gasLimit);
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const gasLimit = gasConfig.farms[FarmVersion.V1_2].compoundRewards;
        return super.compoundRewards(sender, args, gasLimit);
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
}
