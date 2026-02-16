import { UseGuards } from '@nestjs/common';
import { Resolver, Query, Args } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { DustConvertArgs } from './models/dust.converter.args';
import { DustConvertQuoteModel } from './models/dust.converter.model';
import { DustConverterService } from './services/dust.converter.service';

@Resolver(() => DustConvertQuoteModel)
export class DustConverterResolver {
    constructor(private readonly dustConverterService: DustConverterService) { }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => DustConvertQuoteModel)
    async dustConvertQuote(
        @Args() args: DustConvertArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<DustConvertQuoteModel> {
        try {
            return await this.dustConverterService.getQuote(
                args,
                user.address,
            );
        } catch (error: any) {
            if (error.response?.status === 400) {
                throw new GraphQLError(
                    error.response?.data?.message ?? 'Bad request',
                    {
                        extensions: {
                            code: ApolloServerErrorCode.BAD_USER_INPUT,
                        },
                    },
                );
            }
            throw new GraphQLError(
                'Failed to get dust convert quote',
                {
                    extensions: {
                        code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                    },
                },
            );
        }
    }
}
