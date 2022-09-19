import { Test, TestingModule } from '@nestjs/testing';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextGetterServiceMock } from 'src/services/context/mocks/context.getter.service.mock';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { AbiLockedAssetService } from '../services/abi-locked-asset.service';
import { AbiLockedAssetServiceMock } from '../mocks/abi.locked.asset.service.mock';
import { LockedAssetService } from '../services/locked-asset.service';
import {
    LockedAssetAttributesModel,
    UnlockMileStoneModel,
} from '../models/locked-asset.model';
import { LockedAssetGetterService } from '../services/locked.asset.getter.service';
import { TokenGetterServiceProvider } from 'src/modules/tokens/mocks/token.getter.service.mock';

describe('LockedAssetService', () => {
    let service: LockedAssetService;
    let contextGetter: ContextGetterService;

    const ContextGetterServiceProvider = {
        provide: ContextGetterService,
        useClass: ContextGetterServiceMock,
    };

    const AbiLockedAssetServiceProvider = {
        provide: AbiLockedAssetService,
        useClass: AbiLockedAssetServiceMock,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                CommonAppModule,
                CachingModule,
                ElrondCommunicationModule,
            ],
            providers: [
                ContextGetterServiceProvider,
                TokenGetterServiceProvider,
                AbiLockedAssetServiceProvider,
                LockedAssetService,
                LockedAssetGetterService,
            ],
        }).compile();

        service = module.get<LockedAssetService>(LockedAssetService);
        contextGetter = module.get<ContextGetterService>(ContextGetterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get unlock schedule', async () => {
        const decodedLockedMEX = await service.decodeLockedAssetAttributes({
            batchAttributes: [
                {
                    attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                    identifier: 'LKTOK-1234-01',
                },
            ],
        });
        expect(decodedLockedMEX).toEqual([
            new LockedAssetAttributesModel({
                attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                identifier: 'LKTOK-1234-01',
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
        jest.spyOn(contextGetter, 'getCurrentEpoch').mockImplementation(
            async () => {
                return 2;
            },
        );
        const decodedLockedMEX = await service.decodeLockedAssetAttributes({
            batchAttributes: [
                {
                    attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                    identifier: 'LKTOK-1234-01',
                },
            ],
        });
        expect(decodedLockedMEX).toEqual([
            new LockedAssetAttributesModel({
                attributes: 'AAAAAgAAAAAAAAABCgAAAAAAAAAeWgA=',
                identifier: 'LKTOK-1234-01',
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
        jest.spyOn(contextGetter, 'getCurrentEpoch').mockImplementation(
            async () => {
                return 10;
            },
        );
        const decodedLockedMEX = await service.decodeLockedAssetAttributes({
            batchAttributes: [
                {
                    attributes: 'AAAAAgAAAAAAAAACCgAAAAAAAAAfWgA=',
                    identifier: 'LKTOK-1234-01',
                },
            ],
        });
        expect(decodedLockedMEX).toEqual([
            new LockedAssetAttributesModel({
                attributes: 'AAAAAgAAAAAAAAACCgAAAAAAAAAfWgA=',
                identifier: 'LKTOK-1234-01',
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
