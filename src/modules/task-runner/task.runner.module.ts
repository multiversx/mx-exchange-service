import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AutoRouterModule } from '../auto-router/auto-router.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        ContextModule,
        DynamicModuleUtils.getRedlockModule(),
        DynamicModuleUtils.getCommonRedisModule(),
        AutoRouterModule,
    ],
    providers: [],
    exports: [],
})
export class TaskRunnerModule {}
