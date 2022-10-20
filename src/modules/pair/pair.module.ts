import { forwardRef, Module } from '@nestjs/common';
import { PairService } from './services/pair.service';
import { PairResolver } from './pair.resolver';
import { PairAbiService } from './services/pair.abi.service';
import { PairTransactionService } from './services/pair.transactions.service';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { CachingModule } from '../../services/caching/cache.module';
import { PairGetterService } from './services/pair.getter.service';
import { PairComputeService } from './services/pair.compute.service';
import { PairSetterService } from './services/pair.setter.service';
import { DatabaseModule } from 'src/services/database/database.module';
import { TokenModule } from '../tokens/token.module';
import { RouterModule } from '../router/router.module';
import { CommonAppModule } from 'src/common.app.module';
import { TimeSeriesModule } from 'src/services/time-series/time-series.module';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        ContextModule,
        WrappingModule,
        CachingModule,
        TimeSeriesModule,
        DatabaseModule,
        forwardRef(() => RouterModule),
        forwardRef(() => TokenModule),
    ],
    providers: [
        PairService,
        PairGetterService,
        PairSetterService,
        PairComputeService,
        PairAbiService,
        PairTransactionService,
        PairResolver,
    ],
    exports: [
        PairService,
        PairGetterService,
        PairSetterService,
        PairComputeService,
        PairAbiService,
    ],
})
export class PairModule {}
