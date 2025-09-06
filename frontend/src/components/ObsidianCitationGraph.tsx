import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
    Box,
    Paper,
    Typography,
    Slider,
    FormLabel,
    Switch,
    FormControlLabel,
    Chip,
    Tooltip,
    IconButton,
    Card,
    CardContent,
    ButtonGroup,
} from '@mui/material';
import {
    ZoomIn,
    ZoomOut,
    CenterFocusStrong,
} from '@mui/icons-material';
import type { CitationTreeNode } from '../services/api';

interface ObsidianCitationGraphProps {
    citationTree: CitationTreeNode | null;
    onNodeClick?: (paperId: string) => void;
    height?: string | number;
    maxDepth?: number;
}

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    title: string;
    authors: string;
    citationCount: number;
    depth: number;
    isRoot: boolean;
    radius: number;
    color: string;
    paperId: string;
    x?: number;
    y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    strength: number;
    distance: number;
}

const ObsidianCitationGraph: React.FC<ObsidianCitationGraphProps> = ({
    citationTree,
    onNodeClick,
    height = '600px',
    maxDepth = 5,
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [simulationStrength, setSimulationStrength] = useState(0.3);
    const [linkDistance, setLinkDistance] = useState(100);
    const [showLabels, setShowLabels] = useState(true);
    const [nodeSize, setNodeSize] = useState(1);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Obsidian-inspired color palette
    const obsidianColors = {
        background: '#1e1e1e',
        node: {
            root: '#9333ea',        // Purple for root
            depth0: '#06b6d4',      // Cyan for direct connections
            depth1: '#10b981',      // Green for level 1
            depth2: '#f59e0b',      // Yellow for level 2
            depth3: '#ef4444',      // Red for level 3
            depth4: '#8b5cf6',      // Violet for level 4+
        },
        link: '#374151',
        linkHover: '#6b7280',
        text: '#e5e7eb',
        textSecondary: '#9ca3af',
    };

    // Convert citation tree to graph data
    const { nodes, links } = useMemo(() => {
        if (!citationTree) return { nodes: [], links: [] };

        const nodeMap = new Map<string, GraphNode>();
        const linkSet = new Set<string>();
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        const processNode = (
            node: CitationTreeNode,
            parentId?: string,
            currentDepth: number = 0
        ) => {
            if (currentDepth > maxDepth) return;

            const nodeId = node.paper.id;

            if (!nodeMap.has(nodeId)) {
                const authorNames = (node.paper.authors || []).slice(0, 2).map(a => a?.name).filter(Boolean);
                const authorsString = authorNames.length > 0
                    ? authorNames.join(', ') + ((node.paper.authors?.length || 0) > 2 ? ' et al.' : '')
                    : 'Unknown';

                const baseRadius = currentDepth === 0 ? 15 : 8 + Math.max(0, 5 - currentDepth);
                const citationRadius = Math.min(Math.sqrt(node.paper.citation_count || 0) * 0.5, 10);
                const finalRadius = Math.max(baseRadius + citationRadius, 6);

                const getNodeColor = (depth: number, isRoot: boolean) => {
                    if (isRoot) return obsidianColors.node.root;
                    switch (depth) {
                        case 1: return obsidianColors.node.depth0;
                        case 2: return obsidianColors.node.depth1;
                        case 3: return obsidianColors.node.depth2;
                        case 4: return obsidianColors.node.depth3;
                        default: return obsidianColors.node.depth4;
                    }
                };

                const graphNode: GraphNode = {
                    id: nodeId,
                    paperId: nodeId,
                    title: node.paper.title,
                    authors: authorsString,
                    citationCount: node.paper.citation_count || 0,
                    depth: currentDepth,
                    isRoot: currentDepth === 0,
                    radius: finalRadius * nodeSize,
                    color: getNodeColor(currentDepth, currentDepth === 0),
                };

                nodeMap.set(nodeId, graphNode);
                nodes.push(graphNode);
            }

            // Add link from parent
            if (parentId) {
                const linkId = `${parentId}-${nodeId}`;
                if (!linkSet.has(linkId)) {
                    const strength = Math.max(0.1, 1 - currentDepth * 0.2);
                    const distance = linkDistance + currentDepth * 20;

                    links.push({
                        source: parentId,
                        target: nodeId,
                        strength,
                        distance,
                    });
                    linkSet.add(linkId);
                }
            }

            // Process children
            node.references.forEach((reference) => {
                processNode(reference, nodeId, currentDepth + 1);
            });
        };

        processNode(citationTree);
        return { nodes, links };
    }, [citationTree, maxDepth, nodeSize, linkDistance]);

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };

        updateDimensions();
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Create and update D3 visualization
    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;

        // Setup zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
                setZoomLevel(event.transform.k);
            });

        svg.call(zoom);

        // Main group for zoomable content
        const g = svg.append('g');

        // Interactive background to enable easy panning/zooming when dragging empty space
        g.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'transparent')
            .style('cursor', 'grab');

        // Create force simulation
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force('link', d3.forceLink<GraphNode, GraphLink>(links)
                .id(d => d.id)
                .distance(d => d.distance)
                .strength(d => d.strength * simulationStrength))
            .force('charge', d3.forceManyBody()
                .strength(-300 * simulationStrength))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide<GraphNode>()
                .radius(d => d.radius + 5));

        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', obsidianColors.link)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');

        // Create nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', d => d.radius)
            .attr('fill', d => d.color)
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer')
            .call(d3.drag<any, GraphNode>()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }) as any);

        // Create labels
        const label = g.append('g')
            .selectAll('text')
            .data(nodes)
            .join('text')
            .text(d => d.title.length > 30 ? d.title.substring(0, 30) + '...' : d.title)
            .style('fill', obsidianColors.text)
            .style('font-family', 'Arial, sans-serif')
            .style('font-size', d => d.isRoot ? '12px' : '10px')
            .style('font-weight', d => d.isRoot ? 'bold' : 'normal')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('opacity', showLabels ? 1 : 0);

        // Node interactions
        node
            .on('mouseover', (event, d) => {
                setHoveredNode(d);

                // Highlight connected links
                link.style('stroke', l =>
                    l.source === d || l.target === d ? obsidianColors.linkHover : obsidianColors.link
                );

                // Increase node size slightly
                d3.select(event.currentTarget).transition().duration(200).attr('r', d.radius * 1.2);
            })
            .on('mouseout', (event, d) => {
                setHoveredNode(null);

                // Reset links
                link.style('stroke', obsidianColors.link);

                // Reset node size
                d3.select(event.currentTarget).transition().duration(200).attr('r', d.radius);
            })
            .on('click', (_, d) => {
                setSelectedNode(d);
                if (onNodeClick) {
                    onNodeClick(d.paperId);
                }
            });

        // Update positions on simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as GraphNode).x!)
                .attr('y1', d => (d.source as GraphNode).y!)
                .attr('x2', d => (d.target as GraphNode).x!)
                .attr('y2', d => (d.target as GraphNode).y!);

            node
                .attr('cx', d => d.x!)
                .attr('cy', d => d.y!);

            label
                .attr('x', d => d.x!)
                .attr('y', d => d.y! - d.radius - 5);
        });

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [nodes, links, dimensions, simulationStrength, linkDistance, showLabels, nodeSize, onNodeClick]);

    const handleZoomIn = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().call(
            d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1.5
        );
    };

    const handleZoomOut = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().call(
            d3.zoom<SVGSVGElement, unknown>().scaleBy as any, 1 / 1.5
        );
    };

    const handleCenter = () => {
        const svg = d3.select(svgRef.current);
        svg.transition().call(
            d3.zoom<SVGSVGElement, unknown>().transform as any,
            d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(1)
        );
    };

    if (!citationTree) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', height, backgroundColor: obsidianColors.background }}>
                <Typography variant="h6" color={obsidianColors.text}>
                    No citation network available
                </Typography>
                <Typography variant="body2" color={obsidianColors.textSecondary} sx={{ mt: 1 }}>
                    Search for a paper to explore its citation network
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper
            sx={{
                height,
                position: 'relative',
                backgroundColor: obsidianColors.background,
                border: '1px solid #374151'
            }}
        >
            <Box ref={containerRef} sx={{ width: '100%', height: '100%' }}>
                <svg
                    ref={svgRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    style={{ background: obsidianColors.background }}
                />

                {/* Controls Panel */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    <ButtonGroup orientation="vertical" size="small" variant="contained">
                        <Tooltip title="Zoom In">
                            <IconButton onClick={handleZoomIn} size="small">
                                <ZoomIn />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Zoom Out">
                            <IconButton onClick={handleZoomOut} size="small">
                                <ZoomOut />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Center View">
                            <IconButton onClick={handleCenter} size="small">
                                <CenterFocusStrong />
                            </IconButton>
                        </Tooltip>
                    </ButtonGroup>
                </Box>

                {/* Settings Panel */}
                <Card
                    sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        border: '1px solid #374151',
                        minWidth: 250,
                    }}
                >
                    <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: obsidianColors.text, mb: 2 }}>
                            Network Controls
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            <FormLabel sx={{ color: obsidianColors.text, fontSize: '0.8rem' }}>
                                Simulation Strength: {simulationStrength.toFixed(1)}
                            </FormLabel>
                            <Slider
                                value={simulationStrength}
                                onChange={(_, value) => setSimulationStrength(value as number)}
                                min={0.1}
                                max={1}
                                step={0.1}
                                size="small"
                                sx={{ color: obsidianColors.node.root }}
                            />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <FormLabel sx={{ color: obsidianColors.text, fontSize: '0.8rem' }}>
                                Link Distance: {linkDistance}
                            </FormLabel>
                            <Slider
                                value={linkDistance}
                                onChange={(_, value) => setLinkDistance(value as number)}
                                min={50}
                                max={200}
                                step={10}
                                size="small"
                                sx={{ color: obsidianColors.node.depth0 }}
                            />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <FormLabel sx={{ color: obsidianColors.text, fontSize: '0.8rem' }}>
                                Node Size: {nodeSize.toFixed(1)}x
                            </FormLabel>
                            <Slider
                                value={nodeSize}
                                onChange={(_, value) => setNodeSize(value as number)}
                                min={0.5}
                                max={2}
                                step={0.1}
                                size="small"
                                sx={{ color: obsidianColors.node.depth1 }}
                            />
                        </Box>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={showLabels}
                                    onChange={(e) => setShowLabels(e.target.checked)}
                                    size="small"
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: obsidianColors.node.root,
                                        }
                                    }}
                                />
                            }
                            label={
                                <Typography sx={{ color: obsidianColors.text, fontSize: '0.8rem' }}>
                                    Show Labels
                                </Typography>
                            }
                        />
                    </CardContent>
                </Card>

                {/* Node Info Panel */}
                {(hoveredNode || selectedNode) && (
                    <Card
                        sx={{
                            position: 'absolute',
                            bottom: 16,
                            left: 16,
                            backgroundColor: 'rgba(30, 30, 30, 0.95)',
                            border: '1px solid #374151',
                            maxWidth: 400,
                        }}
                    >
                        <CardContent sx={{ p: 2 }}>
                            {(hoveredNode || selectedNode) && (
                                <>
                                    <Typography
                                        variant="subtitle2"
                                        sx={{ color: obsidianColors.text, fontWeight: 'bold', mb: 1 }}
                                    >
                                        {(hoveredNode || selectedNode)!.title}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{ color: obsidianColors.textSecondary, display: 'block', mb: 1 }}
                                    >
                                        {(hoveredNode || selectedNode)!.authors}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            size="small"
                                            label={`Depth ${(hoveredNode || selectedNode)!.depth}`}
                                            sx={{
                                                backgroundColor: (hoveredNode || selectedNode)!.color,
                                                color: 'white',
                                                fontSize: '0.7rem'
                                            }}
                                        />
                                        <Chip
                                            size="small"
                                            label={`${(hoveredNode || selectedNode)!.citationCount} citations`}
                                            variant="outlined"
                                            sx={{
                                                borderColor: obsidianColors.textSecondary,
                                                color: obsidianColors.text,
                                                fontSize: '0.7rem'
                                            }}
                                        />
                                    </Box>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Statistics */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        backgroundColor: 'rgba(30, 30, 30, 0.8)',
                        border: '1px solid #374151',
                        borderRadius: 1,
                        p: 1,
                    }}
                >
                    <Typography variant="caption" sx={{ color: obsidianColors.text, display: 'block' }}>
                        Nodes: {nodes.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: obsidianColors.text, display: 'block' }}>
                        Links: {links.length}
                    </Typography>
                    <Typography variant="caption" sx={{ color: obsidianColors.text, display: 'block' }}>
                        Zoom: {(zoomLevel * 100).toFixed(0)}%
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
};

export default ObsidianCitationGraph;
