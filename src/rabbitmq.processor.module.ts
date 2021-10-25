import { Module } from '@nestjs/common';
import { RabbitMqModule } from './modules/rabbitmq/rabbitmq.module';

@Module({
    imports: [RabbitMqModule.register()],
})
export class RabbitMqProcessorModule {}
