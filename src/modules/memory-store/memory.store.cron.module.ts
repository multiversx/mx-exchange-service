import { Module } from '@nestjs/common';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ScheduleModule } from '@nestjs/schedule';
import { MemoryStoreCronService } from './services/memory.store.cron.service';
import { RouterModule } from '../router/router.module';

@Module({
    imports: [
        RouterModule,
        DynamicModuleUtils.getCacheModule(),
        ScheduleModule.forRoot(),
    ],
    providers: [MemoryStoreCronService],
})
export class MemoryStoreCronModule {}
