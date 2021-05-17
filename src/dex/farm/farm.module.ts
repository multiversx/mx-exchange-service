import { Module } from '@nestjs/common';
import { FarmService } from './farm.service';
import { FarmResolver } from './farm.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';
import { AbiFarmService } from './abi-farm.service';
import { TransactionsFarmService } from './transactions-farm.service';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [
        FarmService,
        AbiFarmService,
        TransactionsFarmService,
        FarmResolver,
    ],
    exports: [FarmService],
})
export class FarmModule {}
