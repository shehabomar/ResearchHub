import { Request, Response } from 'express';
import { CitationService, CitationTreeOptions } from '../services/citationService';

interface BuildTreeRequest {
    paperId: string;
    maxDepth?: number;
    maxReferencesPerLevel?: number;
    includeMetrics?: boolean;
}

class CitationController {
    static buildTree = async (req: Request, res: Response): Promise<void> => {
        try {
            const { paperId } = req.params;
            const {
                maxDepth = 5,
                maxReferencesPerLevel = 5,
                includeMetrics = false
            }: BuildTreeRequest = req.body;

            if (!paperId) {
                res.status(400).json({
                    success: false,
                    message: 'paper id is required'
                });
                return;
            }

            console.log(`building citation tree for paper ${paperId}`);

            const options: CitationTreeOptions = {
                maxDepth,
                maxReferencesPerLevel,
                includeMetrics
            };

            const tree = await CitationService.buildCitationTree(paperId, options);

            if (!tree) {
                res.status(404).json({
                    success: false,
                    message: 'unable to build citation tree for this paper'
                });
                return;
            }

            const stats = CitationService.getTreeStatistics(tree);
            const flattenedTree = CitationService.flattenTree(tree);

            res.status(200).json({
                success: true,
                data: {
                    tree,
                    statistics: stats,
                    flattened: flattenedTree
                }
            });
        }
        catch (ex) {
            console.log('error building citation tree:', ex);
            res.status(500).json({
                success: false,
                message: 'failed to build citation tree',
                error: ex instanceof Error ? ex.message : 'unknown error'
            });
        }
    }

    static buildTreeWithProgress = async (req: Request, res: Response): Promise<void> => {
        try {
            const { paperId } = req.params;
            const {
                maxDepth = 5,
                maxReferencesPerLevel = 5,
                includeMetrics = false
            }: BuildTreeRequest = req.body;

            if (!paperId) {
                res.status(400).json({
                    success: false,
                    message: 'paper id is required'
                });
                return;
            }

            console.log(`building citation tree with progress for paper ${paperId}`);

            const options: CitationTreeOptions = {
                maxDepth,
                maxReferencesPerLevel,
                includeMetrics
            };

            // For now, we'll use the regular build method
            // In the future, this could be enhanced with WebSocket for real-time progress
            const tree = await CitationService.buildCitationTreeWithProgress(
                paperId,
                options,
                (progress) => {
                    console.log(`Progress: ${progress.processed}/${progress.total} - ${progress.currentPaper}`);
                }
            );

            if (!tree) {
                res.status(404).json({
                    success: false,
                    message: 'unable to build citation tree for this paper'
                });
                return;
            }

            const stats = CitationService.getTreeStatistics(tree);
            const flattenedTree = CitationService.flattenTree(tree);

            res.status(200).json({
                success: true,
                data: {
                    tree,
                    statistics: stats,
                    flattened: flattenedTree
                }
            });
        }
        catch (ex) {
            console.log('error building citation tree with progress:', ex);
            res.status(500).json({
                success: false,
                message: 'failed to build citation tree with progress',
                error: ex instanceof Error ? ex.message : 'unknown error'
            });
        }
    }
}

export { CitationController };
