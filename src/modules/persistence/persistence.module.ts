import { Module } from '@nestjs/common';
import { PairPersistenceModule } from '../pair/persistence/pair.persistence.module';
import { TokenPersistenceModule } from '../tokens/persistence/token.persistence.module';
import { PersistenceController } from './persistence.controller';
import { PersistenceInitService } from './persistence.init.service';

@Module({
    imports: [TokenPersistenceModule, PairPersistenceModule],
    providers: [PersistenceInitService],
    exports: [],
    controllers: [PersistenceController],
})
export class PersistenceModule {}
