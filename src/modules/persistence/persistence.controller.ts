import {
    Body,
    Controller,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { QueueTasksRequest } from './entities';
import { PersistenceService } from './services/persistence.service';

@Controller('/persistence')
export class PersistenceController {
    constructor(private readonly persistenceService: PersistenceService) {}

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
        await this.persistenceService.queueTasks(body.tasks);

        return `Tasks added to queue`;
    }
}
