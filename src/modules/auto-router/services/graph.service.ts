import { Injectable } from '@nestjs/common';

@Injectable()
export class GraphService {
    adjList: Map<string, string[]>;

    constructor() {
        this.adjList = new Map<string, string[]>();
    }

    addEdge(u: string, v: string) {
        const node = this.adjList.get(u);
        if (node === undefined) {
            this.adjList.set(u, [v]);
        } else {
            node.push(v);
        }
    }

    private getAllPathsUtil(
        node: string,
        destination: string,
        isVisited: Map<string, boolean>,
        localPathList: Array<string>,
        paths: Array<string[]>,
    ) {
        if (node === destination) {
            paths.push([...localPathList]);
            return;
        }

        isVisited.set(node, true);
        const adjNodes = this.adjList.get(node);

        if (!adjNodes) {
            return;
        }

        for (const adjNode of adjNodes) {
            if (isVisited.get(adjNode) === false) {
                localPathList.push(adjNode);
                this.getAllPathsUtil(
                    adjNode,
                    destination,
                    isVisited,
                    localPathList,
                    paths,
                );
                localPathList.splice(localPathList.indexOf(adjNode), 1);
            }
        }
        isVisited.set(node, false);
    }

    getAllPaths(source: string, destination: string) {
        const isVisited = new Map<string, boolean>();
        const nodes = this.adjList.keys();
        const paths = new Array<string[]>();

        for (const v of nodes) {
            isVisited.set(v, false);
        }

        const pathList = new Array<string>();
        pathList.push(source);

        this.getAllPathsUtil(source, destination, isVisited, pathList, paths);

        return paths;
    }
}
