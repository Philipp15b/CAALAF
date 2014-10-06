import ccs = require("./ccs");

//Bottom up we add existing subtrees.
//Any subtree in any node is replaced by
//its existing definition.

export class SharedParseTreeTraverser implements ccs.PostOrderDispatchHandler<ccs.Node> {

    private map;

    constructor(map : ccs.NodeMap) {
        this.map = map;
    }

    dispatchProgram(node : ccs.Program, ... assignResults : ccs.Node[]) : ccs.Node {
        node.assignments = <ccs.Assignment[]>assignResults;
        this.map.ensureNodeHasId(node);
        return node;
    }

    dispatchNullProcess(node : ccs.NullProcess) : ccs.Node {
        return this.ensureUniqueNode(node, "0");
    }

    dispatchAssignment(node : ccs.Assignment, result : ccs.Node) : ccs.Node {
        node.process = result;
        return this.ensureUniqueNode(node, "=" + node.variable + "," + node.process.id)
    }
    dispatchSummation(node : ccs.Summation, leftResult : ccs.Node, rightResult : ccs.Node) : ccs.Node {
        if (leftResult.id <= rightResult.id) {
            node.left = leftResult;
            node.right = rightResult;
        } else {
            node.left = rightResult;
            node.right = leftResult;
        }
        return this.ensureUniqueNode(node, "+" + node.left.id + "," + node.right.id);
    }
    dispatchComposition(node : ccs.Composition, leftResult : ccs.Node, rightResult : ccs.Node) : ccs.Node {
        if (leftResult.id <= rightResult.id) {
            node.left = leftResult;
            node.right = rightResult;
        } else {
            node.left = rightResult;
            node.right = leftResult;
        }
        return this.ensureUniqueNode(node, "|" + node.left.id + "," + node.right.id);
    }
    dispatchAction(node : ccs.Action, processResult : ccs.Node) : ccs.Node {
        node.next = processResult;
        return this.ensureUniqueNode(node, "." + (node.complement ? "!" : "") + node.label + "." + node.next.id);
    }
    dispatchRestriction(node : ccs.Restriction, processResult : ccs.Node) : ccs.Node {
        node.process = processResult;
        //Same as relabelling
        this.map.ensureNodeHasId(node);
        return node;
    }
    dispatchRelabelling(node : ccs.Relabelling, processResult : ccs.Node) : ccs.Node {
        node.process = processResult;
        //TODO: match on relabel sets
        //For now any relabelling is unique
        this.map.ensureNodeHasId(node);
        return node;
    }
    dispatchConstant(node : ccs.Constant) : ccs.Node {
        return this.ensureUniqueNode(node, "c_" + node.constant);
    }

    private ensureUniqueNode(node, structure) {
        var result = this.map.getNodeByStructure(structure);
        if (!result) {
            result = node;
            this.map.ensureNodeHasIdByStructure(node, structure);
        }
        return result;
    }
}