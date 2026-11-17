import { AbiRegistry, Address } from '@multiversx/sdk-core';
import { readFileSync } from 'fs';
import { abiConfig } from 'src/config';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { XoxnoAggregatorAbiService } from '../services/xoxno-aggregator.abi.service';

const abi = AbiRegistry.create(
    JSON.parse(readFileSync(abiConfig.xoxnoAggregator, 'utf8')),
);

const OWNER = 'erd1ss6u80ruas2phpmr82r42xnkd6rxy40g9jl69frppl4qez9w2jpsqj8x97';

// Nested struct encoding: 32-byte address, u32 fee, bool active
const encodeConfig = (owner: string, fee: number, active: boolean) => {
    const feeBytes = Buffer.alloc(4);
    feeBytes.writeUInt32BE(fee);
    return Buffer.concat([
        Buffer.from(Address.newFromBech32(owner).getPublicKey()),
        feeBytes,
        Buffer.from([active ? 1 : 0]),
    ]);
};

describe('XoxnoAggregatorAbiService', () => {
    const queryContract = jest.fn();
    const service = new XoxnoAggregatorAbiService({
        getXoxnoAggregatorAbi: async () => abi,
        getService: () => ({ queryContract }),
    } as unknown as MXProxyService);

    beforeEach(() => queryContract.mockReset());

    describe('referralConfig', () => {
        it('decodes owner, fee and active flag', async () => {
            queryContract.mockResolvedValue({
                returnCode: 'ok',
                returnMessage: '',
                returnDataParts: [encodeConfig(OWNER, 10, true)],
            });

            const config = await service.referralConfig(4);

            expect(config).toEqual({ owner: OWNER, fee: 10, active: true });
        });

        it('decodes an inactive referral', async () => {
            queryContract.mockResolvedValue({
                returnCode: 'ok',
                returnMessage: '',
                returnDataParts: [encodeConfig(OWNER, 0, false)],
            });

            const config = await service.referralConfig(4);

            expect(config).toEqual({ owner: OWNER, fee: 0, active: false });
        });

        it.each([[[]], [[Buffer.alloc(0)]]])(
            'returns undefined for unregistered IDs (%p)',
            async (returnDataParts) => {
                queryContract.mockResolvedValue({
                    returnCode: 'ok',
                    returnMessage: '',
                    returnDataParts,
                });

                expect(await service.referralConfig(9999)).toBeUndefined();
            },
        );
    });
});
