import {
    Address,
    AddressType,
    BigUIntType,
    BinaryCodec,
    ListType,
    StructFieldDefinition,
    StructType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import BigNumber from 'bignumber.js';
import { FftTokenAmountPairStruct } from 'src/utils/common.structures';
import { GenericEvent } from '../generic.event';
import { FftTokenAmountPairType } from '../generic.types';
import { PairEventTopics } from './pair.event.topics';
import { SwapEventType } from './pair.types';

export class SwapEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    private tokenAmountIn: FftTokenAmountPairType;
    private tokenAmountOut: FftTokenAmountPairType;
    private feeAmount: BigNumber;
    private pairReserves: FftTokenAmountPairType[];

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairEventTopics(this.topics);
        const decodedEvent = this.decodeEvent();

        Object.assign(this, decodedEvent);
    }

    toPlainObject(): SwapEventType {
        return {
            ...super.toJSON(),
            feeAmount: this.feeAmount.toFixed(),
            pairReserves: this.pairReserves.map(reserve => {
                return {
                    tokenID: reserve.tokenID.toString(),
                    amount: reserve.amount.toFixed(),
                };
            }),
        };
    }

    getTopics() {
        return this.decodedTopics.toPlainObject();
    }

    private decodeEvent() {
        const data = Buffer.from(this.data, 'base64');
        const codec = new BinaryCodec();

        const swapEventStructure = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(
            data,
            swapEventStructure,
        );

        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('SwapEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'tokenAmountIn',
                '',
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'tokenAmountOut',
                '',
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition('feeAmount', '', new BigUIntType()),
            new StructFieldDefinition(
                'pairReserves',
                '',
                new ListType(FftTokenAmountPairStruct()),
            ),
            new StructFieldDefinition('block', '', new U64Type()),
            new StructFieldDefinition('epoch', '', new U64Type()),
            new StructFieldDefinition('timestamp', '', new U64Type()),
        ]);
    }
}
