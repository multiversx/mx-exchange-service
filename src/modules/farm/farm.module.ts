import { Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { CommonAppModule } from 'src/common.app.module';
import { TokenModule } from '../tokens/token.module';
import { FarmQueryResolver } from './farm.query.resolver';
import { FarmTransactionResolver } from './farm.transaction.resolver';
import { FarmModuleV1_2 } from './v1.2/farm.v1.2.module';
import { FarmModuleV2 } from './v2/farm.v2.module';
import { FarmCustomModule } from './custom/farm.custom.module';
import { FarmModuleV1_3 } from './v1.3/farm.v1.3.module';
import { FarmFactoryService } from './farm.factory';
import { FarmGetterFactory } from './farm.getter.factory';
import { FarmTransactionFactory } from './farm.transaction.factory';
import { FarmComputeFactory } from './farm.compute.factory';
import { FarmAbiFactory } from './farm.abi.factory';
import { FarmSetterFactory } from './farm.setter.factory';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        TokenModule,
        FarmCustomModule,
        FarmModuleV1_2,
        FarmModuleV1_3,
        FarmModuleV2,
        FarmCustomModule,
    ],
    providers: [
        FarmFactoryService,
        FarmAbiFactory,
        FarmGetterFactory,
        FarmSetterFactory,
        FarmComputeFactory,
        FarmTransactionFactory,
        FarmQueryResolver,
        FarmTransactionResolver,
    ],
    exports: [
        FarmFactoryService,
        FarmAbiFactory,
        FarmGetterFactory,
        FarmSetterFactory,
        FarmComputeFactory,
    ],
})
export class FarmModule {}
