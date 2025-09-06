import React, { useState, useCallback } from 'react';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Stack,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PaperCard from '../components/PaperCard';
import { useExploration, paperToPathItem } from '../context/ExplorationContext';
import { apiService } from '../services/api';
import type { Paper } from '../services/api';

const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const navigate = useNavigate();
    const { clearPath, addToPath } = useExploration();

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setSearchPerformed(true);

        try {
            const result = await apiService.searchPapers(query.trim(), 20);

            if (result.success && result.data) {
                setPapers(result.data.papers);
                // Clear any existing exploration path when starting a new search
                clearPath();
            } else {
                setError(result.message || 'Failed to search papers');
                setPapers([]);
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('An error occurred while searching. Please try again.');
            setPapers([]);
        } finally {
            setLoading(false);
        }
    }, [query, clearPath]);

    const handlePaperClick = useCallback((paper: Paper) => {
        // Add the paper to the exploration path
        const pathItem = paperToPathItem(paper, 'search');
        addToPath(pathItem);

        // Navigate to the paper detail page
        navigate(`/paper/${paper.id}`, { state: { explorationType: 'search' } });
    }, [addToPath, navigate]);

    const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography
                    variant="h3"
                    component="h1"
                    gutterBottom
                    sx={{
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Academic Discovery
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                    Explore the world of academic research through interactive citation networks
                </Typography>

                {/* Search Bar */}
                <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            fullWidth
                            variant="outlined"
                            label="Search for academic papers..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="e.g., machine learning, artificial intelligence, quantum computing"
                            disabled={loading}
                            InputProps={{
                                sx: {
                                    borderRadius: 2,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'white',
                                    },
                                },
                            }}
                        />
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSearch}
                            disabled={loading || !query.trim()}
                            startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                            sx={{
                                minWidth: 120,
                                height: 56,
                                borderRadius: 2,
                            }}
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Search Results */}
            {searchPerformed && (
                <Box>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={40} />
                        </Box>
                    ) : papers.length > 0 ? (
                        <>
                            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                                Search Results ({papers.length} papers found)
                            </Typography>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: 3,
                                mt: 3
                            }}>
                                {papers.map((paper) => (
                                    <PaperCard
                                        key={paper.id}
                                        paper={paper}
                                        onClick={() => handlePaperClick(paper)}
                                    />
                                ))}
                            </Box>
                        </>
                    ) : searchPerformed && !loading && (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Typography variant="h6" color="text.secondary">
                                No papers found for "{query}"
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Try different keywords or check your spelling
                            </Typography>
                        </Box>
                    )}
                </Box>
            )}

            {/* Getting Started Guide */}
            {!searchPerformed && (
                <Box sx={{ mt: 8, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                        How it Works
                    </Typography>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 4,
                        mt: 2
                    }}>
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <SearchIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                                1. Search
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Enter keywords to find academic papers from millions of publications
                            </Typography>
                        </Box>
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'primary.main', mb: 2 }}>
                                📄
                            </Typography>
                            <Typography variant="h6" gutterBottom>
                                2. Explore
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Click on any paper to see its details and citation network
                            </Typography>
                        </Box>
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="h4" sx={{ color: 'primary.main', mb: 2 }}>
                                🌐
                            </Typography>
                            <Typography variant="h6" gutterBottom>
                                3. Navigate
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Follow citation trails to discover related research
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            )}
        </Container>
    );
};

export default SearchPage;
