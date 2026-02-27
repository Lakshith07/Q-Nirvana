/**
 * Dijkstra's Shortest Path Algorithm for Emergency Navigation
 * Used to calculate the fastest/safest route for Ambulances.
 */

class DijkstraRouter {
    constructor() {
        // Map nodes: 0: Hospital, 1: MG Road, 2: Tech Square, 3: Richmond Circle, 
        // 4: Patient A, 5: Patient B, 6: Traffic Hub, 7: East End
        this.nodes = ['Q Nirvana Hospital', 'MG Road', 'Tech Square', 'Richmond Circle', 'Patient Area A', 'Patient Area B', 'Traffic Hub', 'East End'];

        // Adjacency list: node1: { node2: weight, node3: weight }
        // weights represent time in minutes (considering distance + traffic)
        this.graph = {
            0: { 1: 5, 2: 12, 6: 8 },    // Hospital connects to MG Road, Tech Square, Traffic Hub
            1: { 0: 5, 3: 4, 6: 6 },     // MG Road connects to Hospital, Richmond Circle, Traffic Hub
            2: { 0: 12, 5: 8, 7: 10 },   // Tech Square connects to Hospital, Patient B, East End
            3: { 1: 4, 4: 5, 6: 3 },     // Richmond Circle connects to MG Road, Patient A, Traffic Hub
            4: { 3: 5, 5: 15 },          // Patient A connects to Richmond Circle, Patient B
            5: { 2: 8, 4: 15, 7: 5 },    // Patient B connects to Tech Square, Patient A, East End
            6: { 0: 8, 1: 6, 3: 3, 7: 12 }, // Traffic Hub connects to most nodes
            7: { 2: 10, 5: 5, 6: 12 }    // East End connects to Tech Square, Patient B, Traffic Hub
        };
    }

    findShortestPath(startNode, endNode) {
        let distances = {};
        let prev = {};
        let pq = new PriorityQueue();

        // Initialize distances
        for (let node in this.graph) {
            distances[node] = Infinity;
            prev[node] = null;
        }

        distances[startNode] = 0;
        pq.enqueue(startNode, 0);

        while (!pq.isEmpty()) {
            let { element: currNode } = pq.dequeue();

            if (currNode == endNode) break;

            for (let neighbor in this.graph[currNode]) {
                let alt = distances[currNode] + this.graph[currNode][neighbor];
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    prev[neighbor] = currNode;
                    pq.enqueue(neighbor, alt);
                }
            }
        }

        // Reconstruct path
        let path = [];
        let curr = endNode;
        while (curr !== null) {
            path.unshift(this.nodes[curr]);
            curr = prev[curr];
        }

        return {
            path,
            totalTime: distances[endNode],
            distance: (distances[endNode] * 0.4).toFixed(1) // Simulated KM conversion
        };
    }
}

class PriorityQueue {
    constructor() {
        this.items = [];
    }
    enqueue(element, priority) {
        this.items.push({ element, priority });
        this.items.sort((a, b) => a.priority - b.priority);
    }
    dequeue() {
        return this.items.shift();
    }
    isEmpty() {
        return this.items.length === 0;
    }
}

export const dijkstra = new DijkstraRouter();
