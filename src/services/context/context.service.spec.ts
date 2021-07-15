import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextService } from './context.service';
import {
    utilities as nestWinstonModuleUtilities,
    WinstonModule,
} from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';

describe('ContextService', () => {
    let service: ContextService;

    const logTransports: Transport[] = [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                nestWinstonModuleUtilities.format.nestLike(),
            ),
        }),
    ];

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                WinstonModule.forRoot({
                    transports: logTransports,
                }),
                CacheManagerModule,
                ElrondCommunicationModule,
            ],
            providers: [ContextService],
        }).compile();

        service = module.get<ContextService>(ContextService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get pairs graph', async () => {
        const pairsMap = await service.getPairsMap();

        const expectedMap = new Map();
        expectedMap.set('WEGLD-88600a', ['MEX-b6bb7d', 'BUSD-05b16f']);
        expectedMap.set('MEX-b6bb7d', ['WEGLD-88600a']);
        expectedMap.set('BUSD-05b16f', ['WEGLD-88600a']);

        expect(pairsMap).toEqual(expectedMap);
    });

    it('should get path between tokens', async () => {
        let path = await service.getPath('MEX-b6bb7d', 'WEGLD-88600a');
        expect(path).toEqual(['MEX-b6bb7d', 'WEGLD-88600a']);

        path = await service.getPath('BUSD-05b16f', 'WEGLD-88600a');
        expect(path).toEqual(['BUSD-05b16f', 'WEGLD-88600a']);

        path = await service.getPath('MEX-b6bb7d', 'BUSD-05b16f');
        expect(path).toEqual(['MEX-b6bb7d', 'WEGLD-88600a', 'BUSD-05b16f']);
    });

    it('should not get a path between tokens', async () => {
        const path = await service.getPath('MEX-b6bb7d', 'SPT-1111');
        expect(path).toEqual([]);
    });
});
