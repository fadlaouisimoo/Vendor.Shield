import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDb, db } from './db.js';
import expressLayouts from 'express-ejs-layouts';
import { customAlphabet } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
// Default locals
app.use((req, res, next) => {
	res.locals.title = 'VendorShield';
	res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
	next();
});
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// File uploads
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, path.join(__dirname, 'uploads'));
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
		cb(null, uniqueSuffix + '-' + safeName);
	}
});
const upload = multer({ storage });

// Questionnaire definition (5 exigences clés)
const QUESTIONS = [
	{ id: 'av', text: "Antivirus à jour sur tous les postes", weight: 1 },
	{ id: 'mfa', text: "Authentification multi-facteurs activée pour les accès sensibles", weight: 2 },
	{ id: 'pra', text: "Plan de Reprise d'Activité (PRA) testé au moins annuellement", weight: 2 },
	{ id: 'patch', text: "Gestion de correctifs régulière (OS et applicatifs)", weight: 1 },
	{ id: 'backup', text: "Sauvegardes chiffrées et restaurations testées", weight: 2 }
];

const STATUS = {
	COMPLIANT: 'Conforme',
	NON_COMPLIANT: 'Non Conforme',
	IN_PROGRESS: 'En cours'
};

const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

// Score calculation: Yes=1, No=0, NA excluded. Weighted.
function calculateScore(answers) {
	let totalWeight = 0;
	let achieved = 0;
	for (const q of QUESTIONS) {
		const a = answers[q.id];
		if (a === 'na') continue;
		totalWeight += q.weight;
		if (a === 'yes') achieved += q.weight;
	}
	if (totalWeight === 0) return 0;
	return Math.round((achieved / totalWeight) * 100);
}

function deriveStatus(score) {
	if (score >= 80) return STATUS.COMPLIANT;
	if (score >= 50) return STATUS.IN_PROGRESS;
	return STATUS.NON_COMPLIANT;
}

// Routes
app.get('/', async (req, res) => {
	const suppliers = await dbAll(`
		SELECT s.id, s.name, s.contact_email, s.invite_token,
			COALESCE(a.score, 0) as score,
			COALESCE(a.status, 'En cours') as status
		FROM suppliers s
		LEFT JOIN (
			SELECT supplier_id, MAX(created_at) as latest
			FROM assessments
			GROUP BY supplier_id
		) latest ON latest.supplier_id = s.id
		LEFT JOIN assessments a ON a.supplier_id = s.id AND a.created_at = latest.latest
		ORDER BY s.created_at DESC;
	`);
	res.render('dashboard', { suppliers, STATUS });
});

app.get('/suppliers/new', (req, res) => {
	res.render('new_supplier');
});

app.post('/suppliers', async (req, res) => {
	const { name, contact_email } = req.body;
	const token = nanoid();
	await dbRun(`INSERT INTO suppliers (name, contact_email, invite_token) VALUES (?, ?, ?)`, [name, contact_email, token]);
	res.redirect('/');
});

app.get('/suppliers/:id', async (req, res) => {
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE id = ?`, [req.params.id]);
	if (!supplier) return res.status(404).send('Supplier not found');
	const assessments = await dbAll(`SELECT * FROM assessments WHERE supplier_id = ? ORDER BY created_at DESC`, [supplier.id]);
	res.render('supplier_detail', { supplier, assessments, QUESTIONS });
});

// Public invite link to fill assessment
app.get('/invite/:token', async (req, res) => {
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send('Lien invalide');
	res.redirect(`/assessment/${supplier.invite_token}`);
});

app.get('/assessment/:token', async (req, res) => {
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send('Lien invalide');
	res.render('assessment_form', { supplier, QUESTIONS });
});

app.post('/assessment/:token', upload.fields(QUESTIONS.map(q => ({ name: `${q.id}_file`, maxCount: 1 }))), async (req, res) => {
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send('Lien invalide');

	const answers = {};
	const proofs = {};
	for (const q of QUESTIONS) {
		answers[q.id] = req.body[q.id];
		const files = req.files?.[`${q.id}_file`];
		if (files && files[0]) {
			proofs[q.id] = `/uploads/${files[0].filename}`;
		}
	}

	const score = calculateScore(answers);
	const status = deriveStatus(score);

	await dbRun(
		`INSERT INTO assessments (supplier_id, answers_json, proofs_json, score, status) VALUES (?, ?, ?, ?, ?)`,
		[supplier.id, JSON.stringify(answers), JSON.stringify(proofs), score, status]
 	);

	res.render('assessment_success', { supplier, score, status });
});

// Helpers: promisified sqlite3
function dbRun(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) return reject(err);
			resolve(this);
		});
 	});
}

function dbGet(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, function (err, row) {
			if (err) return reject(err);
			resolve(row);
		});
 	});
}

function dbAll(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.all(sql, params, function (err, rows) {
			if (err) return reject(err);
			resolve(rows);
		});
 	});
}

// Start
await initDb();
app.listen(port, () => {
	console.log(`VendorShield running at http://localhost:${port}`);
});


