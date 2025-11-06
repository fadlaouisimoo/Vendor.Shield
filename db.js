import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'vendorshield.db');

sqlite3.verbose();
export const db = new sqlite3.Database(DB_PATH);

export async function initDb() {
	await ensureUploadsDir();
	await run(`PRAGMA journal_mode = WAL;`);
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
}

function ensureUploadsDir() {
	return new Promise((resolve, reject) => {
		const uploads = path.join(__dirname, 'uploads');
		fs.mkdir(uploads, { recursive: true }, (err) => {
			if (err) return reject(err);
			resolve();
		});
	});
}

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve(this);
		});
	});
}


