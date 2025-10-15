import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { PairModel } from '../pair/models/pair.model';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { TokenModule } from '../tokens/token.module';
import { PairRepository } from './repositories/pair.repository';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { PairSchema } from './schemas/pair.schema';
import { PairPersistenceService } from './services/pair.persistence.service';
import { PersistenceService } from './services/persistence.service';
import { TokenPersistenceService } from './services/token.persistence.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
            { name: PairModel.name, schema: PairSchema },
        ]),
        forwardRef(() => RouterModule),
        forwardRef(() => TokenModule),
        forwardRef(() => PairModule),
        MXCommunicationModule,
        AnalyticsModule,
        DynamicModuleUtils.getCommonRedisModule(),
        DynamicModuleUtils.getRedlockModule(),
    ],
    providers: [
        TokenRepository,
        TokenPersistenceService,
        PairRepository,
        PairPersistenceService,
        PersistenceService,
    ],
    exports: [
        TokenPersistenceService,
        PairPersistenceService,
        PersistenceService,
    ],
    controllers: [],
})
export class PersistenceModule {}
