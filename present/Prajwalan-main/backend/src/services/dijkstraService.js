/**
 * Dijkstra's Algorithm for Driver Route Optimization
 * Computes shortest path between two points in a weighted graph
 */

class MinHeap {
    constructor() { this.heap = []; }
    push(item) { this.heap.push(item); this._bubbleUp(this.heap.length - 1); }
    pop() {
        const top = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) { this.heap[0] = last; this._sinkDown(0); }
        return top;
    }
    _bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent][0] > this.heap[i][0]) {
                [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
                i = parent;
            } else break;
        }
    }
    _sinkDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
            if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;
            if (smallest !== i) {
                [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
                i = smallest;
            } else break;
        }
    }
    get size() { return this.heap.length; }
}

/**
 * Dijkstra's shortest path
 * @param {Object} graph - adjacency list { node: [[neighbor, weight], ...] }
 * @param {string} start - starting node id
 * @param {string} end - destination node id
 * @returns {{ distance: number, path: string[] }}
 */
function dijkstra(graph, start, end) {
    const dist = {};
    const prev = {};
    const visited = new Set();
    const pq = new MinHeap();

    for (const node of Object.keys(graph)) { dist[node] = Infinity; }
    dist[start] = 0;
    pq.push([0, start]);

    while (pq.size > 0) {
        const [d, u] = pq.pop();
        if (visited.has(u)) continue;
        visited.add(u);
        if (u === end) break;

        for (const [v, weight] of (graph[u] || [])) {
            const newDist = d + weight;
            if (newDist < dist[v]) {
                dist[v] = newDist;
                prev[v] = u;
                pq.push([newDist, v]);
            }
        }
    }

    // Reconstruct path
    const path = [];
    let current = end;
    while (current !== undefined) {
        path.unshift(current);
        current = prev[current];
    }

    return {
        distance: dist[end] === Infinity ? -1 : dist[end],
        path: dist[end] === Infinity ? [] : path,
    };
}

/**
 * Haversine formula: distance between two lat/lng points (km)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Build a simulated city graph from waypoints for demonstration
 * In production, replace with real road network data (OSM, Google Roads API)
 */
function buildGraphFromWaypoints(waypoints) {
    const graph = {};
    waypoints.forEach((wp, i) => {
        graph[wp.id] = [];
        waypoints.forEach((other, j) => {
            if (i !== j) {
                const dist = haversineDistance(wp.lat, wp.lng, other.lat, other.lng);
                // Safety weight: multiply by road_safety_factor (1.0 = safe, higher = avoid)
                const weight = dist * (other.safety_factor || 1.0);
                // Only connect nearby nodes (within 5km) to simulate roads
                if (dist < 5) {
                    graph[wp.id].push([other.id, weight]);
                }
            }
        });
    });
    return graph;
}

const DEFAULT_CITY_WAYPOINTS = [
    { id: 'wp1', lat: 12.9716, lng: 77.5946, safety_factor: 1.0 }, // Central Station
    { id: 'wp2', lat: 12.9750, lng: 77.5900, safety_factor: 1.2 }, // Market Area (Slightly slower)
    { id: 'wp3', lat: 12.9680, lng: 77.6000, safety_factor: 1.0 }, // Residential Block A
    { id: 'wp4', lat: 12.9800, lng: 77.5850, safety_factor: 1.5 }, // Construction Zone (Heavy delay)
    { id: 'wp5', lat: 12.9600, lng: 77.6100, safety_factor: 0.8 }, // Expressway (Faster)
];

/**
 * Calculate optimal route for driver
 * @param {Object} driverLocation - { lat, lng }
 * @param {Object} patientLocation - { lat, lng }
 * @param {Object} hospitalLocation - { lat, lng }
 * @param {Array} cityWaypoints - intermediate road nodes
 */
function calculateOptimalRoute(driverLocation, patientLocation, hospitalLocation, cityWaypoints = []) {
    const waypoints = cityWaypoints.length > 0 ? cityWaypoints : DEFAULT_CITY_WAYPOINTS;
    // Create nodes
    const nodes = [
        { id: 'driver', lat: driverLocation.lat, lng: driverLocation.lng, safety_factor: 1.0 },
        { id: 'patient', lat: patientLocation.lat, lng: patientLocation.lng, safety_factor: 1.0 },
        { id: 'hospital', lat: hospitalLocation.lat, lng: hospitalLocation.lng, safety_factor: 1.0 },
        ...waypoints,
    ];

    const graph = buildGraphFromWaypoints(nodes);

    // Route: driver → patient
    const toPatient = dijkstra(graph, 'driver', 'patient');
    // Route: patient → hospital
    const toHospital = dijkstra(graph, 'patient', 'hospital');

    const totalDistance = (toPatient.distance + toHospital.distance).toFixed(2);
    const estimatedTimeMin = Math.ceil((totalDistance / 40) * 60); // avg 40 km/h city speed

    return {
        toPatient: {
            distance: toPatient.distance.toFixed(2),
            path: toPatient.path,
        },
        toHospital: {
            distance: toHospital.distance.toFixed(2),
            path: toHospital.path,
        },
        totalDistanceKm: parseFloat(totalDistance),
        estimatedTimeMinutes: estimatedTimeMin,
        algorithm: 'Dijkstra\'s Shortest Path',
    };
}

/**
 * Update traffic/road conditions for a waypoint
 * @param {string} wpId 
 * @param {number} newFactor 
 */
function updateRoadCondition(wpId, newFactor) {
    const wp = DEFAULT_CITY_WAYPOINTS.find(w => w.id === wpId);
    if (wp) wp.safety_factor = newFactor;
}

/**
 * Generate human-readable route summary with turn-by-turn guidance notes
 * @param {Object} routeData 
 */
function getRouteSummary(routeData) {
    const { totalDistanceKm, estimatedTimeMinutes, algorithm } = routeData;
    return `
📍 Optimal Route Summary (${algorithm})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛣️ Total Distance: ${totalDistanceKm} km
⏱️ Approx. Travel Time: ${estimatedTimeMinutes} mins
🚦 Traffic Status: ${totalDistanceKm > 4 ? 'Moderate' : 'Clear'}
    `;
}

module.exports = {
    dijkstra,
    haversineDistance,
    calculateOptimalRoute,
    buildGraphFromWaypoints,
    updateRoadCondition,
    getRouteSummary
};
