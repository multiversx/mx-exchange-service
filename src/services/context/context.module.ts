import { forwardRef, Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';
import { ContextService } from './context.service';
import { RouterModule } from '../../modules/router/router.module';
import { CachingModule } from '../caching/cache.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        forwardRef(() => RouterModule),
    ],
    providers: [ContextService],
    exports: [ContextService],
})
export class ContextModule {}
