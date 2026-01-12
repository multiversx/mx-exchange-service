import {
    Body,
    Controller,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { QueueTasksRequest } from './entities';
import { StateTasksService } from './services/state.tasks.service';

@Controller('/state')
export class StateController {
    constructor(private readonly stateTasks: StateTasksService) {}

    @UsePipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    )
    @Post('/queue-tasks')
    async queueTasks(@Body() body: QueueTasksRequest): Promise<string> {
        await this.stateTasks.queueTasks(body.tasks);

        return `Tasks added to queue`;
    }
}
