import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { MetabondingResolver } from './metabonding.resolver';
import { MetabondingAbiService } from './services/metabonding.abi.service';
import { MetabondingGetterService } from './services/metabonding.getter.service';
import { MetabondingService } from './services/metabonding.service';
import { MetabondingSetterService } from './services/metabonding.setter.service';
import { MetabondingTransactionService } from './services/metabonding.transactions.service';

@Module({
    imports: [ElrondCommunicationModule, ContextModule, CachingModule],
    providers: [
        MetabondingService,
        MetabondingAbiService,
        MetabondingGetterService,
        MetabondingSetterService,
        MetabondingTransactionService,
        MetabondingResolver,
    ],
    exports: [MetabondingAbiService, MetabondingSetterService],
})
export class MetabondingModule {}
