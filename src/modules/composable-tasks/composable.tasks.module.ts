import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { ComposableTasksTransactionService } from './services/composable.tasks.transaction';
import { ComposableTasksResolver } from './composable.tasks.resolver';
import { WrappingModule } from '../wrapping/wrap.module';
import { ComposableTasksAbiService } from './services/composable.tasks.abi.service';

@Module({
    imports: [MXCommunicationModule, WrappingModule],
    providers: [
        ComposableTasksTransactionService,
        ComposableTasksResolver,
        ComposableTasksAbiService,
    ],
    exports: [ComposableTasksTransactionService, ComposableTasksAbiService],
})
export class ComposableTasksModule {}
