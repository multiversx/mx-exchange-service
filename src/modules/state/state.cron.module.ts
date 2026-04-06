import { Module } from '@nestjs/common';
import { StateCronService } from './services/state.cron.service';
import { StateTasksModule } from './state.tasks.module';
import { StateService } from './services/state.service';
import { StateGrpcClientService } from './services/state.grpc.client.service';
import { StateGrpcClientModule } from './state.grpc.client.module';

@Module({
    imports: [StateTasksModule, StateGrpcClientModule],
    providers: [StateCronService, StateService, StateGrpcClientService],
})
export class StateCronModule {}
