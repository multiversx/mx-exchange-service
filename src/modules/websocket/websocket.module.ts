import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { WebSocketFarmHandlerService } from './websocket.farm.handler.service';
import { WebSocketPairHandlerService } from './websocket.pair.handler.service';

import { WebSocketService } from './websocket.service';

@Module({
    imports: [CommonAppModule, ContextModule, PairModule, FarmModule],
    providers: [
        WebSocketService,
        WebSocketPairHandlerService,
        WebSocketFarmHandlerService,
    exports: [],
})
export class WebSocketModule {}
