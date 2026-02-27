import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Navigation, Compass, Activity, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function NavigationMap() {
    const [graph, setGraph] = useState(null);
    const [positions, setPositions] = useState(null);
    const [path, setPath] = useState([]);
    const [totalTime, setTotalTime] = useState(0);

    const [source, setSource] = useState('G');
    const [destination, setDestination] = useState('C');
    const [loading, setLoading] = useState(true);

    const fetchGraphAndPath = async () => {
        try {
            const graphRes = await api.get('/driver/city-graph');
            setGraph(graphRes.data.graph);
            setPositions(graphRes.data.positions);
            await calculatePath(graphRes.data.graph, source, destination);
            setLoading(false);
        } catch (e) {
            console.error(e);
            toast.error('Failed to load live traffic map');
        }
    };

    const calculatePath = async (currentGraph, src, dst) => {
        try {
            const pathRes = await api.post('/driver/shortest-path', { source: src, destination: dst });
            setPath(pathRes.data.path);
            setTotalTime(pathRes.data.totalTime);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateTraffic = async () => {
        try {
            await api.post('/driver/update-traffic');
            toast.success('Traffic spike! Recalculating optimal route...');
            fetchGraphAndPath();
        } catch (e) { console.error(e); }
    };

    // Re-calculate when source/dest changes
    useEffect(() => {
        if (graph) {
            calculatePath(graph, source, destination);
        }
    }, [source, destination]);

    useEffect(() => {
        fetchGraphAndPath();
        const interval = setInterval(() => {
            fetchGraphAndPath();
        }, 10000); // Auto update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    // Render Polylines for Dijkstra Edges
    const renderEdges = () => {
        if (!graph || !positions) return null;
        const edgesRendered = new Set();
        const components = [];

        Object.keys(graph).forEach(u => {
            Object.keys(graph[u]).forEach(v => {
                const edgeKey = [u, v].sort().join('-');
                if (!edgesRendered.has(edgeKey)) {
                    edgesRendered.add(edgeKey);
                    const isOptimal = path.includes(u) && path.includes(v) && Math.abs(path.indexOf(u) - path.indexOf(v)) === 1;
                    const weight = graph[u][v];

                    let color = '#94a3b8'; // default
                    let weightColor = '#ef4444'; // Traffic severity color
                    if (weight <= 3) weightColor = '#22c55e';
                    else if (weight <= 6) weightColor = '#f59e0b';

                    if (isOptimal) color = '#0ea5e9'; // Blue optimal path

                    components.push(
                        <Polyline
                            key={edgeKey}
                            positions={[
                                [positions[u].lat, positions[u].lng],
                                [positions[v].lat, positions[v].lng]
                            ]}
                            pathOptions={{ color, weight: isOptimal ? 6 : 3, opacity: isOptimal ? 1 : 0.5 }}
                        >
                            <Tooltip permanent direction="center" className="bg-white px-2 py-1 rounded shadow-sm text-xs font-bold" opacity={0.9}>
                                <span style={{ color: weightColor }}>{weight}m</span>
                            </Tooltip>
                        </Polyline>
                    );
                }
            });
        });
        return components;
    };

    return (
        <div style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="section-title text-2xl">Live Maps Integration</h2>
                    <p className="section-sub">Real-world coordinates with Dijkstra shortest path</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleUpdateTraffic} className="btn btn-outline bg-white hover:bg-slate-50 transition-colors">
                        <Route size={16} /> Simulate Traffic Spike
                    </button>
                    {totalTime > 0 && (
                        <div className="badge badge-navy flex items-center gap-2 py-2 px-4 shadow-sm text-sm">
                            <Activity size={14} className="pulse" /> TOTAL ETA: {totalTime} MINS
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
                <div className="col-span-8 card relative overflow-hidden flex flex-col bg-slate-50 border-2" style={{ borderColor: 'var(--slate-200)', padding: 0 }}>
                    {loading && !graph ? (
                        <div className="flex-1 flex items-center justify-center"><div className="spinner" /></div>
                    ) : (
                        <MapContainer
                            center={[12.935, 77.63]} // Approx center of Bangalore graph
                            zoom={13}
                            style={{ minHeight: '500px', height: '100%', width: '100%', flex: 1, zIndex: 0 }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {renderEdges()}

                            {positions && Object.keys(positions).map(node => {
                                const pos = positions[node];
                                const isSource = node === source;
                                const isDest = node === destination;
                                let color = '#64748b';
                                if (path.includes(node)) color = '#0ea5e9';
                                if (isSource) color = '#22c55e';
                                if (isDest) color = '#ef4444';

                                return (
                                    <CircleMarker
                                        key={node}
                                        center={[pos.lat, pos.lng]}
                                        pathOptions={{ color, fillColor: color, fillOpacity: 1 }}
                                        radius={isSource || isDest ? 10 : 6}
                                    >
                                        <Tooltip permanent direction="top" offset={[0, -10]} className="font-bold">
                                            {pos.name} (Node {node})
                                            {isSource && " - DEPARTURE"}
                                            {isDest && " - TARGET"}
                                        </Tooltip>
                                    </CircleMarker>
                                );
                            })}
                        </MapContainer>
                    )}
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <div className="card flex-1 flex flex-col">
                        <div className="card-header"><div className="card-title">Dispatch Control</div></div>
                        <div className="card-body flex-1 overflow-y-auto">
                            <div className="form-group mb-4">
                                <label className="form-label">Driver Location</label>
                                <select className="form-control" value={source} onChange={e => setSource(e.target.value)}>
                                    {positions && Object.keys(positions).map(n => <option key={n} value={n}>{positions[n].name} (Node {n})</option>)}
                                </select>
                            </div>
                            <div className="form-group mb-6">
                                <label className="form-label">Emergency/Hospital</label>
                                <select className="form-control" value={destination} onChange={e => setDestination(e.target.value)}>
                                    {positions && Object.keys(positions).map(n => <option key={n} value={n}>{positions[n].name} (Node {n})</option>)}
                                </select>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Shortest Path GPS</p>
                                <div className="flex flex-col gap-3">
                                    {path.map((node, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${node === source ? 'bg-success text-white' : node === destination ? 'bg-danger text-white' : 'bg-navy-100 text-navy-800'}`}>
                                                {node}
                                            </span>
                                            <div>
                                                <p className="font-bold text-sm">{positions && positions[node]?.name}</p>
                                                {i < path.length - 1 && <p className="text-xs text-slate-400">Head to next waypoint</p>}
                                                {i === path.length - 1 && <p className="text-xs text-success font-bold">Arrive at destination!</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-navy-800 text-white p-6 shadow-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <Compass size={24} className="text-teal-400" />
                            <h3 className="font-bold text-lg">Leaflet Maps Engine</h3>
                        </div>
                        <p className="text-xs text-navy-200 leading-relaxed mb-4">
                            Dynamic routing powered by React-Leaflet on OSM tiles. The graph now perfectly binds our Dijkstra nodes to authentic geographical coordinates.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
