import { FarmGetterServiceMock } from './farm.getter.service.mock';

export class FarmGetterServiceMockV1_3 extends FarmGetterServiceMock {}

export const FarmGetterServiceProviderV1_3 = {
    provide: 'FarmGetterServiceV1_3',
    useClass: FarmGetterServiceMockV1_3,
};
