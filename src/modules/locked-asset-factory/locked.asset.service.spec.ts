import { Test, TestingModule } from '@nestjs/testing';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextService } from 'src/services/context/context.service';
import { ContextServiceMock } from 'src/services/context/context.service.mocks';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from './abi.locked.asset.service.mock';
import { LockedAssetService } from './locked-asset.service';
import {
    LockedAssetAttributes,
    UnlockMileStoneModel,
} from './models/locked-asset.model';

describe('FarmService', () => {
    let service: LockedAssetService;
    let context: ContextService;

    const ContextServiceProvider = {
        provide: ContextService,
        useClass: ContextServiceMock,
    };

    const AbiLockedAssetServiceProvider = {
        provide: AbiLockedAssetService,
        useClass: AbiLockedAssetServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule, CachingModule],
            providers: [
                ContextServiceProvider,
                AbiLockedAssetServiceProvider,
                LockedAssetService,
            ],
        }).compile();

        service = module.get<LockedAssetService>(LockedAssetService);
        context = module.get<ContextService>(ContextService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get unlock schedule', async () => {
        const decodedLockedMEX = await service.decodeLockedAssetAttributes({
            batchAttributes: [
                {
                    attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                    identifier: '',
                },
            ],
        });
        expect(decodedLockedMEX).toEqual([
            new LockedAssetAttributes({
                attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                identifier: '',
                isMerged: false,
                unlockSchedule: [
                    new UnlockMileStoneModel({
                        epochs: 0,
                        percent: 10,
                    }),
                    new UnlockMileStoneModel({
                        epochs: 30,
                        percent: 90,
                    }),
                ],
            }),
        ]);
    });

    it('should get unlock schedule2', async () => {
        jest.spyOn(context, 'getCurrentEpoch').mockImplementation(async () => {
            return 2;
        });
        const decodedLockedMEX = await service.decodeLockedAssetAttributes({
            batchAttributes: [
                {
                    attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                    identifier: '',
                },
            ],
        });
        expect(decodedLockedMEX).toEqual([
            new LockedAssetAttributes({
                attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                identifier: '',
                isMerged: false,
                unlockSchedule: [
                    new UnlockMileStoneModel({
                        epochs: 0,
                        percent: 10,
                    }),
                    new UnlockMileStoneModel({
                        epochs: 29,
                        percent: 90,
                    }),
                ],
            }),
        ]);
    });

    it('should get unlock schedule3', async () => {
        jest.spyOn(context, 'getCurrentEpoch').mockImplementation(async () => {
            return 10;
        });
        const decodedLockedMEX = await service.decodeLockedAssetAttributes({
            batchAttributes: [
                {
                    attributes: 'AAAAAgAAAAAAAAACCgAAAAAAAAAfWgA=',
                    identifier: '',
                },
            ],
        });
        expect(decodedLockedMEX).toEqual([
            new LockedAssetAttributes({
                attributes: 'AAAAAgAAAAAAAAACCgAAAAAAAAAfWgA=',
                identifier: '',
                isMerged: false,
                unlockSchedule: [
                    new UnlockMileStoneModel({
                        epochs: 21,
                        percent: 10,
                    }),
                    new UnlockMileStoneModel({
                        epochs: 51,
                        percent: 90,
                    }),
                ],
            }),
        ]);
    });
});
