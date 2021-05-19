import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GraphQLModule } from '@nestjs/graphql';
import { CacheManagerModule } from './services/cache-manager/cache-manager.module';
import { RouterModule } from './dex/router/router.module';
import { PairModule } from './dex/pair/pair.module';
import { FarmModule } from './dex/farm/farm.module';
import { DistributionModule } from './dex/distribution/distribution.module';
import { WrappingModule } from './dex/wrapping/wrap.module';
import { ProxyModule } from './dex/proxy/proxy.module';
import { LockedAssetModule } from './dex/locked-asset-factory/locked-asset.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        CacheManagerModule,
        RouterModule,
        PairModule,
        FarmModule,
        DistributionModule,
        ProxyModule,
        LockedAssetModule,
        WrappingModule,
        GraphQLModule.forRoot({
            autoSchemaFile: 'schema.gql',
        }),
    ],
})
export class AppModule {}
