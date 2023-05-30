import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';

@Injectable()
export class PairHandler {
    constructor(
        private readonly pairAbi: PairAbiService,
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
        totalSupply = totalSupply
            ? totalSupply
            : await this.pairAbi.totalSupply(pairAddress);
        promises.push(
            this.pairSetter.setPairInfoMetadata(
                pairAddress,
                new PairInfoModel({
                    reserves0: firstTokenReserves,
                    reserves1: secondTokenReserves,
                    totalSupply,
                }),
            ),
        );
        const cachedKeys = await Promise.all(promises);
        await this.deleteCacheKeys(cachedKeys);
    }

    async getTokenTotalLockedValue(tokenID: string): Promise<string> {
        const pairs = await this.routerAbi.pairsMetadata();
        const promises = [];
        for (const pair of pairs) {
            switch (tokenID) {
                case pair.firstTokenID:
                    promises.push(this.pairAbi.firstTokenReserve(pair.address));
                    break;
                case pair.secondTokenID:
                    promises.push(
                        this.pairAbi.secondTokenReserve(pair.address),
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
