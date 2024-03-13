import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AssetsModel } from './models/assets.model';
import { EsdtToken } from './models/esdtToken.model';
import { RolesModel } from './models/roles.model';
import { TokensFiltersArgs } from './models/tokens.filter.args';
import { TokenService } from './services/token.service';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { TokenComputeService } from './services/token.compute.service';

@Resolver(() => EsdtToken)
export class TokensResolver extends GenericResolver {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
    ) {
        super();
    }

    @ResolveField(() => String)
    async derivedEGLD(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenPriceDerivedEGLD(parent.identifier),
        );
    }

    @ResolveField(() => String)
    async price(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenPriceDerivedUSD(parent.identifier),
        );
    }

    @ResolveField(() => String, { nullable: true })
    async previous24hPrice(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenPrevious24hPrice(parent.identifier),
        );
    }

    @ResolveField(() => String)
    async type(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenService.getEsdtTokenType(parent.identifier),
        );
    }

    @ResolveField(() => AssetsModel, { nullable: true })
    async assets(@Parent() parent: EsdtToken): Promise<AssetsModel> {
        return new AssetsModel(parent.assets);
    }

    @ResolveField(() => RolesModel, { nullable: true })
    async roles(@Parent() parent: EsdtToken): Promise<RolesModel> {
        return new RolesModel(parent.roles);
    }

    @Query(() => [EsdtToken])
    async tokens(@Args() filters: TokensFiltersArgs): Promise<EsdtToken[]> {
        try {
            return await this.tokenService.getTokens(filters);
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }
}
