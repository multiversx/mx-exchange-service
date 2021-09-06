import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';

import { WebSocketService } from './websocket.service';

@Module({
    imports: [CommonAppModule, ContextModule],
    providers: [WebSocketService],
    exports: [],
})
export class WebSocketModule {}
