import { Module } from '@nestjs/common';
import { PositionCreatorResolver } from './position.creator.resolver';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { PositionCreatorComputeService } from './services/position.creator.compute';
import { PositionCreatorTransactionService } from './services/position.creator.transaction';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { AutoRouterModule } from '../auto-router/auto-router.module';

@Module({
    imports: [
        PairModule,
        RouterModule,
        AutoRouterModule,
        MXCommunicationModule,
    ],
    providers: [
        PositionCreatorComputeService,
        PositionCreatorTransactionService,
        PositionCreatorResolver,
    ],
    exports: [],
})
export class PositionCreatorModule {}
