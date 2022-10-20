import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { SimpleLockModel } from '../simple-lock/models/simple.lock.model';
import { SimpleLockService } from '../simple-lock/services/simple.lock.service';
import { EnableSwapByUserConfig } from './models/factory.model';

@Resolver(() => EnableSwapByUserConfig)
export class SwapEnableConfigResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async lockingSC(
        @Parent() parent: EnableSwapByUserConfig,
    ): Promise<SimpleLockModel> {
        const address =
            await this.simpleLockService.getSimpleLockAddressByTokenID(
                parent.lockedTokenID,
            );
        if (address === undefined) {
            throw new ApolloError('invalid locking token ID');
        }

        return new SimpleLockModel({
            address,
        });
    }
}
