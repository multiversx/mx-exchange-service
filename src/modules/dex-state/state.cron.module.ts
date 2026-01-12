import { Module } from '@nestjs/common';
import { StateCronService } from './services/state.cron.service';
import { StateTasksModule } from './state.tasks.module';

@Module({
    imports: [StateTasksModule],
    providers: [StateCronService],
})
export class StateCronModule {}
