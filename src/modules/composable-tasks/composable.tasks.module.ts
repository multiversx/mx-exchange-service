import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { ComposableTasksTransactionService } from './services/composable.tasks.transaction';
import { ComposableTasksResolver } from './composable.tasks.resolver';
import { WrappingModule } from '../wrapping/wrap.module';

@Module({
    imports: [MXCommunicationModule, WrappingModule],
    providers: [ComposableTasksTransactionService, ComposableTasksResolver],
    exports: [ComposableTasksTransactionService],
})
export class ComposableTasksModule {}
