import { Module } from '@nestjs/common';
import { PairModule } from '../../modules/pair/pair.module';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';
import { HyperblockService } from './hyperblock.service';
import { TransactionCollectorService } from './transaction.collector.service';
import { TransactionInterpreterService } from './transaction.interpreter.service';
import { TransactionMappingService } from './transaction.mapping.service';

@Module({
    imports: [ElrondCommunicationModule, CacheManagerModule, PairModule],
    providers: [
        HyperblockService,
        TransactionMappingService,
        TransactionInterpreterService,
        TransactionCollectorService,
    ],
    exports: [
        TransactionCollectorService,
        TransactionInterpreterService,
        TransactionMappingService,
        HyperblockService,
    ],
})
export class TransactionModule {}
