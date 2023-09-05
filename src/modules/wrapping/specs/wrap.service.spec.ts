import { Test, TestingModule } from '@nestjs/testing';
import { WrapService } from '../services/wrap.service';
import { WrapAbiServiceProvider } from '../mocks/wrap.abi.service.mock';
import { TokenServiceProvider } from 'src/modules/tokens/mocks/token.service.mock';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';

describe('WrapService', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            providers: [
                WrapService,
                WrapAbiServiceProvider,
                TokenServiceProvider,
            ],
        }).compile();
    });

    it('should be defined', () => {
        const service: WrapService = module.get<WrapService>(WrapService);
        expect(service).toBeDefined();
    });

    it('should return wrapped token', async () => {
        const service: WrapService = module.get<WrapService>(WrapService);
        const token = await service.wrappedEgldToken();
        expect(token).toEqual(Tokens('WEGLD-123456'));
    });
});
