import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { DexModule } from './dex/dex.module';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ConfigModule,
    DexModule,
    GraphQLModule.forRoot({
      autoSchemaFile: 'schema.gql',
      buildSchemaOptions: {
        numberScalarMode: 'float'
      }
    }),
    CacheModule.register({
      ttl: 1800, // cache for 30 minutes,
      store: redisStore,
      host: process.env.REDIS_URL,
      port: process.env.REDIS_PORT,
      db: process.env.REDIS_DB,
      password: process.env.REDIS_PASSWORD,
      prefix: process.env.REDIS_PREFIX,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
