import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Paper as MuiPaper,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Divider,
    Stack,
    FormControlLabel,
    Switch,
} from '@mui/material';
import {
    ArrowBack,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    FormatQuote as QuoteIcon,
    Source as SourceIcon,
} from '@mui/icons-material';
import ObsidianCitationGraph from '../components/ObsidianCitationGraph';
import ExplorationBreadcrumb from '../components/ExplorationBreadcrumb';
import { useExploration, paperToPathItem } from '../context/ExplorationContext';
import { apiService } from '../services/api';
import type { Paper, CitationTreeNode } from '../services/api';

const PaperDetailPage: React.FC = () => {
    const { paperId } = useParams<{ paperId: string }>();
    const navigate = useNavigate();
    const { addToPath } = useExploration();
    const location = useLocation();

    const [paper, setPaper] = useState<Paper | null>(null);
    const [citationTree, setCitationTree] = useState<CitationTreeNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [citationLoading, setCitationLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [citationError, setCitationError] = useState<string | null>(null);
    const [currentPaperId, setCurrentPaperId] = useState<string | undefined>(paperId);
    const [currentExplorationType, setCurrentExplorationType] = useState<'search' | 'citation' | 'reference' | 'author' | 'similar'>((location.state as any)?.explorationType || 'search');
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [autoRebuild, setAutoRebuild] = useState<boolean>(() => {
        const v = localStorage.getItem('exploration:autoRebuild');
        return v === null ? true : v === 'true';
    });

    useEffect(() => {
        localStorage.setItem('exploration:autoRebuild', String(autoRebuild));
    }, [autoRebuild]);

    // Fetch paper details when currentPaperId changes
    useEffect(() => {
        const fetchPaper = async () => {
            if (!currentPaperId) return;

            setLoading(true);
            setError(null);

            try {
                const result = await apiService.getPaperById(currentPaperId);

                if (result.success && result.data) {
                    setPaper(result.data.paper);
                } else {
                    setError(result.message || 'Failed to fetch paper details');
                }
            } catch (err) {
                console.error('Error fetching paper:', err);
                setError('An error occurred while fetching paper details');
            } finally {
                setLoading(false);
            }
        };

        fetchPaper();
    }, [currentPaperId]);

    // When paper loads, ensure it is present in exploration path
    useEffect(() => {
        if (paper) {
            addToPath(paperToPathItem(paper, currentExplorationType));
        }
    }, [paper, addToPath, currentExplorationType]);

    // Fetch citation tree when paper is loaded and auto-rebuild is on
    useEffect(() => {
        const fetchCitationTree = async () => {
            if (!currentPaperId || !paper || !autoRebuild) return;

            setCitationLoading(true);
            setCitationError(null);

            try {
                const result = await apiService.buildCitationTree(currentPaperId, 5, 5);

                if (result.success && result.data) {
                    setCitationTree(result.data.tree);
                } else {
                    setCitationError(result.message || 'Failed to build citation tree');
                }
            } catch (err) {
                console.error('Error building citation tree:', err);
                setCitationError('An error occurred while building the citation tree');
            } finally {
                setCitationLoading(false);
            }
        };

        fetchCitationTree();
    }, [currentPaperId, paper, autoRebuild]);

    const handleNodeClick = useCallback((clickedPaperId: string) => {
        if (!clickedPaperId) return;
        setCurrentExplorationType('citation');
        setCurrentPaperId(clickedPaperId);
        // If autoRebuild is off, the effect above will skip rebuilding the network.
    }, []);

    const handleBackClick = () => {
        navigate(-1);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.getFullYear().toString();
    };

    const getAuthorNames = (authors?: Array<{ id?: string; name: string; affiliation?: string }>) => {
        if (!authors || authors.length === 0) return 'Unknown authors';
        return authors.map(a => a.name).join(', ');
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={40} />
                </Box>
            </Container>
        );
    }

    if (error || !paper) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={handleBackClick}
                    sx={{ mb: 2 }}
                >
                    Back
                </Button>
                <Alert severity="error">
                    {error || 'Paper not found'}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            {/* Navigation */}
            <Box sx={{ mb: 2 }}>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={handleBackClick}
                    sx={{ mb: 2 }}
                >
                    Back
                </Button>
                <ExplorationBreadcrumb />
            </Box>

            {/* Main Content Layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: leftCollapsed ? '0fr 1fr' : '1fr 1.6fr' }, gap: 4 }}>
                {/* Left Side - Paper Details */}
                <MuiPaper elevation={2} sx={{ p: 3, height: 'fit-content', display: leftCollapsed ? 'none' : 'block' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button size="small" onClick={() => setLeftCollapsed(true)}>Minimize</Button>
                    </Box>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {paper.title}
                    </Typography>

                    {/* Authors */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PersonIcon color="action" sx={{ mr: 1 }} />
                        <Typography variant="body1" color="text.secondary">
                            {getAuthorNames(paper.authors)}
                        </Typography>
                    </Box>

                    {/* Metadata */}
                    <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                            icon={<QuoteIcon />}
                            label={`${paper.citation_count} citations`}
                            color="primary"
                            variant="outlined"
                        />
                        <Chip
                            icon={<CalendarIcon />}
                            label={formatDate(paper.publication_date)}
                            color="secondary"
                            variant="outlined"
                        />
                        <Chip
                            icon={<SourceIcon />}
                            label={paper.api_source === 'semantic_scholar' ? 'Semantic Scholar' : paper.api_source}
                            variant="outlined"
                        />
                    </Stack>

                    {/* Venue */}
                    {paper.meta_data?.venue && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                            Published in: {paper.meta_data.venue}
                        </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Abstract */}
                    <Typography variant="h6" gutterBottom>
                        Abstract
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.6, mb: 2 }}>
                        {paper.abstract || 'No abstract available for this paper.'}
                    </Typography>

                    {/* Additional Info */}
                    {paper.meta_data?.url && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Button
                                variant="outlined"
                                href={paper.meta_data.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ mt: 1 }}
                            >
                                View Full Paper
                            </Button>
                        </>
                    )}
                </MuiPaper>

                {/* Right Side - Citation Graph */}
                <MuiPaper elevation={2} sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Citation Network
                        </Typography>
                        {leftCollapsed && (
                            <Button size="small" onClick={() => setLeftCollapsed(false)}>Show Details</Button>
                        )}
                        <FormControlLabel
                            control={<Switch checked={autoRebuild} onChange={(e) => setAutoRebuild(e.target.checked)} size="small" />}
                            label={<Typography variant="body2">Auto-rebuild on click</Typography>}
                            sx={{ ml: 'auto' }}
                        />
                    </Box>

                    {citationLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                            <CircularProgress />
                        </Box>
                    ) : citationError ? (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {citationError}
                        </Alert>
                    ) : (
                        <>
                            {citationTree && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    This shows papers that cite "{paper.title.slice(0, 50)}..." Click on any node to explore that paper's citation network.
                                </Typography>
                            )}
                            <ObsidianCitationGraph
                                citationTree={citationTree}
                                onNodeClick={handleNodeClick}
                                height="500px"
                                maxDepth={5}
                            />
                        </>
                    )}
                </MuiPaper>
            </Box>
        </Container>
    );
};

export default PaperDetailPage;
