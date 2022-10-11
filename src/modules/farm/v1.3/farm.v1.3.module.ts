import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmBaseModule } from '../base-module/farm.base.module';
import { FarmV13AbiService } from './services/farm.v1.3.abi.service';
import { FarmV13ComputeService } from './services/farm.v1.3.compute.service';
import { FarmV13GetterService } from './services/farm.v1.3.getter.service';
import { FarmV13Resolver } from './farm.v1.3.resolver';
import { FarmV13TransactionService } from './services/farm.v1.3.transaction.service';

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
        FarmV13AbiService,
        FarmV13GetterService,
        FarmV13ComputeService,
        FarmV13TransactionService,
        FarmV13Resolver,
    ],
    exports: [FarmV13ComputeService, FarmV13TransactionService],
})
export class FarmV13Module {}
