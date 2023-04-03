import { Test, TestingModule } from '@nestjs/testing';
import { EscrowAbiService } from '../services/escrow.abi.service';
import { MXProxyServiceProvider } from 'src/services/multiversx-communication/mx.proxy.service.mock';
import { MXGatewayServiceProvider } from 'src/services/multiversx-communication/mx.gateway.service.mock';
import { SCPermissions } from '../models/escrow.model';
import { MXGatewayService } from 'src/services/multiversx-communication/mx.gateway.service';
import { Address, ReturnCode, U32Value } from '@multiversx/sdk-core/out';
import { CommonAppModule } from 'src/common.app.module';

describe('EscrowAbiService', () => {
    let service: EscrowAbiService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [CommonAppModule],
            providers: [
                EscrowAbiService,
                MXProxyServiceProvider,
                MXGatewayServiceProvider,
            ],
        }).compile();

        service = module.get<EscrowAbiService>(EscrowAbiService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should get none address permissions', async () => {
        jest.spyOn(service, 'getGenericData').mockResolvedValue({
            returnCode: ReturnCode.Ok,
            returnMessage: '',
            values: [],
            firstValue: new U32Value(0),
        });

        const address = Address.Zero();
        const permissions = await service.getAddressPermission(
            address.bech32(),
        );
        expect(permissions).toEqual([SCPermissions.NONE]);
    });

    it('should get admin address permissions', async () => {
        jest.spyOn(service, 'getGenericData').mockResolvedValue({
            returnCode: ReturnCode.Ok,
            returnMessage: '',
            values: [],
            firstValue: new U32Value(2),
        });

        const address = Address.Zero();
        const permissions = await service.getAddressPermission(
            address.bech32(),
        );
        expect(permissions).toEqual([SCPermissions.ADMIN]);
    });

    it('should get admin and owner address permissions', async () => {
        jest.spyOn(service, 'getGenericData').mockResolvedValue({
            returnCode: ReturnCode.Ok,
            returnMessage: '',
            values: [],
            firstValue: new U32Value(3),
        });

        const address = Address.Zero();
        const permissions = await service.getAddressPermission(
            address.bech32(),
        );
        expect(permissions).toEqual([SCPermissions.OWNER, SCPermissions.ADMIN]);
    });
});
