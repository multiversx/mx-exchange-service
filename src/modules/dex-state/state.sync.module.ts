import { Module } from '@nestjs/common';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { TokenModule } from '../tokens/token.module';
// import { StateModule } from './state.module';
import { DexStateSyncService } from './services/dex.state.sync.service';

@Module({
    imports: [
        // StateModule,
        RouterModule,
        PairModule,
        TokenModule,
        MXCommunicationModule,
        AnalyticsModule,
    ],
    providers: [DexStateSyncService],
    exports: [DexStateSyncService],
})
export class StateSyncModule {}
