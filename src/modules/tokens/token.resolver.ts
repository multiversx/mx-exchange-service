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
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { TokensResponse } from './models/tokens.response';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';
import { TokenLoader } from './services/token.loader';

@Resolver(() => AssetsModel)
export class AssetsResolver {
    @ResolveField(() => SocialModel, { nullable: true })
    async social(@Parent() parent: AssetsModel): Promise<SocialModel> {
        return new SocialModel(parent.social);
    }
}

@Resolver(() => EsdtToken)
export class TokensResolver {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenLoader: TokenLoader,
    ) {}

    @ResolveField(() => String)
    async derivedEGLD(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPriceDerivedEGLDLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String)
    async price(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPriceDerivedUSDLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async previous24hPrice(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPrevious24hPriceLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String)
    async type(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenTypeLoader.load(parent.identifier);
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
        return this.tokenLoader.tokenPrevious7dPriceLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async volumeUSD24h(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenVolumeUSD24hLoader.load(parent.identifier);
    }

    @ResolveField(() => String, { nullable: true })
    async previous24hVolume(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPrevious24hVolumeUSDLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async liquidityUSD(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenLiquidityUSDLoader.load(parent.identifier);
    }

    @ResolveField(() => String, { nullable: true })
    async createdAt(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenCreatedAtLoader.load(parent.identifier);
    }

    @ResolveField(() => Number, { nullable: true })
    async swapCount24h(@Parent() parent: EsdtToken): Promise<number> {
        return this.tokenLoader.tokenSwapCountLoader.load(parent.identifier);
    }

    @ResolveField(() => Number, { nullable: true })
    async previous24hSwapCount(@Parent() parent: EsdtToken): Promise<number> {
        return this.tokenLoader.tokenPrevious24hSwapCountLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async trendingScore(@Parent() parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenTrendingScoreLoader.load(
            parent.identifier,
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
