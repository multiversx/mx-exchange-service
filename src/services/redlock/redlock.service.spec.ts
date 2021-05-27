import { Test, TestingModule } from '@nestjs/testing';
import { RedisModule } from 'nestjs-redis';
import { RedlockService } from './redlock.service';

describe('RedlockService', () => {
    let service: RedlockService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                RedisModule.register({
                    host: process.env.REDIS_URL,
                    port: parseInt(process.env.REDIS_PORT),
                    password: process.env.REDIS_PASSWORD,
                    keyPrefix: process.env.REDIS_PREFIX,
                }),
            ],
            providers: [RedlockService],
        }).compile();

        service = module.get<RedlockService>(RedlockService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
