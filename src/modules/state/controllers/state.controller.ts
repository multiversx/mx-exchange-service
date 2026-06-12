import {
    Body,
    Controller,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { JwtOrNativeAdminGuard } from 'src/modules/auth/jwt.or.native.admin.guard';
import { QueueTasksRequest } from '../entities/state.tasks.entities';
import { StateTasksService } from '../services/state.tasks.service';

@Controller('/state')
export class StateController {
    constructor(private readonly stateTasks: StateTasksService) {}

    @UseGuards(JwtOrNativeAdminGuard)
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
