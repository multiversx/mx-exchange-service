import { CacheModule, HttpStatus, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { RouterModule } from './modules/router/router.module';
import { PairModule } from './modules/pair/pair.module';
import { FarmModule } from './modules/farm/farm.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { WrappingModule } from './modules/wrapping/wrap.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { LockedAssetModule } from './modules/locked-asset-factory/locked-asset.module';
import { UserModule } from './modules/user/user.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { CommonAppModule } from './common.app.module';
import { CachingService } from './services/caching/cache.service';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as Transport from 'winston-transport';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuthModule } from './modules/auth/auth.module';
import { StakingModule } from './modules/staking/staking.module';
import { StakingProxyModule } from './modules/staking-proxy/staking.proxy.module';
import { MetabondingModule } from './modules/metabonding/metabonding.module';
import { PriceDiscoveryModule } from './modules/price-discovery/price.discovery.module';
import { SimpleLockModule } from './modules/simple-lock/simple.lock.module';
import { TokenModule } from './modules/tokens/token.module';
import { AutoRouterModule } from './modules/auto-router/auto-router.module';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { deprecationLoggerMiddleware } from './utils/deprecate.logger.middleware';
import { GraphQLRequestContext, GraphQLResponse } from 'apollo-server-types';

@Module({
    imports: [
        CommonAppModule,
        AuthModule,
        CacheModule.register(),
        GraphQLModule.forRoot<ApolloDriverConfig>({
            driver: ApolloDriver,
            autoSchemaFile: 'schema.gql',
            installSubscriptionHandlers: true,
            buildSchemaOptions: {
                fieldMiddleware: [deprecationLoggerMiddleware],
            },
            formatResponse: (
                response: GraphQLResponse,
                requestContext: GraphQLRequestContext,
            ) => {
                const { context } = requestContext;
                const { req } = context;
                const extensionResponse = req?.deprecationWarning
                    ? {
                          extensions: {
                              deprecationWarning: req?.deprecationWarning,
                          },
                      }
                    : {};
                return {
                    ...response,
                    ...extensionResponse,
                };
            },
            formatError: (error: GraphQLError) => {
                const graphQLFormattedError: GraphQLFormattedError = {
                    message: error.message,
                    path: error.path,
                    extensions: {
                        code: error.extensions.code,
                    },
                };

                const loglevel = !!process.env.LOG_LEVEL
                    ? process.env.LOG_LEVEL
                    : 'error';
                const logTransports: Transport[] = [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.timestamp(),
                            nestWinstonModuleUtilities.format.nestLike(),
                        ),
                        level: loglevel,
                    }),
                ];
                if (!!process.env.LOG_FILE) {
                    logTransports.push(
                        new winston.transports.File({
                            filename: process.env.LOG_FILE,
                            dirname: 'logs',
                            maxsize: 100000,
                            level: loglevel,
                        }),
                    );
                }
                const logger = winston.createLogger({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        nestWinstonModuleUtilities.format.nestLike(),
                    ),
                    level: loglevel,
                    transports: logTransports,
                });
                const errorStatus = error.toJSON().extensions['code'];
                switch (errorStatus) {
                    case 'FORBIDDEN':
                        logger.info(error.message, { path: error.path });
                        break;
                    default:
                        logger.error(error.message, error.extensions);
                        break;
                }

                return graphQLFormattedError;
            },
            fieldResolverEnhancers: ['guards'],
        }),
        RouterModule,
        AutoRouterModule,
        PairModule,
        FarmModule,
        StakingModule,
        StakingProxyModule,
        DistributionModule,
        ProxyModule,
        LockedAssetModule,
        MetabondingModule,
        PriceDiscoveryModule,
        SimpleLockModule,
        WrappingModule,
        TokenModule,
        UserModule,
        AnalyticsModule,
        SubscriptionsModule,
    ],
    providers: [CachingService],
})
export class PublicAppModule {}
