import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { TokenModule } from '../tokens/token.module';
import { StateSyncService } from './services/state.sync.service';
import { StateSnapshot, StateSnapshotSchema } from './state.snapshot.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StateSnapshot.name, schema: StateSnapshotSchema },
        ]),
        RouterModule,
        PairModule,
        TokenModule,
        MXCommunicationModule,
        AnalyticsModule,
        ContextModule,
    ],
    providers: [StateSyncService],
    exports: [StateSyncService],
})
export class StateSyncModule {}
