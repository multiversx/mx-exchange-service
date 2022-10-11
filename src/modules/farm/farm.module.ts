import { Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { CommonAppModule } from 'src/common.app.module';
import { TokenModule } from '../tokens/token.module';
import { FarmQueryResolver } from './farm.query.resolver';
import { FarmTransactionResolver } from './farm.transaction.resolver';
import { FarmBaseModule } from './base-module/farm.base.module';
import { FarmV12Module } from './v1.2/farm.v1.2.module';
import { FarmV2Module } from './v2/farm.v2.module';
import { FarmCustomModule } from './custom/farm.custom.module';
import { FarmV13Module } from './v1.3/farm.v1.3.module';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        TokenModule,
        FarmBaseModule,
        FarmCustomModule,
        FarmV12Module,
        FarmV13Module,
        FarmV2Module,
        FarmCustomModule,
    ],
    providers: [FarmQueryResolver, FarmTransactionResolver],
    exports: [],
})
export class FarmModule {}
