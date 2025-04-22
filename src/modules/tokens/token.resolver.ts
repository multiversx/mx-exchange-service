import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { EsdtToken } from './models/esdtToken.model';
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
import { UsePipes } from '@nestjs/common';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';
import { relayQueryEstimator } from 'src/helpers/complexity/query.estimators';
import { ComplexityEstimatorArgs } from 'graphql-query-complexity';

@Resolver(() => EsdtToken)
export class TokensResolver {
    constructor(
        private readonly tokenService: TokenService,
        private readonly tokenLoader: TokenLoader,
    ) {}

    @ResolveField(() => String)
    async derivedEGLD(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPriceDerivedEGLDLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String)
    async price(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPriceDerivedUSDLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async previous24hPrice(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPrevious24hPriceLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String)
    async type(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenTypeLoader.load(parent.identifier);
    }

    @ResolveField(() => String, { nullable: true })
    async previous7dPrice(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPrevious7dPriceLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async volumeUSD24h(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenVolumeUSD24hLoader.load(parent.identifier);
    }

    @ResolveField(() => String, { nullable: true })
    async previous24hVolume(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenPrevious24hVolumeUSDLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async liquidityUSD(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenLiquidityUSDLoader.load(parent.identifier);
    }

    @ResolveField(() => String, { nullable: true })
    async createdAt(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenCreatedAtLoader.load(parent.identifier);
    }

    @ResolveField(() => Number, { nullable: true })
    async swapCount24h(parent: EsdtToken): Promise<number> {
        return this.tokenLoader.tokenSwapCountLoader.load(parent.identifier);
    }

    @ResolveField(() => Number, { nullable: true })
    async previous24hSwapCount(parent: EsdtToken): Promise<number> {
        return this.tokenLoader.tokenPrevious24hSwapCountLoader.load(
            parent.identifier,
        );
    }

    @ResolveField(() => String, { nullable: true })
    async trendingScore(parent: EsdtToken): Promise<string> {
        return this.tokenLoader.tokenTrendingScoreLoader.load(
            parent.identifier,
        );
    }

    @Query(() => [EsdtToken], {
        complexity: (options: ComplexityEstimatorArgs) => {
            return options.childComplexity * 400 + 1;
        },
        deprecationReason:
            'Will be deprecated if favor of the  "filteredTokens" query following GraphQL "Connection" standard for pagination/sorting/filtering.',
    })
    @UsePipes(new QueryArgsValidationPipe())
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

    @Query(() => TokensResponse, {
        complexity: relayQueryEstimator,
    })
    @UsePipes(new QueryArgsValidationPipe())
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
