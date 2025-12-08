import { Module } from '@nestjs/common';
// import { AnalyticsModule } from 'src/services/analytics/analytics.module';
// import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
// import { PairModule } from '../pair/pair.module';
// import { RouterModule } from '../router/router.module';
// import { TokenModule } from '../tokens/token.module';
import { DexStateCronService } from './services/dex.state.cron.service';
import { StateTasksModule } from './state.tasks.module';

@Module({
    imports: [
        StateTasksModule,
        // RouterModule,
        // PairModule,
        // TokenModule,
        // MXCommunicationModule,
        // AnalyticsModule,
    ],
    providers: [DexStateCronService],
})
export class StateCronModule {}
