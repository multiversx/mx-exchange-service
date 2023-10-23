import { forwardRef, Module } from '@nestjs/common';
import { PairService } from './services/pair.service';
import { PairResolver } from './pair.resolver';
import { PairAbiService } from './services/pair.abi.service';
import { PairTransactionService } from './services/pair.transactions.service';
import { ContextModule } from '../../services/context/context.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { PairComputeService } from './services/pair.compute.service';
import { PairSetterService } from './services/pair.setter.service';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';
import { DatabaseModule } from 'src/services/database/database.module';
import { TokenModule } from '../tokens/token.module';
import { RouterModule } from '../router/router.module';
import { CommonAppModule } from 'src/common.app.module';
@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        WrappingModule,
        AnalyticsServicesModule,
        DatabaseModule,
        forwardRef(() => RouterModule),
        forwardRef(() => TokenModule),
    ],
    providers: [
        PairService,
        PairSetterService,
        PairComputeService,
        PairAbiService,
        PairTransactionService,
        PairResolver,
    ],
    exports: [
        PairService,
        PairSetterService,
        PairComputeService,
        PairAbiService,
    ],
})
export class PairModule {}
