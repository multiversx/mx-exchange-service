import { Module } from '@nestjs/common';
import { TokenModule } from '../tokens/token.module';
import { StateDataLoader } from './services/state.dataloader';
import { StateModule } from './state.module';

@Module({
    imports: [StateModule, TokenModule],
    providers: [StateDataLoader],
    exports: [StateDataLoader],
})
export class StateDataLoaderModule {}
