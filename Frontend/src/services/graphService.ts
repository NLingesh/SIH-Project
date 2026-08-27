import { graphNodes, graphEdges } from '../data/graph'
export const graphService = {
  async getGraph(){ return { nodes: graphNodes, edges: graphEdges } }
}
