import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { FarmCustomAbiService } from './services/farm.custom.abi.service';
import { FarmCustomResolver } from './farm.custom.resolver';
import { FarmCustomTransactionService } from './services/farm.custom.transaction.service';
import { FarmCustomComputeService } from './services/farm.custom.compute.service';
import { ContextModule } from 'src/services/context/context.module';
import { FarmCustomService } from './services/farm.custom.service';

@Module({
    imports: [
        CachingModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmCustomService,
        FarmCustomAbiService,
        FarmCustomComputeService,
        FarmCustomTransactionService,
        FarmCustomResolver,
    ],
    exports: [FarmCustomTransactionService],
})
export class FarmCustomModule {}
