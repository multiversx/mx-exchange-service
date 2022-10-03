import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { FarmResolver } from './farm.resolver';
import { FarmCustomModel } from '../models/farm.custom.model';
import { FarmCustomGetterService } from '../services/custom/farm.custom.getter.service';
import { FarmService } from '../services/farm.service';
import { TransactionsFarmService } from '../services/transactions-farm.service';

@Resolver(() => FarmCustomModel)
export class FarmCustomResolver extends FarmResolver {
    constructor(
        protected readonly farmService: FarmService,
        protected readonly farmGetter: FarmCustomGetterService,
        protected readonly transactionsService: TransactionsFarmService,
    ) {
        super(farmService, farmGetter, transactionsService);
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
