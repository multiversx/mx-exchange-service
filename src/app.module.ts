import { HttpModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { CacheManagerModule } from './services/cache-manager/cache-manager.module';
import { RouterModule } from './modules/router/router.module';
import { PairModule } from './modules/pair/pair.module';
import { FarmModule } from './modules/farm/farm.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { WrappingModule } from './modules/wrapping/wrap.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { LockedAssetModule } from './modules/locked-asset-factory/locked-asset.module';
import { UserModule } from './modules/user/user.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        GraphQLModule.forRoot({
            autoSchemaFile: 'schema.gql',
            playground: true,
            debug: true,
        }),
        HttpModule,
        CacheManagerModule,
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
})
export class AppModule {}
