import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Position,
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import {
    Box,
    Paper,
    Typography,
    Card,
    CardContent,
    Chip,
} from '@mui/material';
import type { CitationTreeNode } from '../services/api';

import 'reactflow/dist/style.css';

interface CitationGraphProps {
    citationTree: CitationTreeNode | null;
    onNodeClick?: (paperId: string) => void;
    height?: string | number;
}

interface CustomNodeData {
    paperId: string;
    title: string;
    authors: string;
    citationCount: number;
    depth: number;
    isRoot?: boolean;
}

// Custom node component
const CustomPaperNode: React.FC<{ data: CustomNodeData }> = ({ data }) => {
    const truncateTitle = (title: string, maxLength: number = 50) => {
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    };

    const getNodeColor = (depth: number, isRoot: boolean = false) => {
        if (isRoot) return '#1976d2';
        const colors = ['#2196f3', '#4caf50', '#ff9800', '#f44336'];
        return colors[Math.min(depth, colors.length - 1)];
    };

    return (
        <Card
            elevation={3}
            sx={{
                minWidth: 200,
                maxWidth: 250,
                border: `3px solid ${getNodeColor(data.depth, data.isRoot)}`,
                borderRadius: 2,
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Typography
                    variant="subtitle2"
                    component="div"
                    sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        lineHeight: 1.2,
                        fontSize: '0.85rem'
                    }}
                    title={data.title}
                >
                    {truncateTitle(data.title)}
                </Typography>

                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                >
                    {data.authors}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                        size="small"
                        label={`${data.citationCount} cites`}
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                    />
                    {data.isRoot && (
                        <Chip
                            size="small"
                            label="Root"
                            color="secondary"
                            sx={{ fontSize: '0.7rem' }}
                        />
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

const nodeTypes = {
    customPaper: CustomPaperNode,
};

const CitationGraph: React.FC<CitationGraphProps> = ({
    citationTree,
    onNodeClick,
    height = '600px'
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Convert citation tree to React Flow nodes and edges
    const { flowNodes, flowEdges } = useMemo(() => {
        if (!citationTree) return { flowNodes: [], flowEdges: [] };

        const nodes: Node<CustomNodeData>[] = [];
        const edges: Edge[] = [];
        const nodePositions = new Map<string, { x: number; y: number }>();

        const processNode = (
            node: CitationTreeNode,
            parentId?: string,
            level: number = 0,
            index: number = 0
        ) => {
            const nodeId = node.paper.id;

            // Calculate position based on tree structure
            const xSpacing = 300;
            const ySpacing = 200;
            const x = index * xSpacing - (node.references.length - 1) * xSpacing / 2;
            const y = level * ySpacing;

            nodePositions.set(nodeId, { x, y });

            const authorNames = (node.paper.authors || []).slice(0, 2).map(a => a?.name).filter(Boolean);
            const authorsString = authorNames.length > 0
                ? authorNames.join(', ') + ((node.paper.authors?.length || 0) > 2 ? ' et al.' : '')
                : 'Unknown';

            nodes.push({
                id: nodeId,
                type: 'customPaper',
                position: { x, y },
                data: {
                    paperId: node.paper.id,
                    title: node.paper.title,
                    authors: authorsString,
                    citationCount: node.paper.citation_count,
                    depth: node.depth,
                    isRoot: level === 0,
                },
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
            });

            // Add edge from parent to this node
            if (parentId) {
                edges.push({
                    id: `${parentId}-${nodeId}`,
                    source: parentId,
                    target: nodeId,
                    type: 'smoothstep',
                    animated: false,
                    style: {
                        stroke: '#666',
                        strokeWidth: 2,
                    },
                });
            }

            // Process references (children)
            node.references.forEach((reference, refIndex) => {
                processNode(reference, nodeId, level + 1, refIndex);
            });
        };

        processNode(citationTree);

        return { flowNodes: nodes, flowEdges: edges };
    }, [citationTree]);

    // Update nodes and edges when citation tree changes
    React.useEffect(() => {
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [flowNodes, flowEdges, setNodes, setEdges]);

    const onConnect = useCallback(
        (params: any) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node<CustomNodeData>) => {
            if (onNodeClick && node.data) {
                onNodeClick(node.data.paperId);
            }
        },
        [onNodeClick]
    );

    if (!citationTree) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', height }}>
                <Typography variant="h6" color="text.secondary">
                    No citation tree available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Search for a paper to see its citation graph
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ height, position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={2}
            >
                <Controls />
                <MiniMap
                    style={{
                        height: 120,
                        width: 160,
                    }}
                    zoomable
                    pannable
                />
                <Background
                    gap={20}
                    size={1}
                    color="#e0e0e0"
                />
            </ReactFlow>

            {/* Legend */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    p: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                }}
            >
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>
                    Citation Tree
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#1976d2', borderRadius: 1 }} />
                        <Typography variant="caption">Root Paper</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 16, height: 16, backgroundColor: '#2196f3', borderRadius: 1 }} />
                        <Typography variant="caption">Referenced Papers</Typography>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default CitationGraph;
