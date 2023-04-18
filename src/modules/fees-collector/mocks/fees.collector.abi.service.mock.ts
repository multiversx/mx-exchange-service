import { FeesCollectorAbiService } from '../services/fees-collector.abi.service';

export class FeesCollectorAbiServiceMock {}

export const FeesCollectorAbiServiceProvider = {
    provide: FeesCollectorAbiService,
    useClass: FeesCollectorAbiServiceMock,
};
