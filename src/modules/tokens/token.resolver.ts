import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AssetsModel, SocialModel } from './models/assets.model';
import { EsdtToken } from './models/esdtToken.model';
import { RolesModel } from './models/roles.model';
import {
    TokenSortingArgs,
    TokensFilter,
    TokensFiltersArgs,
} from './models/tokens.filter.args';
import { TokenService } from './services/token.service';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { TokenComputeService } from './services/token.compute.service';
import { TokensResponse } from './models/tokens.response';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';

@Resolver(() => AssetsModel)
export class AssetsResolver extends GenericResolver {
    @ResolveField(() => SocialModel, { nullable: true })
    async social(@Parent() parent: AssetsModel): Promise<SocialModel> {
        return new SocialModel(parent.social);
    }
}

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

    @ResolveField(() => String, { nullable: true })
    async previous7dPrice(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenPrevious7dPrice(parent.identifier),
        );
    }

    @ResolveField(() => String, { nullable: true })
    async volumeUSD24h(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenVolumeUSD24h(parent.identifier),
        );
    }

    @ResolveField(() => String, { nullable: true })
    async liquidityUSD(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenLiquidityUSD(parent.identifier),
        );
    }

    @ResolveField(() => String, { nullable: true })
    async createdAt(@Parent() parent: EsdtToken): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenCompute.tokenCreatedAt(parent.identifier),
        );
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

    @Query(() => TokensResponse)
    async filteredTokens(
        @Args({ name: 'filters', type: () => TokensFilter, nullable: true })
        filters: TokensFilter,
        @Args({
            name: 'pagination',
            type: () => ConnectionArgs,
            nullable: true,
        })
        pagination: ConnectionArgs,
        @Args({
            name: 'sorting',
            type: () => TokenSortingArgs,
            nullable: true,
        })
        sorting: TokenSortingArgs,
    ): Promise<TokensResponse> {
        const pagingParams = getPagingParameters(pagination);

        const response = await this.tokenService.getFilteredTokens(
            pagingParams,
            filters,
            sorting,
        );

        return PageResponse.mapResponse<EsdtToken>(
            response?.items || [],
            pagination ?? new ConnectionArgs(),
            response?.count || 0,
            pagingParams.offset,
            pagingParams.limit,
        );
    }
}
