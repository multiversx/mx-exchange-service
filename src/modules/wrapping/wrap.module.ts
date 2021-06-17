import { Module } from '@nestjs/common';
import { ContextModule } from 'src/services/context/context.module';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { AbiWrapService } from './abi-wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';
import { WrapResolver } from './wrap.resolver';
import { WrapService } from './wrap.service';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [
        WrapService,
        AbiWrapService,
        TransactionsWrapService,
        WrapResolver,
    ],
    exports: [WrapService],
})
export class WrappingModule {}
