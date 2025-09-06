import React, { useEffect, useMemo, useRef } from 'react';
import {
    Box,
    Breadcrumbs,
    Link,
    Typography,
    Paper,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { Home, ArrowForwardIos, ClearAll, ArrowBackIosNew, ArrowForwardIos as ArrowRight } from '@mui/icons-material';
import { useExploration } from '../context/ExplorationContext';
import { useNavigate } from 'react-router-dom';

const ExplorationBreadcrumb: React.FC = () => {
    const { path, navigateToPathIndex, clearPath } = useExploration();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            // Navigate to home
            navigate('/');
        } else {
            navigateToPathIndex(index);
            const paper = path[index];
            navigate(`/paper/${paper.paperId}`);
        }
    };

    if (path.length === 0) {
        return null;
    }

    // Auto-scroll to end when path updates
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
        }
    }, [path]);

    const lastIndex = useMemo(() => Math.max(0, path.length - 1), [path.length]);

    return (
        <Paper
            elevation={1}
            sx={{
                p: 2,
                mb: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Exploration Path
                </Typography>
                <Tooltip title="Clear exploration">
                    <IconButton size="small" onClick={() => clearPath()}>
                        <ClearAll fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="Scroll left">
                    <span>
                        <IconButton size="small" disabled={!path.length} onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}>
                            <ArrowBackIosNew fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
                <Box ref={scrollRef} sx={{ overflowX: 'auto', flex: 1 }}>
                    <Breadcrumbs
                        separator={<ArrowForwardIos fontSize="small" />}
                        aria-label="exploration path"
                        maxItems={6}
                        sx={{
                            '& .MuiBreadcrumbs-separator': {
                                mx: 1,
                                color: 'primary.main'
                            },
                            whiteSpace: 'nowrap',
                            px: 1
                        }}
                    >
                <Link
                    component="button"
                    variant="body2"
                    color="inherit"
                    onClick={() => handleBreadcrumbClick(-1)}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        '&:hover': {
                            textDecoration: 'underline',
                        },
                    }}
                >
                    <Home sx={{ mr: 0.5 }} fontSize="small" />
                    Search
                </Link>

                {path.map((item, index) => (
                    <Box key={`${item.paperId}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {index === path.length - 1 ? (
                            // Current/last item - not clickable
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 300 }}>
                                <Chip
                                    label={item.explorationType}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                                <Typography
                                    variant="body2"
                                    color="text.primary"
                                    noWrap
                                    sx={{
                                        fontWeight: 'medium',
                                        maxWidth: 200
                                    }}
                                    title={item.title}
                                >
                                    {item.title}
                                </Typography>
                            </Box>
                        ) : (
                            // Clickable breadcrumb items
                            <Link
                                component="button"
                                variant="body2"
                                color="inherit"
                                onClick={() => handleBreadcrumbClick(index)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    textDecoration: 'none',
                                    maxWidth: 300,
                                    '&:hover': {
                                        textDecoration: 'underline',
                                    },
                                }}
                            >
                                <Chip
                                    label={item.explorationType}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                />
                                <Typography
                                    variant="body2"
                                    noWrap
                                    sx={{ maxWidth: 200 }}
                                    title={item.title}
                                >
                                    {item.title}
                                </Typography>
                            </Link>
                        )}
                    </Box>
                ))}
                    </Breadcrumbs>
                </Box>
                <Tooltip title="Scroll right">
                    <span>
                        <IconButton size="small" disabled={!path.length || lastIndex < 0} onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}>
                            <ArrowRight fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {path.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {path.length} step{path.length !== 1 ? 's' : ''} in current exploration
                </Typography>
            )}
        </Paper>
    );
};

export default ExplorationBreadcrumb;
