import { Module } from '@nestjs/common';
import { PairService } from './services/pair.service';
import { PairResolver } from './pair.resolver';
import { PairAbiService } from './services/pair.abi.service';
import { PairTransactionService } from './services/pair.transactions.service';
import { PriceFeedModule } from '../../services/price-feed/price-feed.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { CachingModule } from '../../services/caching/cache.module';
import { PairGetterService } from './services/pair.getter.service';
import { PairComputeService } from './services/pair.compute.service';
import { PairSetterService } from './services/pair.setter.service';
import { AWSModule } from 'src/services/aws/aws.module';
import { PairDBService } from './services/pair.db.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Pair, PairSchema } from './schemas/pair.schema';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        PriceFeedModule,
        WrappingModule,
        CachingModule,
        AWSModule,
        MongooseModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: async (configService: ApiConfigService) => ({
                uri: `mongodb+srv://${configService.getMongoDBURL()}`,
                dbName: configService.getMongoDBDatabase(),
                user: configService.getMongoDBUsername(),
                pass: configService.getMongoDBPassword(),
                tlsAllowInvalidCertificates: true,
            }),
            inject: [ApiConfigService],
        }),
        MongooseModule.forFeature([{ name: Pair.name, schema: PairSchema }]),
    ],
    providers: [
        PairService,
        PairGetterService,
        PairSetterService,
        PairComputeService,
        PairDBService,
        PairAbiService,
        PairTransactionService,
        PairResolver,
    ],
    exports: [
        PairService,
        PairGetterService,
        PairSetterService,
        PairComputeService,
        PairDBService,
        PairAbiService,
        MongooseModule.forFeature([{ name: Pair.name, schema: PairSchema }]),
    ],
})
export class PairModule {}
