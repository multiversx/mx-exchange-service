import { Module } from '@nestjs/common';
import { RabbitMqModule } from './modules/websocket/rabbitmq.module';

@Module({
    imports: [RabbitMqModule.register()],
})
export class RabbitMqProcessorModule {}
