import { Module } from '@nestjs/common';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { TokenModule } from '../tokens/token.module';
import { StateSyncService } from './services/state.sync.service';

@Module({
    imports: [
        RouterModule,
        PairModule,
        TokenModule,
        MXCommunicationModule,
        AnalyticsModule,
    ],
    providers: [StateSyncService],
    exports: [StateSyncService],
})
export class StateSyncModule {}
