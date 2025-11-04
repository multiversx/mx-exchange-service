import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { TaskRunnerCronService } from './services/task.runner.cron.service';
import { TaskRunnerModule } from './task.runner.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        DynamicModuleUtils.getRedlockModule(),
        TaskRunnerModule,
    ],
    providers: [TaskRunnerCronService],
})
export class TaskRunnerCronModule {}
