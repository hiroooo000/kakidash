import { MindMap } from '../domain/MindMap';
import { Node } from '../domain/Node';

export class SearchService {
  constructor(private mindMap: MindMap) {}

  searchNodes(query: string): Node[] {
    if (!query) return [];
    const results: Node[] = [];
    const lowerQuery = query.toLowerCase();

    const traverse = (node: Node) => {
      if (node.topic.toLowerCase().includes(lowerQuery)) {
        results.push(node);
      }
      node.children.forEach(traverse);
    };

    traverse(this.mindMap.root);
    return results;
  }
}
