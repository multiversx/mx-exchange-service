import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { SimpleLockModel } from './models/simple.lock.model';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';

@Resolver(() => SimpleLockModel)
export class SimpleLockResolver {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
    ) {}

    private async genericFieldResover(fieldResolver: () => any): Promise<any> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLockedTokenID(),
        );
    }

    @ResolveField()
    async lpProxyTokenID(): Promise<string> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLpProxyTokenID(),
        );
    }

    @Query(() => SimpleLockModel)
    async simpleLock(): Promise<SimpleLockModel> {
        try {
            return this.simpleLockService.getSimpleLock();
        } catch (error) {}
    }
}
