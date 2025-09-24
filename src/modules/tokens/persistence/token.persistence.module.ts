import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsdtToken } from '../models/esdtToken.model';
import { TokenRepository } from './services/token.repository';
import { TokenPersistenceService } from './services/token.persistence.service';
import { TokenModule } from '../token.module';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
        ]),
        TokenModule,
    ],
    providers: [TokenRepository, TokenPersistenceService],
    exports: [TokenPersistenceService],
})
export class TokenPersistenceModule {}
