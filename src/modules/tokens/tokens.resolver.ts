import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { EsdtToken } from './models/esdtToken.model';
import { TokensFiltersArgs } from './models/tokens.filter.args';
import { TokenService } from './services/tokens.service';

@Resolver(() => EsdtToken)
export class TokensResolver {
    constructor(
        private readonly tokenService: TokenService,
        private readonly pairGetter: PairGetterService,
    ) {}

    @ResolveField()
    async price(parent: EsdtToken): Promise<string> {
        try {
            return await this.pairGetter.getTokenPriceUSD(parent.identifier);
        } catch (error) {
            throw new ApolloError(error);
        }
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
