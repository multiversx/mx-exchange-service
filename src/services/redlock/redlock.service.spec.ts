import { Test, TestingModule } from '@nestjs/testing';
import { RedlockService } from './redlock.service';

describe('RedlockService', () => {
    let service: RedlockService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RedlockService],
        }).compile();

        service = module.get<RedlockService>(RedlockService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
