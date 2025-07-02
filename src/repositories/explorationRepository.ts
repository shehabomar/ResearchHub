import DatabaseService from '../db/db';

interface ExplorationSession {
    id: number;
    user_id: number;
    name: string;
    description?: string;
    meta_data: Record<string, any>;
    is_shared: boolean;
    created_at: Date;
    updated_at: Date;
}

interface ExplorationPath {
    id: number;
    session_id: number;
    parent_path_id: number;
    paper_id: string;
    depth: number;
    exploration_type: 'search' | 'citation' | 'reference' | 'author' | 'similar';
    path_meta_data: Record<string, any>;
    created_at: Date;
}

interface EnrichedExplorationPath extends ExplorationPath {
    paper_title?: string;
    paper_authors?: any[];
    citation_count?: number;
    children?: EnrichedExplorationPath[];
}

interface ExplorationFilters {
    userId?: number;
    sessionName?: string;
    isShared?: boolean;
    limit?: number;
    offset?: number;
}

class ExplorationRepository {
    private transformDbSession = (row: any): ExplorationSession => {
        return {
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            description: row.description,
            meta_data: typeof row.meta_data === 'string' ? JSON.parse(row.meta_data) : row.meta_data,
            is_shared: row.is_shared,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }

    createSessions = async (userId: number, name: string, description?: string, meta_data?: Record<string, any>): Promise<ExplorationSession> => {

        try {
            const query = `
                insert into exploration_session (user_id, name, description, meta_data, is_shared)
                values
                ($1, $2, $3, $4, $5)
                returning *;
            `;

            const values = [
                userId,
                name.trim(),
                description?.trim() || null,
                JSON.stringify(meta_data || {}),
                false
            ];

            const results = await DatabaseService.query(query, values);
            const data = this.transformDbSession(results.rows[0]);
            console.log('created exploration session: ', data);
            return data;
        }
        catch (ex) {
            console.log('error creating an exploration session', ex);
            throw new Error('failed to create session');
        }
    }

    getUserSessions = async (userId: number, filters?: ExplorationFilters): Promise<{ sessions: ExplorationSession[]; total: number }> => {
        try {
            let whereConditions = ['user_id = $1'];
            let queryParams: any[] = [userId];
            let paramsCount = 1;

            if (filters?.sessionName) {
                paramsCount++;
                whereConditions.push(`name ilike $${paramsCount}`);
                queryParams.push(filters.sessionName);
            }

            if (filters?.isShared !== undefined) {
                paramsCount++;
                whereConditions.push(`is_shared = $${paramsCount}`);
                queryParams.push(filters.isShared);
            }

            const queryWhere = whereConditions.join(' and ');
            const limit = filters?.limit || 20;
            const offset = filters?.offset || 0;

            const countQuery = `select count(*) as total from exploration_session where ${queryWhere}`;
            const dataQuery = `
                select * 
                from exploration_session
                where ${queryWhere}
                order by updated_at desc, created_at desc
                limit $${paramsCount + 1} 
                offset $${paramsCount + 2};
            `;

            const [countRes, dataRes] = await Promise.all([
                DatabaseService.query(countQuery, queryParams),
                DatabaseService.query(dataQuery, [...queryParams, limit, offset])
            ]);

            const total = parseInt(countRes.rows[0].total);
            const sessions = dataRes.rows.map((row: any) => this.transformDbSession(row));
            console.log('found sessions: ', sessions.length);

            return { sessions, total };
        }
        catch (ex) {
            console.log('erro trying to getUserSessions', ex);
            throw new Error('faild to get user sessions');
        }
    }

    getSessionById = async (sessionId: number, userId: number): Promise<ExplorationSession | null> => {
        try {
            const query = `
                select * from exploration_session
                where id = $1 and (user_id = $2 or is_shared = true);
            `;
            const result = await DatabaseService(query, [sessionId, userId]);
            if (result.rows.length == 0) {
                return null;
            }

            return this.transformDbSession(result.rows[0]);
        }
        catch (ex) {
            console.log('erro trying to getSessionById', ex);
            throw new Error('faild to getSessionById');
        }
    }

    updateSession = async (sessionId: number, userId: number, updates: {
        name?: string,
        description?: string,
        meta_data?: Record<string, any>,
        isShared: boolean
    }): Promise<ExplorationSession> => {
        try {
            const setParams: string[] = ['updated_at = now()'];
            const queryParams: any[] = [];
            let paramsCount = 0;

            if (updates.name) {
                paramsCount++;
                setParams.push(`name = $${paramsCount}`);
                queryParams.push(updates.name);
            }

            if (updates.description !== undefined) {
                paramsCount++;
                setParams.push(`description = $${paramsCount}`);
                queryParams.push(updates.description);
            }

            if (updates.isShared !== undefined) {
                paramsCount++;
                setParams.push(`is_shared = $${paramsCount}`);
                queryParams.push(updates.isShared);
            }

            if (updates.meta_data) {
                paramsCount++;
                setParams.push(`meta_data = $${paramsCount}`);
                queryParams.push(JSON.stringify(updates.meta_data));
            }

            const query = `
                update exploration_session 
                set ${setParams.join(' , ')}
                where id = $${paramsCount + 1} and user_id = $${paramsCount + 2}
                returning *
            `;

            const result = await DatabaseService.query(query, [...queryParams, sessionId, userId]);
            if (result.rows.length == 0) {
                throw new Error('session not found or access denied');
            }

            const session = this.transformDbSession(result.rows[0]);
            return session;
        }
        catch (ex) {
            console.log('erro trying to updateSession', ex);
            throw new Error('faild to updateSession');
        }
    }


}
