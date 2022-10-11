import { Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmBaseModule } from '../base-module/farm.base.module';
import { FarmV2AbiService } from './services/farm.v2.abi.service';
import { FarmV2GetterService } from './services/farm.v2.getter.service';
import { FarmV2Resolver } from './farm.v2.resolver';
import { FarmV2Service } from './services/farm.v2.service';

@Module({
    imports: [
        FarmBaseModule,
        CachingModule,
        ContextModule,
        ElrondCommunicationModule,
        TokenModule,
    ],
    providers: [
        FarmV2Service,
        FarmV2AbiService,
        FarmV2GetterService,
        FarmV2Resolver,
    ],
    exports: [FarmV2Service],
})
export class FarmV2Module {}
