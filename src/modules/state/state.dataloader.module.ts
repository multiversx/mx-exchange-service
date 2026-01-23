import { Module } from '@nestjs/common';
import { StateDataLoader } from './services/state.dataloader';
import { StateModule } from './state.module';

@Module({
    imports: [StateModule],
    providers: [StateDataLoader],
    exports: [StateDataLoader],
})
export class StateDataLoaderModule {}
