import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { farmType } from 'src/utils/farm.utils';
import { Logger } from 'winston';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
} from '../../models/farm.args';
import { FarmRewardType, FarmVersion } from '../../models/farm.model';
import { FarmGetterService } from '../farm.getter.service';
import { TransactionsFarmService } from '../farm.transaction.service';

@Injectable()
export class FarmV13TransactionService extends TransactionsFarmService {
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
        const [contract] = await this.elrondProxy.getFarmSmartContract(
            args.farmAddress,
        );

        const gasLimit =
            args.tokens.length > 1
                ? gasConfig.farms[FarmVersion.V1_3].enterFarm.withTokenMerge
                : gasConfig.farms[FarmVersion.V1_3].enterFarm.default;

        return super.enterFarm(
            sender,
            args,
            contract.methodsExplicit.enterFarm(),
            gasLimit,
        );
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        return super.exitFarm(
            sender,
            args,
            FarmVersion.V1_3,
            farmType(args.farmAddress),
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

        return super.claimRewards(sender, args, gasLimit);
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        const gasLimit = gasConfig.farms[FarmVersion.V1_3].compoundRewards;
        return super.compoundRewards(sender, args, gasLimit);
    }

    protected async getExitFarmGasLimit(args: ExitFarmArgs): Promise<number> {
        return super.getExitFarmGasLimit(
            args,
            FarmVersion.V1_3,
            farmType(args.farmAddress),
        );
    }
}
