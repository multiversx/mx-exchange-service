import {
    BigUIntType,
    FieldDefinition,
    StructType,
    TokenIdentifierType,
    U64Type,
} from '@elrondnetwork/erdjs/out';
import { Field } from '@nestjs/graphql';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { GenericToken } from 'src/models/genericToken.model';
import { PhaseModel } from 'src/modules/price-discovery/models/price.discovery.model';
import { PriceDiscoveryEvent } from './price.discovery.event';
import { DepositEventType } from './price.discovery.types';

export class DepositEvent extends PriceDiscoveryEvent {
    @Field(() => GenericToken)
    token: GenericToken;
    @Field(() => GenericToken)
    redeemToken: GenericToken;
    @Field(() => String)
    launchedTokenAmount: BigNumber;
    @Field(() => String)
    acceptedTokenAmount: BigNumber;
    @Field(() => String)
    launchedTokenPrice: BigNumber;
    @Field(() => PhaseModel)
    currentPhase: PhaseModel;

    constructor(init?: Partial<PriceDiscoveryEvent>) {
        super(init);

        const decodedEvent = this.decodeEvent();

        Object.assign(this, decodedEvent);

        this.token = new GenericToken({
            tokenID: decodedEvent.tokenInID.toString(),
            amount: decodedEvent.tokenInAmount,
        });
        this.redeemToken = new GenericToken({
            tokenID: decodedEvent.redeemTokenID.toString(),
            nonce: decodedEvent.redeemTokenNonce.toNumber(),
            amount: decodedEvent.redeemTokenAmount,
        });

        const penalty = decodedEvent.penaltyPercent.toFixed();
        const penaltyPercent = penalty
            ? new BigNumber(penalty).dividedBy(
                  constantsConfig.MAX_PERCENTAGE_PRICE_DISCOVERY,
              )
            : new BigNumber(0);
        this.currentPhase = new PhaseModel({
            name: decodedEvent.currentPhase.name,
            penaltyPercent: penaltyPercent.toNumber(),
        });
    }

    toJSON(): DepositEventType {
        return {
            ...super.toJSON(),
            tokenIn: this.token.toJSON(),
            redeemToken: this.redeemToken.toJSON(),
            launchedTokenAmount: this.launchedTokenAmount.toFixed(),
            acceptedTokenAmount: this.acceptedTokenAmount.toFixed(),
            launchedTokenPrice: this.launchedTokenPrice.toFixed(),
            currentPhase: this.currentPhase.toJSON(),
        };
    }

    protected getStructure(): StructType {
        return new StructType('DepositEvent', [
            new FieldDefinition('tokenInID', '', new TokenIdentifierType()),
            new FieldDefinition('tokenInAmount', '', new BigUIntType()),
            new FieldDefinition('redeemTokenID', '', new TokenIdentifierType()),
            new FieldDefinition('redeemTokenNonce', '', new U64Type()),
            new FieldDefinition('redeemTokenAmount', '', new BigUIntType()),
            new FieldDefinition('launchedTokenAmount', '', new BigUIntType()),
            new FieldDefinition('acceptedTokenAmount', '', new BigUIntType()),
            new FieldDefinition('currentPrice', '', new BigUIntType()),
            new FieldDefinition('currentPhase', '', PhaseModel.getEnum()),
        ]);
    }
}
