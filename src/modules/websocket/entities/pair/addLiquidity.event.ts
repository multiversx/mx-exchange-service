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
import { AddLiquidityEventType } from './pair.types';

export class AddLiquidityEvent extends GenericEvent {
    private decodedTopics: PairEventTopics;

    private firstTokenAmount: FftTokenAmountPairType;
    private secondTokenAmount: FftTokenAmountPairType;
    private liquidityPoolTokenAmount: FftTokenAmountPairType;
    private liquidityPoolSupply: BigNumber;
    private pairReserves: FftTokenAmountPairType[];

    constructor(init?: Partial<GenericEvent>) {
        super(init);
        this.decodedTopics = new PairEventTopics(this.topics);
        const decodedEvent = this.decodeEvent();
        Object.assign(this, decodedEvent);
    }

    toPlainObject(): AddLiquidityEventType {
        return {
            ...super.toJSON(),
            liquidityPoolSupply: this.liquidityPoolSupply.toFixed(),
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

        const eventStruct = this.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(data, eventStruct);
        return decoded.valueOf();
    }

    private getStructure(): StructType {
        return new StructType('SwapEvent', [
            new StructFieldDefinition('caller', '', new AddressType()),
            new StructFieldDefinition(
                'firstTokenAmount',
                '',
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'secondTokenAmount',
                '',
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'liquidityPoolTokenAmount',
                '',
                FftTokenAmountPairStruct(),
            ),
            new StructFieldDefinition(
                'liquidityPoolSupply',
                '',
                new BigUIntType(),
            ),
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
