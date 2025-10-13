import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { TokenRepository } from './repositories/token.repository';
import { EsdtTokenSchema } from './schemas/esdtToken.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: EsdtToken.name, schema: EsdtTokenSchema },
        ]),
    ],
    providers: [TokenRepository],
    exports: [],
    controllers: [],
})
export class PersistenceModule {}
