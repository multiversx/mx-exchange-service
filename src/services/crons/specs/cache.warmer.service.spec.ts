import { Test } from '@nestjs/testing';
import axios from 'axios';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CacheService } from 'src/services/caching/cache.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { CacheWarmerService } from '../cache.warmer.service';

jest.mock('axios');

describe('CacheWarmerService guest cache warming', () => {
    const body = { query: `{ echo(text: "${'x'.repeat(10_000)}") }` };
    let service: CacheWarmerService;
    let cachingService: jest.Mocked<
        Pick<CacheService, 'zRangeByScoreRemote' | 'get' | 'set'>
    >;
    let logger: { info: jest.Mock; debug: jest.Mock; error: jest.Mock };

    beforeEach(async () => {
        cachingService = {
            zRangeByScoreRemote: jest
                .fn()
                .mockResolvedValueOnce(['bodyHash'])
                .mockResolvedValueOnce([]),
            get: jest.fn().mockResolvedValue(body),
            set: jest.fn(),
        };
        logger = { info: jest.fn(), debug: jest.fn(), error: jest.fn() };

        const module = await Test.createTestingModule({
            providers: [
                CacheWarmerService,
                { provide: MXApiService, useValue: {} },
                { provide: CacheService, useValue: cachingService },
                { provide: MXDataApiService, useValue: {} },
                { provide: PUB_SUB, useValue: {} },
                { provide: WINSTON_MODULE_PROVIDER, useValue: logger },
            ],
        }).compile();
        service = module.get(CacheWarmerService);
    });

    const loggedMessages = () =>
        [
            ...logger.info.mock.calls,
            ...logger.debug.mock.calls,
            ...logger.error.mock.calls,
        ].map(([message]) => message as string);

    it('stores the warmed response and logs the body truncated at debug level', async () => {
        jest.mocked(axios.post).mockResolvedValue({ data: { data: {} } });

        await service.cacheGuest();

        expect(cachingService.set).toHaveBeenCalledWith(
            'guestCache.bodyHash.response',
            { data: {} },
            expect.any(Number),
        );
        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalled();
        for (const message of loggedMessages()) {
            expect(message.length).toBeLessThan(2500);
        }
    });

    it('logs the body truncated when warming fails', async () => {
        jest.mocked(axios.post).mockRejectedValue(new Error('upstream down'));

        await service.cacheGuest();

        expect(logger.error).toHaveBeenCalled();
        for (const message of loggedMessages()) {
            expect(message.length).toBeLessThan(2500);
        }
    });
});
