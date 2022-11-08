import { Query, Resolver } from '@nestjs/graphql';
import { ProxyModel } from './models/proxy.model';
import { ProxyService } from './services/proxy.service';

@Resolver()
export class ProxyQueryResolver {
    constructor(private readonly proxyService: ProxyService) {}

    @Query(() => [ProxyModel])
    async proxy(): Promise<ProxyModel[]> {
        return this.proxyService.getProxyInfo();
    }
}
