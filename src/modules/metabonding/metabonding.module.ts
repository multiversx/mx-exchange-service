import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { MetabondingResolver } from './metabonding.resolver';
import { MetabondingAbiService } from './services/metabonding.abi.service';
import { MetabondingService } from './services/metabonding.service';
import { MetabondingSetterService } from './services/metabonding.setter.service';
import { MetabondingTransactionService } from './services/metabonding.transactions.service';

@Module({
    imports: [MXCommunicationModule, TokenModule],
    providers: [
        MetabondingService,
        MetabondingAbiService,
        MetabondingSetterService,
        MetabondingTransactionService,
        MetabondingResolver,
    ],
    exports: [MetabondingAbiService, MetabondingSetterService],
})
export class MetabondingModule {}
