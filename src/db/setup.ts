import DatabaseService from './db';
import fs from 'fs';
import path from 'path';

const setupDatabase = async (): Promise<void> => {
    try {
        await DatabaseService.initialize();
        const schemaPath = path.join(__dirname, 'schema.sql');
        const sqlSchema = fs.readFileSync(schemaPath, 'utf-8');

        await DatabaseService.query(sqlSchema);
        await addBasicData();
    } catch (ex) {
        console.error('error setting up database:', ex);
        throw ex;
    }
}

const addBasicData = async (): Promise<void> => {
    try {
        const existingUser = await DatabaseService.query(
            'SELECT id FROM users WHERE email = $1',
            ['test@example.com']
        );

        if (existingUser.rows.length > 0) {
            console.log('test user already exists, skipping...');
            return;
        }

        const hashedPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

        const insertUserQuery = `
            INSERT INTO users (first_name, second_name, email, password) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, email, first_name, second_name, created_at
        `;

        const userResult = await DatabaseService.query(insertUserQuery, [
            'Test',
            'User',
            'test@example.com',
            hashedPassword
        ]);

        const insertPaperQuery = `
            INSERT INTO papers (id, title, abstract, authors, publication_date, citation_count, api_source, external_ids, meta_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, title
        `;

        const paperResult = await DatabaseService.query(insertPaperQuery, [
            'sample-paper-1',
            'A Comprehensive Study of Machine Learning in Academic Research',
            'This paper explores the applications of machine learning techniques in academic research discovery and analysis.',
            JSON.stringify([
                { name: 'John Doe', affiliation: 'MIT' },
                { name: 'Jane Smith', affiliation: 'Stanford' }
            ]),
            '2024-01-15',
            42,
            'semantic_scholar',
            JSON.stringify({ doi: '10.1000/sample', arxiv: 'cs.AI/2401.00001' }),
            JSON.stringify({ keywords: ['machine learning', 'academic research', 'discovery'] })
        ]);

        const insertSessionQuery = `
            INSERT INTO exploration_session (user_id, name, description, meta_data)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name
        `;

        const sessionResult = await DatabaseService.query(insertSessionQuery, [
            userResult.rows[0].id,
            'ML Research Exploration',
            'Exploring machine learning research papers',
            JSON.stringify({ tags: ['machine learning', 'AI'] })
        ]);

    } catch (ex) {
        console.error('error adding basic data:', ex);
        throw ex;
    }
}

const verifySetup = async (): Promise<void> => {
    try {
        const tables = await DatabaseService.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        const userCount = await DatabaseService.query('SELECT COUNT(*) FROM users');
        const paperCount = await DatabaseService.query('SELECT COUNT(*) FROM papers');
        const sessionCount = await DatabaseService.query('SELECT COUNT(*) FROM exploration_session');
    } catch (ex) {
        console.error('error verifying setup:', ex);
        throw ex;
    }
}

const main = async (): Promise<void> => {
    try {
        await setupDatabase();
        await verifySetup();
    } catch (ex) {
        console.error('database setup failed:', ex);
        process.exit(1);
    } finally {
        await DatabaseService.close();
    }
}

if (require.main === module) {
    main();
}

export { setupDatabase, addBasicData, verifySetup };