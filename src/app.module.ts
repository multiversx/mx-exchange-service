import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { CacheManagerModule } from './services/cache-manager/cache-manager.module';
import { RouterModule } from './dex/router/router.module';
import { PairModule } from './dex/pair/pair.module';
import { FarmModule } from './dex/farm/farm.module';
import { DistributionModule } from './dex/distribution/distribution.module';
import { LockedRewardsModule } from './dex/locked-rewards/locked-rewards.module';
import { WrappingModule } from './dex/wrapping/wrap.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        CacheManagerModule,
        RouterModule,
        PairModule,
        FarmModule,
        DistributionModule,
        LockedRewardsModule,
        WrappingModule,
        GraphQLModule.forRoot({
            autoSchemaFile: 'schema.gql',
        }),
    ],
})
export class AppModule {}
