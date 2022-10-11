import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { FarmResolver } from './farm.resolver';
import { FarmCustomModel } from '../models/farm.custom.model';
import { FarmCustomGetterService } from '../services/custom/farm.custom.getter.service';

@Resolver(() => FarmCustomModel)
export class FarmCustomResolver extends FarmResolver {
    constructor(protected readonly farmGetter: FarmCustomGetterService) {
        super(farmGetter);
    }

    @ResolveField()
    async requireWhitelist(
        @Parent() parent: FarmCustomModel,
    ): Promise<boolean> {
        try {
            const whitelists = await this.farmGetter.getWhitelist(
                parent.address,
            );
            return whitelists ? whitelists.length > 0 : false;
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
