import { Injectable } from '@nestjs/common';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import {
    EnterFarmArgs,
    ExitFarmArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
} from '../../models/farm.args';

@Injectable()
export class FarmTransactionServiceV2 extends TransactionsFarmService {
    enterFarm(sender: string, args: EnterFarmArgs): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }
    exitFarm(sender: string, args: ExitFarmArgs): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }
    claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }
    compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        throw new Error('Method not implemented.');
    }
}
