import { Module } from '@nestjs/common';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { StateTasksService } from './services/state.tasks.service';
import { StateModule } from './state.module';
import { StateSyncModule } from './state.sync.module';

@Module({
    imports: [
        DynamicModuleUtils.getCacheModule(),
        StateModule,
        StateSyncModule,
    ],
    providers: [StateTasksService],
    exports: [StateTasksService],
})
export class StateTasksModule {}
