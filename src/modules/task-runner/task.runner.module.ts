import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { AutoRouterModule } from '../auto-router/auto-router.module';
import { FeesCollectorTasksService } from './services/fees.collector.tasks.service';
import { EnergyModule } from '../energy/energy.module';
import { FeesCollectorModule } from '../fees-collector/fees-collector.module';
import { TokenModule } from '../tokens/token.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        ContextModule,
        MXCommunicationModule,
        DynamicModuleUtils.getRedlockModule(),
        DynamicModuleUtils.getCommonRedisModule(),
        AutoRouterModule,
        EnergyModule,
        FeesCollectorModule,
        TokenModule,
    ],
    providers: [FeesCollectorTasksService],
    exports: [],
})
export class TaskRunnerModule {}
