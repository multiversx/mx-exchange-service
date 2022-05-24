import {
    Address,
    Balance,
    BytesValue,
    GasLimit,
    Interaction,
} from '@elrondnetwork/erdjs/out';
import { BigUIntValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { constantsConfig, elrondConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import {
    EsdtLocalRoleEnumType,
    SetLocalRoleOwnerArgs,
} from '../models/router.args';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class TransactionRouterService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly routerGetterService: RouterGetterService,
        private readonly pairGetterService: PairGetterService,
    ) {}

    async createPair(
        sender: string,
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<TransactionModel> {
        const checkPairExists = await this.checkPairExists(
            firstTokenID,
            secondTokenID,
        );

        if (checkPairExists) {
            throw new Error('Pair already exists');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();

        const createPairInteraction: Interaction = contract.methods.createPair([
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
            BytesValue.fromHex(Address.fromString(sender).hex()),
        ]);

        const transaction = createPairInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.createPair));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async upgradePair(
        firstTokenID: string,
        secondTokenID: string,
        fees: number[],
    ): Promise<TransactionModel> {
        const checkPairExists = await this.checkPairExists(
            firstTokenID,
            secondTokenID,
        );

        if (!checkPairExists) {
            throw new Error('Pair does not exist');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();

        const transactionArgs: any[] = [
            BytesValue.fromUTF8(firstTokenID),
            BytesValue.fromUTF8(secondTokenID),
        ];

        for (const fee of fees) {
            transactionArgs.push(new BigUIntValue(new BigNumber(fee)));
        }

        const upgradePairInteraction: Interaction = contract.methods.upgradePair(
            transactionArgs,
        );

        const transaction = upgradePairInteraction.buildTransaction();
        // todo: test gasConfig.router.upgradePair
        transaction.setGasLimit(new GasLimit(gasConfig.router.upgradePair));
        return new TransactionModel({
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        });
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const lpTokeID = await this.pairGetterService.getLpTokenID(pairAddress);
        if (lpTokeID !== 'undefined') {
            throw new Error('LP Token already issued');
        }

        const contract = await this.elrondProxy.getRouterSmartContract();
        const issueLPTokenInteraction: Interaction = contract.methods.issueLpToken(
            [
                BytesValue.fromHex(new Address(pairAddress).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ],
        );

        const transaction = issueLPTokenInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.issueToken));
        transaction.setValue(Balance.egld(constantsConfig.ISSUE_LP_TOKEN_COST));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const setLocalRolesInteraction: Interaction = contract.methods.setLocalRoles(
            [BytesValue.fromHex(new Address(pairAddress).hex())],
        );

        const transaction = setLocalRolesInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.setLocalRoles));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setLocalRolesOwner(
        args: SetLocalRoleOwnerArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();

        const transactionArgs: any[] = [
            BytesValue.fromUTF8(args.tokenID),
            BytesValue.fromHex(new Address(args.address).hex()),
        ];

        for (const role of args.roles) {
            transactionArgs.push(
                new BigUIntValue(
                    new BigNumber(
                        EsdtLocalRoleEnumType.getVariantByDiscriminant(
                            role,
                        ).discriminant,
                    ),
                ),
            );
        }

        const setLocalRolesOwnerInteraction: Interaction = contract.methods.setLocalRolesOwner(
            transactionArgs,
        );

        const transaction = setLocalRolesOwnerInteraction.buildTransaction();
        // todo: test gasConfig.router.setLocalRolesOwner
        transaction.setGasLimit(
            new GasLimit(gasConfig.router.setLocalRolesOwner),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
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
        transaction.setGasLimit(new GasLimit(gasConfig.router.setState));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
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
        transaction.setGasLimit(new GasLimit(gasConfig.router.setFee));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    private async checkPairExists(
        firstTokenID: string,
        secondTokenID: string,
    ): Promise<boolean> {
        const pairsMetadata = await this.routerGetterService.getPairsMetadata();
        for (const pair of pairsMetadata) {
            if (
                (pair.firstTokenID === firstTokenID &&
                    pair.secondTokenID === secondTokenID) ||
                (pair.firstTokenID === secondTokenID &&
                    pair.secondTokenID === firstTokenID)
            ) {
                return true;
            }
        }
        return false;
    }

    async setPairCreationEnabled(enabled: boolean): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [new BigUIntValue(new BigNumber(enabled ? 1 : 0))];
        const setFeeInteraction: Interaction = contract.methods.setPairCreationEnabled(
            args,
        );
        const transaction = setFeeInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.router.setFee));
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async clearPairTemporaryOwnerStorage(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const setFeeInteraction: Interaction = contract.methods.clearPairTemporaryOwnerStorage(
            [],
        );
        const transaction = setFeeInteraction.buildTransaction();
        // todo: test gasConfig.router.clearPairTemporaryOwnerStorage
        transaction.setGasLimit(
            new GasLimit(gasConfig.router.clearPairTemporaryOwnerStorage),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setTemporaryOwnerPeriod(
        periodBlocks: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [new BigUIntValue(new BigNumber(periodBlocks))];
        const setFeeInteraction: Interaction = contract.methods.setTemporaryOwnerPeriod(
            args,
        );
        const transaction = setFeeInteraction.buildTransaction();
        // todo: test gasConfig.router.clearPairTemporaryOwnerStorage
        transaction.setGasLimit(
            new GasLimit(gasConfig.router.setTemporaryOwnerPeriod),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async setPairTemplateAddress(address: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [BytesValue.fromHex(Address.fromString(address).hex())];
        const setFeeInteraction: Interaction = contract.methods.setPairTemplateAddress(
            args,
        );
        const transaction = setFeeInteraction.buildTransaction();
        // todo: test gasConfig.router.setPairTemplateAddress
        transaction.setGasLimit(
            new GasLimit(gasConfig.router.setPairTemplateAddress),
        );
        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }
}
