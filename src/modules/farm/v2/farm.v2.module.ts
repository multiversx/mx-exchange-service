import { Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmBaseModule } from '../base-module/farm.base.module';
import { FarmAbiServiceV2 } from './services/farm.v2.abi.service';
import { FarmGetterServiceV2 } from './services/farm.v2.getter.service';
import { FarmResolverV2 } from './farm.v2.resolver';
import { FarmServiceV2 } from './services/farm.v2.service';

@Module({
    imports: [
        FarmBaseModule,
        CachingModule,
        ContextModule,
        ElrondCommunicationModule,
        TokenModule,
    ],
    providers: [
        FarmServiceV2,
        FarmAbiServiceV2,
        FarmGetterServiceV2,
        FarmResolverV2,
    ],
    exports: [FarmServiceV2],
})
export class FarmModuleV2 {}
