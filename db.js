import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Turso configuration
const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_AUTH_TOKEN = process.env.TURSO_DB_AUTH_TOKEN;

// Create Turso client or fallback to local SQLite
let db;
let isTurso = false;
let dbInitialized = false;
let initPromise = null;

// Initialize database connection (async to avoid top-level await issues)
async function initializeDb() {
	if (dbInitialized) return db;
	if (initPromise) return initPromise;
	
	initPromise = (async () => {
		try {
			if (TURSO_DB_URL && TURSO_DB_AUTH_TOKEN) {
				// Production: Use Turso
				db = createClient({
					url: TURSO_DB_URL,
					authToken: TURSO_DB_AUTH_TOKEN
				});
				isTurso = true;
				console.log('✅ Connected to Turso database');
			} else {
				// Development: Fallback to local SQLite if Turso not configured
				// On Vercel, we should always use Turso
				if (process.env.VERCEL === '1') {
					throw new Error('Turso configuration required on Vercel. Please set TURSO_DB_URL and TURSO_DB_AUTH_TOKEN environment variables.');
				}
				console.warn('⚠️  Turso not configured, falling back to local SQLite');
				const sqlite3Module = await import('sqlite3');
				const sqlite3 = sqlite3Module.default;
				const DB_PATH = path.join(__dirname, 'vendorshield.db');
				sqlite3.verbose();
				const { Database } = sqlite3;
				db = new Database(DB_PATH);
				isTurso = false;
				console.log('✅ Connected to local SQLite database');
			}
			dbInitialized = true;
			return db;
		} catch (error) {
			console.error('Database initialization error:', error);
			throw error;
		}
	})();
	
	return initPromise;
}

// Database helper functions (compatible with both Turso and sqlite3)
export async function run(sql, params = []) {
	await initializeDb();
	if (isTurso) {
		await db.execute(sql, params);
		return { lastID: 0, changes: 0 };
	} else {
		return new Promise((resolve, reject) => {
			db.run(sql, params, function (err) {
				if (err) return reject(err);
				resolve(this);
			});
		});
	}
}

export async function get(sql, params = []) {
	await initializeDb();
	if (isTurso) {
		const result = await db.execute(sql, params);
		// Convert Turso row objects to plain objects
		if (result.rows.length > 0) {
			const row = result.rows[0];
			const obj = {};
			for (const [key, value] of Object.entries(row)) {
				obj[key] = value;
			}
			return obj;
		}
		return null;
	} else {
		return new Promise((resolve, reject) => {
			db.get(sql, params, (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
	}
}

export async function all(sql, params = []) {
	await initializeDb();
	if (isTurso) {
		const result = await db.execute(sql, params);
		// Convert Turso row objects to plain objects
		return result.rows.map(row => {
			const obj = {};
			for (const [key, value] of Object.entries(row)) {
				obj[key] = value;
			}
			return obj;
		});
	} else {
		return new Promise((resolve, reject) => {
			db.all(sql, params, (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
	}
}

export async function initDb() {
	await initializeDb();
	await ensureUploadsDir();
	
	// PRAGMA is not supported in Turso, skip it
	if (!isTurso) {
		await run(`PRAGMA journal_mode = WAL;`);
	}
	
	await run(`CREATE TABLE IF NOT EXISTS suppliers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		contact_email TEXT,
		invite_token TEXT UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`);
	await run(`CREATE TABLE IF NOT EXISTS assessments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		supplier_id INTEGER NOT NULL,
		answers_json TEXT NOT NULL,
		proofs_json TEXT,
		score INTEGER NOT NULL,
		status TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
	);`);
	
	// Migration: Add validation columns if they don't exist
	await addColumnIfNotExists('assessments', 'validation_status', 'TEXT DEFAULT "PENDING"');
	await addColumnIfNotExists('assessments', 'validated_by', 'TEXT');
	await addColumnIfNotExists('assessments', 'validated_at', 'DATETIME');
	await addColumnIfNotExists('assessments', 'validation_comments', 'TEXT');
	await addColumnIfNotExists('assessments', 'manual_status_override', 'TEXT');
}

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
	try {
		await initializeDb();
		if (isTurso) {
			// For Turso, try to get table info using pragma_table_info
			const result = await db.execute(`SELECT name FROM pragma_table_info('${tableName}') WHERE name = ?`, [columnName]);
			const columnExists = result.rows.length > 0;
			if (!columnExists) {
				await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
			}
		} else {
			// For sqlite3, use PRAGMA
			const columns = await all(`PRAGMA table_info(${tableName})`);
			const columnExists = columns.some(col => col.name === columnName);
			if (!columnExists) {
				await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
			}
		}
	} catch (err) {
		// Column might already exist or table might not exist yet, ignore
		console.warn(`Warning: Could not check/add column ${columnName}:`, err.message);
	}
}

function ensureUploadsDir() {
	return new Promise((resolve, reject) => {
		// On Vercel, we don't need to create uploads dir (files stored in DB)
		if (process.env.VERCEL === '1') {
			return resolve();
		}
		const uploads = path.join(__dirname, 'uploads');
		fs.mkdir(uploads, { recursive: true }, (err) => {
			if (err) return reject(err);
			resolve();
		});
	});
}

// Export db for backward compatibility (but prefer using run/get/all functions)
// Note: db might not be initialized immediately, use initializeDb() first
export { db };
