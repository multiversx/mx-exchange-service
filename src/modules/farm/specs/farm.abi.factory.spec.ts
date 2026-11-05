import { Test } from '@nestjs/testing';
import { FarmAbiFactory } from '../farm.abi.factory';
import { FarmAbiServiceV1_2 } from '../v1.2/services/farm.v1.2.abi.service';
import { FarmAbiServiceV1_3 } from '../v1.3/services/farm.v1.3.abi.service';
import { FarmAbiServiceV2 } from '../v2/services/farm.v2.abi.service';
import { CacheService } from 'src/services/caching/cache.service';
import { farmsAddresses } from 'src/utils/farm.utils';

describe('FarmAbiFactory', () => {
    const farms = farmsAddresses();
    const firstFarm = farms[0];
    const lastFarm = farms[farms.length - 1];

    let factory: FarmAbiFactory;
    let failingFarms: Set<string>;

    beforeEach(async () => {
        failingFarms = new Set();
        const cached = new Map<string, unknown>();

        const farmAbi = {
            farmTokenID: jest.fn(async (farm: string) => {
                if (failingFarms.has(farm)) {
                    throw new Error('query failed');
                }
                return `FARM${farms.indexOf(farm)}-abcdef`;
            }),
        };

        const module = await Test.createTestingModule({
            providers: [
                FarmAbiFactory,
                { provide: FarmAbiServiceV1_2, useValue: farmAbi },
                { provide: FarmAbiServiceV1_3, useValue: farmAbi },
                { provide: FarmAbiServiceV2, useValue: farmAbi },
                {
                    provide: CacheService,
                    useValue: {
                        get: async (key: string) => cached.get(key),
                        set: async (key: string, value: unknown) => {
                            cached.set(key, value);
                        },
                    },
                },
            ],
        }).compile();

        factory = module.get(FarmAbiFactory);
    });

    describe('getFarmAddressByFarmTokenID', () => {
        const lastFarmTokenID = () => `FARM${farms.length - 1}-abcdef`;

        it('finds the farm that issued a farm token', async () => {
            const farmAddress =
                await factory.getFarmAddressByFarmTokenID(lastFarmTokenID());

            expect(farmAddress).toEqual(lastFarm);
        });

        it('finds a farm listed after one whose query fails', async () => {
            failingFarms.add(firstFarm);

            const farmAddress =
                await factory.getFarmAddressByFarmTokenID(lastFarmTokenID());

            expect(farmAddress).toEqual(lastFarm);
        });

        it('returns no farm for a token no farm issued', async () => {
            const farmAddress =
                await factory.getFarmAddressByFarmTokenID('OTHER-abcdef');

            expect(farmAddress).toBeUndefined();
        });

        it('reports the failure when no other farm matches', async () => {
            failingFarms.add(lastFarm);

            await expect(
                factory.getFarmAddressByFarmTokenID(lastFarmTokenID()),
            ).rejects.toThrow('query failed');
        });
    });
});
