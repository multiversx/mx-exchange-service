import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { AbiFarmService } from './services/farm.abi.service';
import { FarmComputeService } from './services/farm.compute.service';
import { FarmGetterService } from './services/farm.getter.service';
import { FarmResolver } from './farm.resolver';
import { FarmService } from './services/farm.service';
import { FarmSetterService } from './services/farm.setter.service';
import { TransactionsFarmService } from './services/farm.transaction.service';

@Module({
    imports: [
        ContextModule,
        CachingModule,
        ElrondCommunicationModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmService,
        AbiFarmService,
        FarmGetterService,
        FarmSetterService,
        FarmComputeService,
        TransactionsFarmService,
        FarmResolver,
    ],
    exports: [
        FarmService,
        AbiFarmService,
        FarmGetterService,
        FarmSetterService,
        FarmComputeService,
        TransactionsFarmService,
    ],
})
export class FarmBaseModule {}
