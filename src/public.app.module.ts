import { CacheModule, HttpModule, Module } from '@nestjs/common';
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
import { loggerMiddleware } from './utils/loggerMiddleware';
import { CommonAppModule } from './common.app.module';
import { CachingService } from './services/caching/cache.service';

@Module({
    imports: [
        CommonAppModule,
        CacheModule.register(),
        GraphQLModule.forRoot({
            autoSchemaFile: 'schema.gql',
            buildSchemaOptions: {
                fieldMiddleware: [loggerMiddleware],
            },
            formatError: (error: GraphQLError) => {
                const graphQLFormattedError: GraphQLFormattedError = {
                    ...error,
                    message:
                        error.extensions?.exception?.response?.message ||
                        error.message,
                };
                console.error(graphQLFormattedError);
                return graphQLFormattedError;
            },
        }),
        HttpModule,
        RouterModule,
        PairModule,
        FarmModule,
        DistributionModule,
        ProxyModule,
        LockedAssetModule,
        WrappingModule,
        UserModule,
        AnalyticsModule,
    ],
    providers: [CachingService],
})
export class PublicAppModule {}
