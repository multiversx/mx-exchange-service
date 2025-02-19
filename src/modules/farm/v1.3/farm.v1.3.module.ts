import { Module, forwardRef } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { FarmAbiServiceV1_3 } from './services/farm.v1.3.abi.service';
import { FarmComputeServiceV1_3 } from './services/farm.v1.3.compute.service';
import { FarmResolverV1_3 } from './farm.v1.3.resolver';
import { FarmTransactionServiceV1_3 } from './services/farm.v1.3.transaction.service';
import { FarmServiceV1_3 } from './services/farm.v1.3.service';
import { FarmSetterService } from '../base-module/services/farm.setter.service';
import { FarmSetterServiceV1_3 } from './services/farm.v1.3.setter.service';
import { FarmAbiLoaderV1_3 } from './services/farm.v1.3.abi.loader';
import { FarmComputeLoaderV1_3 } from './services/farm.v1.3.compute.loader';

@Module({
    imports: [
        ContextModule,
        MXCommunicationModule,
        TokenModule,
        forwardRef(() => PairModule),
    ],
    providers: [
        FarmAbiLoaderV1_3,
        FarmComputeLoaderV1_3,
        FarmServiceV1_3,
        FarmAbiServiceV1_3,
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
        FarmSetterServiceV1_3,
        FarmComputeServiceV1_3,
        FarmTransactionServiceV1_3,
    ],
})
export class FarmModuleV1_3 {}
