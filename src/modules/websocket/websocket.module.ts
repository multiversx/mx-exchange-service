import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';

import { WebSocketResolver } from './websocket.resolver';

@Module({
    imports: [CommonAppModule, ContextModule],
    providers: [WebSocketResolver],
    exports: [],
})
export class WebSocketModule {}
