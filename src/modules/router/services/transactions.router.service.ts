import {
    Address,
    BytesValue,
    GasLimit,
    Interaction,
} from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { RouterService } from './router.service';

@Injectable()
export class TransactionRouterService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly routerService: RouterService,
        private readonly pairGetterService: PairGetterService,
    ) {}

    async createPair(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const pairCount = await this.routerService.getPairCount();
        const pairs = await this.routerService.getAllPairs(0, pairCount, {
            address: null,
            firstTokenID: firstTokenID,
            secondTokenID: secondTokenID,
            issuedLpToken: true,
        });

        if (pairs.length > 0) {
            throw new Error('Pair already exists');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();

        const createPairInteraction: Interaction = contract.methods.createPair([
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ]);

        const transaction = createPairInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.createPair));
        return transaction.toPlainObject();
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const lpTokeID = await this.pairGetterService.getLpTokenID(pairAddress);
        if (lpTokeID !== undefined) {
            throw new Error('LP Token already issued');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        const issueLPTokenInteraction: Interaction = contract.methods.issueLPToken(
            [
                BytesValue.fromHex(new Address(pairAddress).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ],
        );

        const transaction = issueLPTokenInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.issueToken));
        return transaction.toPlainObject();
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const setLocalRolesInteraction: Interaction = contract.methods.setLocalRoles(
            [BytesValue.fromHex(new Address(pairAddress).hex())],
        );

        const transaction = setLocalRolesInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.setLocalRoles));
        return transaction.toPlainObject();
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [BytesValue.fromHex(new Address(address).hex())];

        const stateInteraction: Interaction = enable
            ? contract.methods.resume(args)
            : contract.methods.pause(args);

        const transaction = stateInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.setState));
        return transaction.toPlainObject();
    }

    async setFee(
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [
            BytesValue.fromHex(new Address(pairAddress).hex()),
            BytesValue.fromHex(new Address(feeToAddress).hex()),
            BytesValue.fromUTF8(feeTokenID),
        ];

        const setFeeInteraction: Interaction = enable
            ? contract.methods.setFeeOn([args])
            : contract.methods.setFeeOff([args]);

        const transaction = setFeeInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.setFee));
        return transaction.toPlainObject();
    }
}
