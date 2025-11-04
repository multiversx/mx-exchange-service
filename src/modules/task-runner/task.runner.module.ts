import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AutoRouterModule } from '../auto-router/auto-router.module';
import { FeesCollectorTasksService } from './services/fees.collector.tasks.service';
import { EnergyModule } from '../energy/energy.module';
import { FeesCollectorModule } from '../fees-collector/fees-collector.module';
import { TokenModule } from '../tokens/token.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { TaskRunnerTransactionService } from './services/task.runner.transaction.service';

@Module({
    imports: [
        CommonAppModule,
        ContextModule,
        MXCommunicationModule,
        DynamicModuleUtils.getCommonRedisModule(),
        AutoRouterModule,
        EnergyModule,
        FeesCollectorModule,
        TokenModule,
        WeekTimekeepingModule,
    ],
    providers: [FeesCollectorTasksService, TaskRunnerTransactionService],
    exports: [FeesCollectorTasksService],
})
export class TaskRunnerModule {}
