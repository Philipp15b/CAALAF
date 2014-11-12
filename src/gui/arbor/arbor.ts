/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />
/// <reference path="handler.ts" />
/// <reference path="../gui.ts" />

module GUI {

    export class ArborGraph implements GUI.ProcessGraphUI {
        private sys : ParticleSystem;
        private renderer : Renderer;
        private handler : Handler;
        private highlightedEdges : Edge[] = [];

        constructor(renderer) {
            //this.sys = arbor.ParticleSystem(500, 3000, 0.95);
            this.sys = arbor.ParticleSystem(400, 1000, 0.5);
            this.sys.parameters({gravity:true});
            this.renderer = renderer;
            this.sys.renderer = renderer;
            this.handler = new Handler(renderer);
        }

        public showProcess(nodeId : string, data : Object) : void {
            var node = this.sys.getNode(nodeId);
            if (node) {
                node.data = data;
            } else {
                this.sys.addNode(nodeId, data);
            }
        }

        public getProcessDataObject(nodeId : string) : Object {
            var node = this.sys.getNode(nodeId),
                data = node ? node.data : null;
            return data;
        }

        public showTransitions(fromId : string, toId : string, datas : Object[]) {
            var edges = this.sys.getEdges(fromId, toId),
                edge = edges.length > 0 ? edges[0] : null;
            if (edge) {
                edge.data.datas = datas;
            } else {
                this.sys.addEdge(fromId, toId, {datas: datas});
            }
        }

        public setSelected(name: string) {
            if(!name) return;
            var newSelectedNode = this.sys.getNode(name);

            if(this.renderer.selectedNode && newSelectedNode) {
                this.renderer.selectedNode.data.status = null; // clear the previous selected
            }

            if(newSelectedNode) {
                this.renderer.selectedNode = newSelectedNode; // get the node
                this.renderer.selectedNode.data.status = 'selected'; // set it as selected, and let the renderer handle the rest.
            }
            this.renderer.redraw(); // redraw the image to change the color of the selected node.
        }

        public setHover(name : string) : void {
            this.renderer.hoverNode = this.sys.getNode(name);
            this.highlightEdges();
        }

        public clearHover() : void {
            this.renderer.hoverNode = null;
            this.removeHighlightEdges();
        }

        private highlightEdges(){
            var edges = [];
            if(this.renderer.selectedNode !== this.renderer.hoverNode){
                edges = this.sys.getEdges(this.renderer.selectedNode, this.renderer.hoverNode);
            } else {
                edges = this.sys.getEdgesFrom(this.renderer.selectedNode);
            }
            
            if(edges.length > 0){
                for (var i = 0; i < edges.length; i++){
                    edges[i].data.highlight = true;
                    this.highlightedEdges.push(edges[i]);
                }
                this.renderer.redraw();
            }
        }

        private removeHighlightEdges() : void { 
            if(this.highlightedEdges.length > 0){
                while(this.highlightedEdges.length> 0){
                    var edge = this.highlightedEdges.pop();
                    edge.data.highlight = false;
                }
                this.renderer.redraw();
            }
        }

        public hightlightPath() : void {
            // when given a trace(path) all edges should be highlighted
        }

        public getTransitionDataObjects(fromId : string, toId : string) : Object[] {
            var edges = this.sys.getEdges(fromId, toId),
                edge = edges.length > 0 ? edges[0] : null,
                datas = edge && edge.data ? edge.data.datas : null;
            return datas;
        }

        /* Event handling */
        public setOnSelectListener(f : (identifier : string) => void) : void {
            this.handler.onClick = (nodeId) => {
                f(nodeId);
            };
        }

        public clearOnSelectListener() : void {
            this.handler.onClick = null;
        }

        public setHoverOnListener(f : (identifier : string) => void) : void {
            this.handler.hoverOn = (nodeId) => {
                f(nodeId);
            }
        }

        public clearHoverOutListener() : void {
            this.handler.hoverOn = null;
        }

        public setHoverOutListener(f : (identifier : string) => void) : void {
            this.handler.hoverOut = (nodeId) => {
                f(nodeId);
            }
        }

        public clearHoverOnListener() : void {
            this.handler.hoverOut = null;
        }

        public clearAll() : void {
            this.sys.prune((node, from, to) => true);
        }

        public freeze() : void {
            this.sys.stop();
        }

        public unfreeze() : void {
            this.sys.start(true);
        }
    }
}
