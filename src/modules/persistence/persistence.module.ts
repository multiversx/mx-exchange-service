import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PairModel } from '../pair/models/pair.model';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { TokenModule } from '../tokens/token.module';
import { PersistenceController } from './persistence.controller';
import { PairRepository } from './repositories/pair.repository';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { PairSchema } from './schemas/pair.schema';
import { PairPersistenceService } from './services/pair.persistence.service';
import { PersistenceInitService } from './services/persistence.init.service';
import { TokenPersistenceService } from './services/token.persistence.service';

@Module({
    imports: [
        MXCommunicationModule,
        MongooseModule.forFeature([
            { name: PairModel.name, schema: PairSchema },
            { name: EsdtToken.name, schema: EsdtTokenSchema },
        ]),
        DynamicModuleUtils.getCommonRedisModule(),
        DynamicModuleUtils.getRedlockModule(),
        PairModule,
        TokenModule,
        forwardRef(() => RouterModule),
        AnalyticsModule,
    ],
    providers: [
        PairRepository,
        TokenRepository,
        PairPersistenceService,
        TokenPersistenceService,
        PersistenceInitService,
    ],
    exports: [
        PersistenceInitService,
        PairPersistenceService,
        TokenPersistenceService,
    ],
    controllers: [PersistenceController],
})
export class PersistenceModule {}
