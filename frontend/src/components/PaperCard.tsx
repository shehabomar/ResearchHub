import React from 'react';
import {
    Card,
    CardContent,
    CardActionArea,
    Typography,
    Box,
    Chip,
    Stack,
} from '@mui/material';
import {
    FormatQuote as QuoteIcon,
    Person as PersonIcon,
    CalendarToday as CalendarIcon,
    Source as SourceIcon,
} from '@mui/icons-material';
import type { Paper } from '../services/api';

interface PaperCardProps {
    paper: Paper;
    onClick: () => void;
    elevation?: number;
}

const PaperCard: React.FC<PaperCardProps> = ({ paper, onClick, elevation = 2 }) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.getFullYear().toString();
    };

    const truncateText = (text: string, maxLength: number = 200) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const getAuthorNames = () => {
        if (!paper.authors || paper.authors.length === 0) return 'Unknown authors';
        if (paper.authors.length === 1) return paper.authors[0].name;
        if (paper.authors.length === 2) return `${paper.authors[0].name} and ${paper.authors[1].name}`;
        return `${paper.authors[0].name} et al.`;
    };

    return (
        <Card elevation={elevation} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardActionArea onClick={onClick} sx={{ flexGrow: 1, alignItems: 'stretch' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Title */}
                    <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        sx={{
                            fontWeight: 'bold',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '2.6em',
                        }}
                    >
                        {paper.title}
                    </Typography>

                    {/* Authors */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {getAuthorNames()}
                        </Typography>
                    </Box>

                    {/* Abstract */}
                    {paper.abstract && (
                        <Box sx={{ flexGrow: 1, mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                                {truncateText(paper.abstract)}
                            </Typography>
                        </Box>
                    )}

                    {/* Metadata row */}
                    <Stack direction="row" spacing={1} sx={{ mt: 'auto', flexWrap: 'wrap', gap: 1 }}>
                        {/* Citation count */}
                        <Chip
                            size="small"
                            icon={<QuoteIcon />}
                            label={`${paper.citation_count} citations`}
                            color="primary"
                            variant="outlined"
                        />

                        {/* Publication year */}
                        <Chip
                            size="small"
                            icon={<CalendarIcon />}
                            label={formatDate(paper.publication_date)}
                            color="secondary"
                            variant="outlined"
                        />

                        {/* Source */}
                        <Chip
                            size="small"
                            icon={<SourceIcon />}
                            label={paper.api_source === 'semantic_scholar' ? 'Semantic Scholar' : paper.api_source}
                            color="default"
                            variant="outlined"
                        />
                    </Stack>

                    {/* Venue if available */}
                    {paper.meta_data?.venue && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, fontStyle: 'italic' }}
                        >
                            Published in: {paper.meta_data.venue}
                        </Typography>
                    )}
                </CardContent>
            </CardActionArea>
        </Card>
    );
};

export default PaperCard;
