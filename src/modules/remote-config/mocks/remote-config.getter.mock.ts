import { Address } from '@multiversx/sdk-core';
import { RemoteConfigGetterService } from '../remote-config.getter.service';

export class RemoteConfigGetterServiceMock {
    async getMaintenanceFlagValue(): Promise<boolean> {
        return false;
    }

    async getMultiSwapStatus(): Promise<boolean> {
        return true;
    }

    async getStakingAddresses(): Promise<string[]> {
        return [Address.Zero().bech32()];
    }

    async getStakingProxyAddresses(): Promise<string[]> {
        return [Address.Zero().bech32(), Address.Zero().bech32()];
    }

    async getAnalyticsAWSTimestreamWriteFlagValue(): Promise<boolean> {
        return true;
    }

    async getAnalyticsDataApiWriteFlagValue(): Promise<boolean> {
        return false;
    }
}

export const RemoteConfigGetterServiceProvider = {
    provide: RemoteConfigGetterService,
    useClass: RemoteConfigGetterServiceMock,
};
