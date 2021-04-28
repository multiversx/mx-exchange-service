import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { CacheManagerModule } from './services/cache-manager/cache-manager.module';
import { RouterModule } from './dex/router/router.module';
import { PairModule } from './dex/pair/pair.module';
import { FarmModule } from './dex/farm/farm.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        CacheManagerModule,
        RouterModule,
        PairModule,
        FarmModule,
        GraphQLModule.forRoot({
            autoSchemaFile: 'schema.gql',
        }),
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
