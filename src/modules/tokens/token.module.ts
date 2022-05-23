import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtTokenDbModel, EsdtTokenSchema } from './schemas/token.schema';
import { TokenDBService } from './services/token.db.service';
import { TokenGetterService } from './services/token.getter.service';
import { TokenService } from './services/token.service';
import { TokensResolver } from './token.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        RouterModule,
        PairModule,
        MongooseModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: async (configService: ApiConfigService) => ({
                uri: `${configService.getMongoDBURL()}`,
                dbName: configService.getMongoDBDatabase(),
                user: configService.getMongoDBUsername(),
                pass: configService.getMongoDBPassword(),
                tlsAllowInvalidCertificates: true,
            }),
            inject: [ApiConfigService],
        }),
        MongooseModule.forFeature([
            { name: EsdtTokenDbModel.name, schema: EsdtTokenSchema },
        ]),
    ],
    providers: [
        TokenService,
        TokenGetterService,
        TokenDBService,
        TokensResolver,
    ],
    exports: [
        TokenDBService,
        MongooseModule.forFeature([
            { name: EsdtTokenDbModel.name, schema: EsdtTokenSchema },
        ]),
    ],
})
export class TokenModule {}
