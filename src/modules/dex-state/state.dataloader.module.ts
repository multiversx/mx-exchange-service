import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { StateDataLoader } from './services/state.dataloader';
import { StateModule } from './state.module';

@Module({
    imports: [
        MXCommunicationModule,
        DynamicModuleUtils.getCacheModule(),
        StateModule,
    ],
    providers: [StateDataLoader],
    exports: [StateDataLoader],
})
export class StateDataLoaderModule {}
