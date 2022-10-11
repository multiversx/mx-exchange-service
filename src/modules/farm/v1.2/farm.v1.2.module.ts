import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmBaseModule } from '../base-module/farm.base.module';
import { FarmV12AbiService } from './services/farm.v1.2.abi.service';
import { FarmV12ComputeService } from './services/farm.v1.2.compute.service';
import { FarmV12GetterService } from './services/farm.v1.2.getter.service';
import { FarmV12Resolver } from './farm.v1.2.resolver';
import { FarmV12TransactionService } from './services/farm.v1.2.transaction.service';

@Module({
    imports: [
        FarmBaseModule,
        CachingModule,
        ContextModule,
        ElrondCommunicationModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmV12AbiService,
        FarmV12GetterService,
        FarmV12ComputeService,
        FarmV12TransactionService,
        FarmV12Resolver,
    ],
    exports: [
        FarmV12AbiService,
        FarmV12ComputeService,
        FarmV12TransactionService,
    ],
})
export class FarmV12Module {}
