import { ResolveField, Resolver } from '@nestjs/graphql';
import { SimpleLockModel } from '../simple-lock/models/simple.lock.model';
import { SimpleLockService } from '../simple-lock/services/simple.lock.service';
import { EnableSwapByUserConfig } from './models/factory.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => EnableSwapByUserConfig)
export class SwapEnableConfigResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async lockingSC(parent: EnableSwapByUserConfig): Promise<SimpleLockModel> {
        const address =
            await this.simpleLockService.getSimpleLockAddressByTokenID(
                parent.lockedTokenID,
            );
        if (address === undefined) {
            throw new GraphQLError('invalid locking token ID', {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }

        return new SimpleLockModel({
            address,
        });
    }
}
