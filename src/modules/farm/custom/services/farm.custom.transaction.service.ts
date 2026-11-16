import { Injectable } from '@nestjs/common';
import { TransactionModel } from 'src/models/transaction.model';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
} from '../../models/farm.args';
import { TransactionsFarmService } from '../../base-module/services/farm.transaction.service';
import { ForbiddenError } from '@nestjs/apollo';

@Injectable()
export class FarmCustomTransactionService extends TransactionsFarmService {
    async enterFarm(
        sender: string,
        args: EnterFarmArgs,
    ): Promise<TransactionModel> {
        throw new ForbiddenError(
            `whitelisted addresses only for farm ${args.farmAddress}`,
        );
    }

    async exitFarm(
        sender: string,
        args: ExitFarmArgs,
    ): Promise<TransactionModel> {
        throw new ForbiddenError(
            `whitelisted addresses only for farm ${args.farmAddress}`,
        );
    }

    async claimRewards(
        sender: string,
        args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        throw new ForbiddenError(
            `whitelisted addresses only for farm ${args.farmAddress}`,
        );
    }

    async compoundRewards(
        sender: string,
        args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        throw new ForbiddenError(
            `whitelisted addresses only for farm ${args.farmAddress}`,
        );
    }
}
