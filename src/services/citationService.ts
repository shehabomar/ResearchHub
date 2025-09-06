import { paperRepo, DbPaper } from '../repositories/paperRepository';
import { semanticScholarAPI } from './academicApiService';

interface CitationTreeNode {
    paper: DbPaper;
    references: CitationTreeNode[];
    depth: number;
    totalNodes?: number;
}

interface CitationTreeOptions {
    maxDepth?: number;
    maxReferencesPerLevel?: number;
    includeMetrics?: boolean;
}

class CitationService {
    private static readonly DEFAULT_MAX_DEPTH = 5;
    private static readonly DEFAULT_MAX_REFS = 5;
    private static readonly RATE_LIMIT_DELAY = 1000;

    static async buildCitationTree(
        paperId: string,
        options: CitationTreeOptions = {},
        depth: number = 0,
        visited: Set<string> = new Set()
    ): Promise<CitationTreeNode | null> {
        try {
            const {
                maxDepth = this.DEFAULT_MAX_DEPTH,
                maxReferencesPerLevel = this.DEFAULT_MAX_REFS,
                includeMetrics = false
            } = options;

            if (depth >= maxDepth) {
                return null;
            }

            if (visited.has(paperId)) {
                return null;
            }

            visited.add(paperId);
            let paper = await paperRepo.getPaperById(paperId);

            // If paper exists but doesn't have references/citations, fetch fresh from API (with retry handled inside)
            if (paper && (!paper.meta_data?.references || paper.meta_data.references.length === 0)) {
                if (depth > 0) {
                    await this.delay(this.RATE_LIMIT_DELAY);
                }

                try {
                    const apiPaper = await semanticScholarAPI.getPaperById(paperId);
                    if (apiPaper) {
                        paper = await paperRepo.savePaper(apiPaper);
                        console.log(`refreshed ${paper.title} with references from API`);
                    }
                } catch (error) {
                    console.log(`Failed to refresh paper ${paperId} from API:`, error);
                    // Continue with existing paper data when rate-limited; avoid failing entire tree
                }
            }

            if (!paper) {
                if (depth > 0) {
                    await this.delay(this.RATE_LIMIT_DELAY);
                }

                try {
                    const apiPaper = await semanticScholarAPI.getPaperById(paperId);
                    if (apiPaper) {
                        paper = await paperRepo.savePaper(apiPaper);
                        console.log(`saved ${paper.title} to database`);
                    }
                } catch (ex) {
                    console.log(`API fetch failed for ${paperId}:`, ex);
                    return null; // gracefully skip this branch on rate limit/temporary failure
                }
            }
            
            if (!paper) {
                return null;
            }

            const references = paper.meta_data?.references || [];
            const citations = paper.meta_data?.citations || [];

            const relatedPapers = depth === 0 ? citations : references;
            const limitedRelated = relatedPapers.slice(0, maxReferencesPerLevel);
            const validIds = limitedRelated.filter((id: any) => typeof id === 'string' && id.trim());
            const childPromises = validIds.map((relatedId: string) =>
                this.buildCitationTree(relatedId, options, depth + 1, new Set(visited))
            );
            const childResults = await Promise.all(childPromises);
            const referencesTrees: CitationTreeNode[] = (childResults.filter(Boolean) as CitationTreeNode[]);

            const node: CitationTreeNode = {
                paper,
                references: referencesTrees,
                depth
            };

            if (includeMetrics) {
                node.totalNodes = this.countNodes(node);
            }

            console.log(`built tree for ${paper.title} with ${referencesTrees.length} related branches (depth ${depth})`);
            return node;

        } catch (error) {
            console.error(`error building citation tree for ${paperId}:`, error);
            return null;
        }
    }

    static async buildCitationTreeWithProgress(
        paperId: string,
        options: CitationTreeOptions = {},
        onProgress?: (progress: { processed: number; total: number; currentPaper: string }) => void
    ): Promise<CitationTreeNode | null> {
        const progressTracker = {
            processed: 0,
            total: 0,
            estimate: (depth: number, maxRefs: number, maxDepth: number) => {
                let total = 0;
                for (let d = 0; d <= maxDepth; d++) {
                    total += Math.pow(maxRefs, d);
                }
                return total;
            }
        };

        const maxDepth = options.maxDepth || this.DEFAULT_MAX_DEPTH;
        const maxRefs = options.maxReferencesPerLevel || this.DEFAULT_MAX_REFS;
        progressTracker.total = progressTracker.estimate(0, maxRefs, maxDepth);

        const buildWithProgress = async (
            paperId: string,
            depth: number,
            visited: Set<string>
        ): Promise<CitationTreeNode | null> => {
            progressTracker.processed++;

            if (onProgress) {
                onProgress({
                    processed: progressTracker.processed,
                    total: progressTracker.total,
                    currentPaper: paperId
                });
            }

            return this.buildCitationTree(paperId, options, depth, visited);
        };

        return buildWithProgress(paperId, 0, new Set());
    }

    static getTreeStatistics(tree: CitationTreeNode): {
        totalNodes: number;
        maxDepth: number;
        averageReferences: number;
        totalCitations: number;
    } {
        const stats = {
            totalNodes: 0,
            maxDepth: 0,
            totalReferences: 0,
            totalCitations: 0
        };

        const traverse = (node: CitationTreeNode, depth: number) => {
            stats.totalNodes++;
            stats.maxDepth = Math.max(stats.maxDepth, depth);
            stats.totalReferences += node.references.length;
            stats.totalCitations += node.paper.citation_count || 0;

            node.references.forEach(ref => traverse(ref, depth + 1));
        };

        traverse(tree, 0);

        return {
            totalNodes: stats.totalNodes,
            maxDepth: stats.maxDepth,
            averageReferences: stats.totalNodes > 0 ? stats.totalReferences / stats.totalNodes : 0,
            totalCitations: stats.totalCitations
        };
    }

    static flattenTree(tree: CitationTreeNode): Array<{
        paperId: string;
        title: string;
        depth: number;
        parentId?: string;
        citationCount: number;
    }> {
        const flattened: any[] = [];

        const traverse = (node: CitationTreeNode, parentId?: string) => {
            flattened.push({
                paperId: node.paper.id,
                title: node.paper.title,
                depth: node.depth,
                parentId,
                citationCount: node.paper.citation_count || 0
            });

            node.references.forEach(ref =>
                traverse(ref, node.paper.id)
            );
        };

        traverse(tree);
        return flattened;
    }

    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private static countNodes(node: CitationTreeNode): number {
        return 1 + node.references.reduce((sum, ref) => sum + this.countNodes(ref), 0);
    }
}

export { CitationService, CitationTreeNode, CitationTreeOptions };