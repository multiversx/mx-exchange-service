import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmAbiServiceV1_3 } from './services/farm.v1.3.abi.service';
import { FarmComputeServiceV1_3 } from './services/farm.v1.3.compute.service';
import { FarmGetterServiceV1_3 } from './services/farm.v1.3.getter.service';
import { FarmResolverV1_3 } from './farm.v1.3.resolver';
import { FarmTransactionServiceV1_3 } from './services/farm.v1.3.transaction.service';
import { FarmServiceV1_3 } from './services/farm.v1.3.service';
import { FarmGetterService } from '../base-module/services/farm.getter.service';
import { FarmSetterService } from '../base-module/services/farm.setter.service';
import { FarmSetterServiceV1_3 } from './services/farm.v1.3.setter.service';

@Module({
    imports: [
        CachingModule,
        ContextModule,
        ElrondCommunicationModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmServiceV1_3,
        FarmAbiServiceV1_3,
        FarmGetterServiceV1_3,
        {
            provide: FarmGetterService,
            useClass: FarmGetterServiceV1_3,
        },
        {
            provide: FarmSetterService,
            useClass: FarmSetterServiceV1_3,
        },
        FarmSetterServiceV1_3,
        FarmComputeServiceV1_3,
        FarmTransactionServiceV1_3,
        FarmResolverV1_3,
    ],
    exports: [
        FarmServiceV1_3,
        FarmAbiServiceV1_3,
        FarmGetterServiceV1_3,
        FarmSetterServiceV1_3,
        FarmComputeServiceV1_3,
        FarmTransactionServiceV1_3,
    ],
})
export class FarmModuleV1_3 {}
