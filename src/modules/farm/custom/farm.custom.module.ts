import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmCustomAbiService } from './services/farm.custom.abi.service';
import { FarmCustomGetterService } from './services/farm.custom.getter.service';
import { FarmCustomResolver } from './farm.custom.resolver';
import { FarmCustomTransactionService } from './services/farm.custom.transaction.service';
import { FarmCustomComputeService } from './services/farm.custom.compute.service';
import { FarmComputeService } from '../base-module/services/farm.compute.service';
import { FarmGetterService } from '../base-module/services/farm.getter.service';
import { ContextModule } from 'src/services/context/context.module';

@Module({
    imports: [
        CachingModule,
        ElrondCommunicationModule,
        ContextModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmCustomAbiService,
        FarmCustomGetterService,
        {
            provide: FarmGetterService,
            useClass: FarmCustomGetterService,
        },
        FarmCustomComputeService,
        {
            provide: FarmComputeService,
            useClass: FarmCustomComputeService,
        },
        FarmCustomTransactionService,
        FarmCustomResolver,
    ],
    exports: [FarmCustomTransactionService],
})
export class FarmCustomModule {}
