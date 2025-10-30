import { Module } from '@nestjs/common';
import { PersistenceModule } from './persistence.module';
import { PersistenceCronService } from './services/persistence.cron';

@Module({
    imports: [PersistenceModule],
    providers: [PersistenceCronService],
    exports: [],
})
export class PersistenceCronModule {}
