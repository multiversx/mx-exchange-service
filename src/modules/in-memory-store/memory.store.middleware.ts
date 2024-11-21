import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction } from 'express';
import {
    DocumentNode,
    FieldNode,
    OperationDefinitionNode,
    parse,
    SelectionNode,
} from 'graphql';
import { PairInMemoryStoreService } from '../pair/services/pair.in.memory.store.service';

type Field = {
    name: string;
    subfields?: Field[];
};

@Injectable()
export class MemoryStoreMiddleware implements NestMiddleware {
    private cacheHitsCounter = {};

    constructor(private readonly pairMemoryStore: PairInMemoryStoreService) {}

    async use(req: Request, res: any, next: NextFunction) {
        if (!req.body || !req.body['query']) {
            return next();
        }

        // if (!this.pairMemoryStore.isReady()) {
        //     return next();
        // }

        const pairQueries = ['pairs', 'filteredPairs', 'pairsFromStore'];

        // Parse the query
        const parsedQuery: DocumentNode = parse(req.body['query']);

        // Validate the query against the schema
        // const errors: GraphQLError[] = Array.from(
        //     validate(this.schema, parsedQuery),
        // );

        // if (errors.length > 0) {
        //     // Return validation errors
        //     return res.status(400).json({
        //         errors: errors.map((err) => err.message),
        //     });
        // }

        let pairsSelection: FieldNode;

        const isOnlyPairsQuery = parsedQuery.definitions.every((definition) => {
            if (definition.kind === 'OperationDefinition') {
                const operation = definition as OperationDefinitionNode;
                return operation.selectionSet.selections.every((selection) => {
                    if (
                        selection.kind === 'Field' &&
                        pairQueries.includes(selection.name.value)
                    ) {
                        pairsSelection = selection;
                        return true;
                    }
                    return false;
                });
            }
            return false;
        });

        if (!isOnlyPairsQuery) {
            return next();
        }

        const requestedFields = this.getRequestedFields(
            pairsSelection.selectionSet?.selections || [],
        );

        // for (const field of requestedFields) {
        //     console.log(JSON.stringify(field));
        // }
        // console.log(requestedFields);

        const testPair = this.pairMemoryStore.getData()[0];
        const pairs = this.pairMemoryStore.getData();

        // Return pairs result from memory store
        return res.status(200).json({
            data: {
                // pairs: [],

                pairs: [
                    this.extractFields(testPair, requestedFields, 'PairModel'),
                ],

                // pairs: pairsFromMemory.map((pair) =>
                //     this.extractFields(pair, requestedFields, 'PairModel'),
                // ),
                // .filter((pair) => pair.liquidityPoolToken !== undefined),

                // pairs: this.pairMemoryStore
                //     .getData()
                //     .filter((pair) => pair.liquidityPoolToken !== undefined),
            },
        });
    }

    private getRequestedFields(
        selectionNodes: readonly SelectionNode[],
    ): Field[] {
        const fields: Field[] = [];

        selectionNodes.forEach((node) => {
            if (node.kind === 'Field') {
                // fields.push(node.name.value);

                // Recursively extract subfields if they exist
                if (node.selectionSet) {
                    const subfields = this.getRequestedFields(
                        node.selectionSet.selections,
                    );
                    // fields.push(
                    //     ...subfields.map(
                    //         (subfield) => `${node.name.value}.${subfield}`,
                    //     ),
                    // );
                    fields.push({
                        name: node.name.value,
                        subfields: subfields,
                    });
                } else {
                    fields.push({
                        name: node.name.value,
                    });
                }
            }
        });

        return fields;
    }

    private extractFields(data: any, fields: Field[], typeName: string): any {
        const result: Record<string, any> = {};

        for (const field of fields) {
            if (field.name === '__typename') {
                result[field.name] = typeName;
                continue;
            }

            const fieldData = data?.[field.name];
            const subfields = field.subfields || [];

            if (subfields.length === 0) {
                result[field.name] = fieldData ?? null;
                continue;
            }

            if (Array.isArray(fieldData)) {
                result[field.name] = fieldData.map((item) =>
                    this.extractFields(
                        item || {},
                        subfields,
                        this.getNestedTypeName(typeName, field.name),
                    ),
                );
            } else {
                result[field.name] =
                    fieldData !== undefined
                        ? this.extractFields(
                              fieldData,
                              subfields,
                              this.getNestedTypeName(typeName, field.name),
                          )
                        : null;
            }
        }

        return result;
    }

    // private extractFieldsOld(
    //     data: any,
    //     fields: Field[],
    //     typeName: string,
    // ): any {
    //     const result: any = {};

    //     for (const field of fields) {
    //         if (field.name === '__typename') {
    //             result[field.name] = typeName;
    //             continue;
    //         }

    //         if (!field.subfields || field.subfields.length === 0) {
    //             result[field.name] = data[field.name] ?? null;
    //             continue;
    //         }

    //         if (Array.isArray(data[field.name])) {
    //             result[field.name] = [];
    //             for (const fieldValue of data[field.name]) {
    //                 const currentField = {};

    //                 result[field.name].push({
    //                     ...currentField,
    //                     ...this.extractFields(
    //                         fieldValue || {},
    //                         field.subfields || [],
    //                         this.getNestedTypeName(typeName, field.name),
    //                     ),
    //                 });
    //             }

    //             continue;
    //         }

    //         result[field.name] =
    //             data[field.name] !== undefined
    //                 ? {
    //                       ...result[field.name],
    //                       ...this.extractFields(
    //                           data[field.name] || {},
    //                           field.subfields || [],
    //                           this.getNestedTypeName(typeName, field.name),
    //                       ),
    //                   }
    //                 : null;
    //     }

    //     return result;
    // }

    private getNestedTypeName(
        parentTypeName: string,
        fieldName: string,
    ): string {
        const typeMapping: Record<string, Record<string, string>> = {
            PairModel: {
                firstToken: 'EsdtToken',
                secondToken: 'EsdtToken',
                liquidityPoolToken: 'EsdtToken',
                info: 'PairInfoModel',
                lockedTokensInfo: 'LockedTokensInfo',
                feesCollector: 'FeesCollectorModel',
                compoundedAPR: 'PairCompoundedAPRModel',
                rewardTokens: 'PairRewardTokensModel',
                feeDestinations: 'FeeDestination',
            },
            EsdtToken: {
                assets: 'AssetsModel',
                roles: 'RolesModel',
            },
            AssetsModel: {
                social: 'SocialModel',
            },
            PairRewardTokensModel: {
                poolRewards: 'EsdtToken',
                farmReward: 'NftCollection',
                dualFarmReward: 'EsdtToken',
            },
            LockedTokensInfo: {
                lockingSC: 'SimpleLockModel',
            },
            SimpleLockModel: {
                lockedToken: 'NftCollection',
            },
        };

        return typeMapping[parentTypeName]?.[fieldName] || 'UnknownType';
    }
}
