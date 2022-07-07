import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { AssetsModel, EsdtToken, RolesModel } from './models/esdtToken.model';
import { TokensFiltersArgs } from './models/tokens.filter.args';
import { TokenGetterService } from './services/token.getter.service';
import { TokenService } from './services/token.service';

@Resolver(() => EsdtToken)
export class TokensResolver {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenGetter: TokenGetterService,
        private readonly pairGetter: PairGetterService,
    ) {}

    private async genericFieldResover(fieldResolver: () => any): Promise<any> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async price(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResover(() =>
            this.pairGetter.getTokenPriceUSD(parent.identifier),
        );
    }

    @ResolveField(() => String)
    async type(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResover(() =>
            this.tokenGetter.getEsdtTokenType(parent.identifier),
        );
    }

    @ResolveField(() => AssetsModel)
    async assets(@Parent() parent: EsdtToken): Promise<AssetsModel> {
        return new AssetsModel(parent.assets);
    }

    @ResolveField(() => RolesModel)
    async roles(@Parent() parent: EsdtToken): Promise<RolesModel> {
        return new RolesModel(parent.roles);
    }

    @Query(() => [EsdtToken])
    async tokens(@Args() filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        try {
            return await this.tokenService.getTokens(filters);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
