import {
    ArgumentNode,
    FieldNode,
    Kind,
    SelectionNode,
    ValueNode,
} from 'graphql';
import { QueryField } from '../entities/query.field.type';

export function extractQueryFields(
    selectionNodes: readonly SelectionNode[],
): QueryField[] {
    const fields: QueryField[] = [];

    selectionNodes
        .filter((node): node is FieldNode => node.kind === Kind.FIELD)
        .forEach((node) => {
            if (node.selectionSet) {
                const subfields = extractQueryFields(
                    node.selectionSet.selections,
                );

                fields.push({
                    name: node.name.value,
                    subfields: subfields,
                });
            } else {
                fields.push({
                    name: node.name.value,
                });
            }
        });

    return fields;
}

export function extractFilteredQueryEdgeNodes(
    selectionNodes: readonly SelectionNode[],
): readonly SelectionNode[] {
    for (const node of selectionNodes) {
        if (node.kind !== Kind.FIELD || node.name.value !== 'edges') {
            continue;
        }

        const edgesNode = node.selectionSet?.selections.find(
            (selection) =>
                selection.kind === Kind.FIELD &&
                selection.name.value === 'node',
        );

        if (edgesNode) {
            return (edgesNode as FieldNode).selectionSet.selections;
        }
    }

    return undefined;
}

export function updateFilteredQueryEdgeNodes(
    existingNodes: readonly SelectionNode[],
    newNodes: readonly SelectionNode[],
): readonly SelectionNode[] {
    for (const node of existingNodes) {
        if (node.kind !== Kind.FIELD || node.name.value !== 'edges') {
            continue;
        }

        const edgesNode = node.selectionSet?.selections.find(
            (selection) =>
                selection.kind === Kind.FIELD &&
                selection.name.value === 'node',
        );

        if (edgesNode) {
            (edgesNode as FieldNode).selectionSet.selections = newNodes;
        }
    }
    return existingNodes;
}

export function parseArguments(
    argumentsArray: ReadonlyArray<ArgumentNode>,
    variables: Record<string, any>,
): Record<string, any> {
    const args: Record<string, any> = {};
    for (const argNode of argumentsArray) {
        const argName = argNode.name.value;
        const argValue = resolveValueNode(argNode.value, variables);
        args[argName] = argValue;
    }
    return args;
}

export function createModelFromFields(
    data: any,
    fields: QueryField[],
    typeName: string,
    typeMapping: Record<string, Record<string, string>>,
): any {
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
                createModelFromFields(
                    item || {},
                    subfields,
                    typeMapping[typeName]?.[field.name] || 'UnknownType',
                    typeMapping,
                ),
            );
        } else {
            result[field.name] =
                fieldData !== undefined
                    ? createModelFromFields(
                          fieldData,
                          subfields,
                          typeMapping[typeName]?.[field.name] || 'UnknownType',
                          typeMapping,
                      )
                    : null;
        }
    }

    return result;
}

function resolveValueNode(
    valueNode: ValueNode,
    variables: Record<string, any>,
): any {
    switch (valueNode.kind) {
        case Kind.INT:
            return parseInt(valueNode.value, 10);
        case Kind.FLOAT:
            return parseFloat(valueNode.value);
        case Kind.STRING:
        case Kind.BOOLEAN:
        case Kind.ENUM:
            return valueNode.value;
        case Kind.LIST:
            return valueNode.values.map((value) =>
                resolveValueNode(value, variables),
            );
        case Kind.OBJECT:
            const obj: Record<string, any> = {};
            for (const field of valueNode.fields) {
                obj[field.name.value] = resolveValueNode(
                    field.value,
                    variables,
                );
            }
            return obj;
        case Kind.VARIABLE:
            return variables[valueNode.name.value];
        case Kind.NULL:
            return null;
    }
}
