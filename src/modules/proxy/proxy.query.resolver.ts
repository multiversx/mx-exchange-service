import { Query, Resolver } from '@nestjs/graphql';
import { ProxyModel } from './models/proxy.model';
import { scAddress } from 'src/config';

@Resolver()
export class ProxyQueryResolver {
    @Query(() => [ProxyModel])
    async proxy(): Promise<ProxyModel[]> {
        return [
            new ProxyModel({
                address: scAddress.proxyDexAddress.v1,
                version: 'v1',
            }),
            new ProxyModel({
                address: scAddress.proxyDexAddress.v2,
                version: 'v2',
            }),
        ];
    }
}
