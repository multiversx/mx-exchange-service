import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { FarmResolver } from '../base-module/farm.resolver';
import { FarmModelV1_3 } from '../models/farm.v1.3.model';
import { FarmGetterServiceV1_3 } from './services/farm.v1.3.getter.service';

@Resolver(FarmModelV1_3)
export class FarmResolverV1_3 extends FarmResolver {
    constructor(protected readonly farmGetter: FarmGetterServiceV1_3) {
        super(farmGetter);
    }

    @ResolveField()
    async apr(@Parent() parent: FarmModelV1_3): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.farmGetter.getFarmAPR(parent.address),
        );
    }
}
