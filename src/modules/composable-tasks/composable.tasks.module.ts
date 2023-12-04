import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { ComposableTasksTransactionService } from './services/composable.tasks.transaction';
import { ComposableTasksResolver } from './composable.tasks.resolver';

@Module({
    imports: [MXCommunicationModule],
    providers: [ComposableTasksTransactionService, ComposableTasksResolver],
    exports: [],
})
export class ComposableTasksModule {}
