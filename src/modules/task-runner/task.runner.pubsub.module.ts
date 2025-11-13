import { Module } from '@nestjs/common';
import { TaskRunnerController } from './task.runner.controller';
import { TaskRunnerModule } from './task.runner.module';

@Module({
    imports: [TaskRunnerModule],
    controllers: [TaskRunnerController],
    providers: [],
})
export class TaskRunnerPubSubModule {}
