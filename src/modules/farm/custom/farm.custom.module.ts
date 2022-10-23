import { Module } from '@nestjs/common';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmBaseModule } from '../base-module/farm.base.module';
import { FarmCustomAbiService } from './services/farm.custom.abi.service';
import { FarmCustomGetterService } from './services/farm.custom.getter.service';
import { FarmCustomResolver } from './farm.custom.resolver';
import { FarmCustomTransactionService } from './services/farm.custom.transaction.service';

@Module({
    imports: [
        FarmBaseModule,
        CachingModule,
        ElrondCommunicationModule,
        TokenModule,
        PairModule,
    ],
    providers: [
        FarmCustomAbiService,
        FarmCustomGetterService,
        FarmCustomTransactionService,
        FarmCustomResolver,
    ],
    exports: [FarmCustomTransactionService],
})
export class FarmCustomModule {}
