import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';
import { TokenPersistenceService } from './services/token.persistence.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
        ]),
    ],
    providers: [TokenRepository, TokenPersistenceService],
    exports: [TokenPersistenceService],
    controllers: [],
})
export class PersistenceModule {}
