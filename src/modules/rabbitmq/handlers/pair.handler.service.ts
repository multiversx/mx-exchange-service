import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

@Injectable()
export class PairHandler {
    constructor(
        private readonly pairGetter: PairGetterService,
        private readonly pairSetter: PairSetterService,
        private readonly routerAbi: RouterAbiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async updatePairReserves(
        pairAddress: string,
        firstTokenReserves: string,
        secondTokenReserves: string,
        totalSupply?: string,
    ): Promise<void> {
        const promises = [
            this.pairSetter.setFirstTokenReserve(
                pairAddress,
                firstTokenReserves,
            ),
            this.pairSetter.setSecondTokenReserve(
                pairAddress,
                secondTokenReserves,
            ),
        ];
        if (totalSupply) {
            promises.push(
                this.pairSetter.setTotalSupply(pairAddress, totalSupply),
            );
        }
        const cachedKeys = await Promise.all(promises);
        await this.deleteCacheKeys(cachedKeys);
    }

    async getTokenTotalLockedValue(tokenID: string): Promise<string> {
        const pairs = await this.routerAbi.pairsMetadata();
        const promises = [];
        for (const pair of pairs) {
            switch (tokenID) {
                case pair.firstTokenID:
                    promises.push(
                        this.pairGetter.getFirstTokenReserve(pair.address),
                    );
                    break;
                case pair.secondTokenID:
                    promises.push(
                        this.pairGetter.getSecondTokenReserve(pair.address),
                    );
                    break;
            }
        }
        const allLockedValues = await Promise.all(promises);
        let newLockedValue = new BigNumber(0);
        allLockedValues.forEach((value) => {
            newLockedValue = newLockedValue.plus(value);
        });

        return newLockedValue.toFixed();
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
