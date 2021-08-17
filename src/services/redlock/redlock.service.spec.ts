import { Test, TestingModule } from '@nestjs/testing';
import { CachingModule } from '../caching/cache.module';
import { RedlockService } from './redlock.service';

describe('RedlockService', () => {
    let service: RedlockService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CachingModule],
            providers: [RedlockService],
        }).compile();

        service = module.get<RedlockService>(RedlockService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
