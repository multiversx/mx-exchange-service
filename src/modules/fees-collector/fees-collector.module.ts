import { Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { CommonAppModule } from 'src/common.app.module';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        TokenModule,
    ],
    providers: [
    ],
    exports: [

    ],
})
export class FeesCollectorModule {}
