import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Module({
    imports: [
        MongooseModule.forRootAsync({
            imports: [CommonAppModule],
            useFactory: async (configService: ApiConfigService) => ({
                uri: `${configService.getMongoDBURL()}`,
                dbName: configService.getMongoDBDatabase(),
                user: configService.getMongoDBUsername(),
                pass: configService.getMongoDBPassword(),
                tlsAllowInvalidCertificates: true,
            }),
            inject: [ApiConfigService],
        }),
    ],
})
export class DatabaseModule {}
