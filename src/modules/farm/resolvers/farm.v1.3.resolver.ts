import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from './farm.resolver';
import { FarmModelV1_3 } from '../models/farm.v1.3.model';
import { FarmService } from '../services/farm.service';
import { TransactionsFarmService } from '../services/transactions-farm.service';
import { FarmV13GetterService } from '../services/v1.3/farm.v1.3.getter.service';

@Resolver(FarmModelV1_3)
export class FarmV13Resolver extends FarmResolver {
    constructor(
        protected readonly farmService: FarmService,
        protected readonly farmGetter: FarmV13GetterService,
        protected readonly transactionsService: TransactionsFarmService,
    ) {
        super(farmService, farmGetter, transactionsService);
    }

    @ResolveField()
    async apr(@Parent() parent: FarmModelV1_3): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmAPR(parent.address),
        );
    }
}
