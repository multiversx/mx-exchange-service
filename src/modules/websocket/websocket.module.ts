import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { PairModule } from '../pair/pair.module';
import { WebSocketPairHandlerService } from './websocket.pair.handler.service';

import { WebSocketService } from './websocket.service';

@Module({
    providers: [
        WebSocketService,
        WebSocketPairHandlerService,
        WebSocketFarmHandlerService,
    exports: [],
})
export class WebSocketModule {}
