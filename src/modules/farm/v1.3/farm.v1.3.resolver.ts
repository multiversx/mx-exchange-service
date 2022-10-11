import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmModelV1_3 } from '../models/farm.v1.3.model';
import { FarmV13GetterService } from './services/farm.v1.3.getter.service';

@Resolver(FarmModelV1_3)
export class FarmV13Resolver extends FarmResolver {
    constructor(protected readonly farmGetter: FarmV13GetterService) {
        super(farmGetter);
    }

    @ResolveField()
    async apr(@Parent() parent: FarmModelV1_3): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmAPR(parent.address),
        );
    }
}
