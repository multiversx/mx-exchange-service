import { Injectable } from '@nestjs/common';
import { ComposableTasksAbiService } from '../services/composable.tasks.abi.service';

@Injectable()
export class ComposableTasksAbiServiceMock {
    async smartSwapFeePercentage(): Promise<number> {
        return Promise.resolve(50);
    }
}

export const ComposableTasksAbiServiceProvider = {
    provide: ComposableTasksAbiService,
    useClass: ComposableTasksAbiServiceMock,
};
