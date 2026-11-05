import { Test } from '@nestjs/testing';
import { Address } from '@multiversx/sdk-core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserMetaEsdtComputeService } from '../services/metaEsdt.compute.service';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';
import { PairService } from 'src/modules/pair/services/pair.service';
import { NftToken } from 'src/modules/tokens/models/nftToken.model';

const address = (hex: string) =>
    Address.newFromHex(hex.padStart(64, '0')).toBech32();

const farmA = address('31');
const farmB = address('41');
const pairA = address('12');
const pairB = address('13');

const farms = {
    [farmA]: {
        farmTokenID: 'FARMA-abcdef',
        farmingTokenID: 'LPA-abcdef',
        pairAddress: pairA,
    },
    [farmB]: {
        farmTokenID: 'FARMB-abcdef',
        farmingTokenID: 'LPB-abcdef',
        pairAddress: pairB,
    },
};

const positionValueUSD = {
    [pairA]: '100',
    [pairB]: '200',
};

const farmToken = (collection: string, creator: string) =>
    new NftToken({
        identifier: `${collection}-01`,
        collection,
        creator,
        attributes: 'AAAA',
        balance: '1000000000000000000',
        decimals: 18,
        nonce: 1,
    });

describe('UserMetaEsdtComputeService', () => {
    let service: UserMetaEsdtComputeService;
    let pairContractAddress: jest.Mock;

    beforeEach(async () => {
        pairContractAddress = jest.fn(
            async (farm: string) => farms[farm].pairAddress,
        );

        const farmAbi = {
            getFarmAddressByFarmTokenID: jest.fn(async (tokenID: string) =>
                Object.keys(farms).find(
                    (farm) => farms[farm].farmTokenID === tokenID,
                ),
            ),
            useAbi: jest.fn(() => ({
                farmingTokenID: async (farm: string) =>
                    farms[farm].farmingTokenID,
                pairContractAddress,
            })),
        };

        const farmFactory = {
            useService: jest.fn((farm: string) => ({
                decodeFarmTokenAttributes: (identifier: string) => ({
                    identifier,
                    farmAddress: farm,
                }),
            })),
        };

        const pairService = {
            getLiquidityPositionUSD: jest.fn(
                async (pairAddress: string) => positionValueUSD[pairAddress],
            ),
        };

        const module = await Test.createTestingModule({
            providers: [
                UserMetaEsdtComputeService,
                { provide: FarmAbiFactory, useValue: farmAbi },
                { provide: FarmFactoryService, useValue: farmFactory },
                { provide: PairService, useValue: pairService },
                {
                    provide: WINSTON_MODULE_NEST_PROVIDER,
                    useValue: { error: jest.fn() },
                },
            ],
        })
            .useMocker(() => ({}))
            .compile();

        service = module.get(UserMetaEsdtComputeService);
    });

    describe('farmTokenUSD', () => {
        it('values a position with the farm that issued its collection', async () => {
            const result = await service.farmTokenUSD(
                farmToken('FARMA-abcdef', farmB),
            );

            expect(result.pairAddress).toEqual(pairA);
            expect(result.valueUSD).toEqual('100');
            expect(result.decodedAttributes).toEqual(
                expect.objectContaining({ farmAddress: farmA }),
            );
        });

        it('keeps valuing a position with its own farm after a mismatched creator', async () => {
            await service.farmTokenUSD(farmToken('FARMA-abcdef', farmB));

            const result = await service.farmTokenUSD(
                farmToken('FARMA-abcdef', farmA),
            );

            expect(result.pairAddress).toEqual(pairA);
            expect(result.valueUSD).toEqual('100');
        });

        it('values a position once its pair lookup recovers', async () => {
            pairContractAddress.mockResolvedValueOnce(undefined);
            await service.farmTokenUSD(farmToken('FARMA-abcdef', farmA));

            const result = await service.farmTokenUSD(
                farmToken('FARMA-abcdef', farmA),
            );

            expect(result.pairAddress).toEqual(pairA);
            expect(result.valueUSD).toEqual('100');
        });

        it('returns decoded attributes without a valuation when USD is not requested', async () => {
            pairContractAddress.mockRejectedValue(new Error('unavailable'));

            const result = await service.farmTokenUSD(
                farmToken('FARMA-abcdef', farmA),
                false,
            );

            expect(result.decodedAttributes).toEqual(
                expect.objectContaining({ farmAddress: farmA }),
            );
            expect(result.valueUSD).toBeUndefined();
        });

        it('returns no valuation for a collection no farm issued', async () => {
            const result = await service.farmTokenUSD(
                farmToken('OTHER-abcdef', farmA),
            );

            expect(result).toBeUndefined();
        });
    });
});
