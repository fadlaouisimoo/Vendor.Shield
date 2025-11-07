import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDb, db } from './db.js';
import expressLayouts from 'express-ejs-layouts';
import { customAlphabet } from 'nanoid';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load translations
const translations = {
	fr: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'fr.json'), 'utf8')),
	en: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en.json'), 'utf8'))
};

// Translation helper
function t(lang, key) {
	const keys = key.split('.');
	let value = translations[lang] || translations.fr;
	for (const k of keys) {
		value = value?.[k];
	}
	return value || key;
}

const app = express();
const port = process.env.PORT || 3000;

// Admin credentials (should be in environment variables in production)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Session configuration
app.use(session({
	secret: process.env.SESSION_SECRET || 'vendorshield-secret-key-change-in-production',
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: process.env.NODE_ENV === 'production', // HTTPS only in production
		httpOnly: true,
		maxAge: 24 * 60 * 60 * 1000 // 24 hours
	}
}));

// Cookie parser must be before language middleware
app.use(cookieParser());

// Language detection middleware
app.use((req, res, next) => {
	// Check query param, cookie, or Accept-Language header
	const langParam = req.query.lang;
	const langCookie = req.cookies?.lang;
	const acceptLang = req.get('accept-language')?.split(',')[0]?.split('-')[0] || 'fr';
	
	let lang = langParam || langCookie || (acceptLang === 'en' ? 'en' : 'fr');
	if (!['fr', 'en'].includes(lang)) lang = 'fr';
	
	res.locals.lang = lang;
	res.locals.t = (key) => t(lang, key);
	res.locals.title = 'VendorShield';
	res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
	
	// Helper function to generate URLs with language parameter
	res.locals.urlWithLang = (path) => {
		const separator = path.includes('?') ? '&' : '?';
		return `${path}${separator}lang=${lang}`;
	};
	
	// Always set/update cookie to preserve language preference
	res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
	
	next();
});

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Authentication middleware
const requireAuth = (req, res, next) => {
	if (req.session && req.session.isAuthenticated) {
		return next();
	}
	// Store the original URL to redirect after login
	req.session.returnTo = req.originalUrl;
	const lang = res.locals.lang || 'fr';
	res.redirect(`/login?lang=${lang}`);
};

// Make session available in views
app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session && req.session.isAuthenticated;
	next();
});

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
const QUESTIONS_FR = [
	{ id: 'av', text: "Antivirus à jour sur tous les postes", weight: 1 },
	{ id: 'mfa', text: "Authentification multi-facteurs activée pour les accès sensibles", weight: 2 },
	{ id: 'pra', text: "Plan de Reprise d'Activité (PRA) testé au moins annuellement", weight: 2 },
	{ id: 'patch', text: "Gestion de correctifs régulière (OS et applicatifs)", weight: 1 },
	{ id: 'backup', text: "Sauvegardes chiffrées et restaurations testées", weight: 2 }
];

const QUESTIONS_EN = [
	{ id: 'av', text: "Antivirus up to date on all workstations", weight: 1 },
	{ id: 'mfa', text: "Multi-factor authentication enabled for sensitive access", weight: 2 },
	{ id: 'pra', text: "Business Continuity Plan (BCP) tested at least annually", weight: 2 },
	{ id: 'patch', text: "Regular patch management (OS and applications)", weight: 1 },
	{ id: 'backup', text: "Encrypted backups and tested restorations", weight: 2 }
];

function getQuestions(lang) {
	return lang === 'en' ? QUESTIONS_EN : QUESTIONS_FR;
}

const STATUS = {
	COMPLIANT: { fr: 'Conforme', en: 'Compliant' },
	NON_COMPLIANT: { fr: 'Non Conforme', en: 'Non-Compliant' },
	IN_PROGRESS: { fr: 'En cours', en: 'In Progress' }
};

function getStatus(statusKey, lang) {
	return STATUS[statusKey]?.[lang] || STATUS[statusKey]?.fr;
}

const nanoid = customAlphabet('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', 12);

// Score calculation: Yes=1, No=0, NA excluded. Weighted.
function calculateScore(answers, questions) {
	let totalWeight = 0;
	let achieved = 0;
	for (const q of questions) {
		const a = answers[q.id];
		if (a === 'na') continue;
		totalWeight += q.weight;
		if (a === 'yes') achieved += q.weight;
	}
	if (totalWeight === 0) return 0;
	return Math.round((achieved / totalWeight) * 100);
}

function deriveStatus(score) {
	if (score >= 80) return 'COMPLIANT';
	if (score >= 50) return 'IN_PROGRESS';
	return 'NON_COMPLIANT';
}

// Routes

// Public routes (no authentication required)
app.get('/', (req, res) => {
	const lang = res.locals.lang;
	res.render('landing', { layout: 'public_layout', lang, urlWithLang: res.locals.urlWithLang });
});

// Login routes
app.get('/login', (req, res) => {
	const lang = res.locals.lang;
	res.render('login', { layout: 'public_layout', lang, urlWithLang: res.locals.urlWithLang });
});

app.post('/login', (req, res) => {
	const lang = res.locals.lang;
	const { username, password } = req.body;
	
	if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
		req.session.isAuthenticated = true;
		req.session.username = username;
		// Redirect to returnTo URL or admin dashboard
		const returnTo = req.session.returnTo || '/admin';
		delete req.session.returnTo;
		const separator = returnTo.includes('?') ? '&' : '?';
		res.redirect(`${returnTo}${separator}lang=${lang}`);
	} else {
		res.render('login', { 
			layout: 'public_layout', 
			lang, 
			urlWithLang: res.locals.urlWithLang,
			error: t(lang, 'auth.invalidCredentials')
		});
	}
});

app.get('/logout', (req, res) => {
	const lang = res.locals.lang;
	req.session.destroy((err) => {
		if (err) {
			console.error('Error destroying session:', err);
		}
		res.redirect(`/?lang=${lang}`);
	});
});

// Protected admin routes (require authentication)
app.get('/admin', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const suppliers = await dbAll(`
		SELECT s.id, s.name, s.contact_email, s.invite_token,
			COALESCE(a.score, 0) as score,
			COALESCE(a.status, 'IN_PROGRESS') as status
		FROM suppliers s
		LEFT JOIN (
			SELECT supplier_id, MAX(created_at) as latest
			FROM assessments
			GROUP BY supplier_id
		) latest ON latest.supplier_id = s.id
		LEFT JOIN assessments a ON a.supplier_id = s.id AND a.created_at = latest.latest
		ORDER BY s.created_at DESC;
	`);
	// Map status - keep original status key for badge determination, add translated text
	const suppliersWithStatus = suppliers.map(s => {
		// Status in DB is a key (COMPLIANT, IN_PROGRESS, NON_COMPLIANT) or might be old translated text
		const statusKey = ['COMPLIANT', 'IN_PROGRESS', 'NON_COMPLIANT'].includes(s.status) 
			? s.status 
			: (s.status === 'Conforme' || s.status === 'Compliant' ? 'COMPLIANT' 
				: (s.status === 'En cours' || s.status === 'In Progress' ? 'IN_PROGRESS' : 'NON_COMPLIANT'));
		return {
			...s,
			statusKey: statusKey,
			status: getStatus(statusKey, lang)
		};
	});
	res.render('dashboard', { suppliers: suppliersWithStatus, STATUS, getStatus, lang, urlWithLang: res.locals.urlWithLang });
});

app.get('/supplier-space', (req, res) => {
	const lang = res.locals.lang;
	res.render('supplier_portal', { layout: 'public_layout', lang, urlWithLang: res.locals.urlWithLang });
});

app.post('/supplier-space', async (req, res) => {
	const lang = res.locals.lang;
	const { name, contact_email } = req.body;
	if (!name || !contact_email) {
		return res.status(400).send(lang === 'en' ? 'Name and contact email are required.' : 'Le nom et l’email de contact sont requis.');
	}
	const token = nanoid();
	await dbRun(`INSERT INTO suppliers (name, contact_email, invite_token) VALUES (?, ?, ?)`, [name, contact_email, token]);
	res.redirect(`/assessment/${token}?lang=${lang}`);
});

app.get('/suppliers/new', requireAuth, (req, res) => {
	res.render('new_supplier', { urlWithLang: res.locals.urlWithLang });
});

app.post('/suppliers', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const { name, contact_email } = req.body;
	const token = nanoid();
	await dbRun(`INSERT INTO suppliers (name, contact_email, invite_token) VALUES (?, ?, ?)`, [name, contact_email, token]);
	res.redirect(`/admin?lang=${lang}`);
});

app.get('/suppliers/:id', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE id = ?`, [req.params.id]);
	if (!supplier) return res.status(404).send('Supplier not found');
	const assessments = await dbAll(`SELECT * FROM assessments WHERE supplier_id = ? ORDER BY created_at DESC`, [supplier.id]);
	const questions = getQuestions(lang);
	// Map status in assessments - keep original status key for badge determination, add translated text
	const assessmentsWithStatus = assessments.map(a => {
		// Status in DB is a key (COMPLIANT, IN_PROGRESS, NON_COMPLIANT) or might be old translated text
		const statusKey = ['COMPLIANT', 'IN_PROGRESS', 'NON_COMPLIANT'].includes(a.status) 
			? a.status 
			: (a.status === 'Conforme' || a.status === 'Compliant' ? 'COMPLIANT' 
				: (a.status === 'En cours' || a.status === 'In Progress' ? 'IN_PROGRESS' : 'NON_COMPLIANT'));
		return {
			...a,
			statusKey: statusKey,
			status: getStatus(statusKey, lang)
		};
	});
	res.render('supplier_detail', { supplier, assessments: assessmentsWithStatus, QUESTIONS: questions, lang, getStatus, urlWithLang: res.locals.urlWithLang });
});

app.post('/suppliers/:id/delete', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE id = ?`, [req.params.id]);
	if (!supplier) return res.status(404).send('Supplier not found');
	// Supprimer d'abord les évaluations (cascade)
	await dbRun(`DELETE FROM assessments WHERE supplier_id = ?`, [req.params.id]);
	// Puis le fournisseur
	await dbRun(`DELETE FROM suppliers WHERE id = ?`, [req.params.id]);
	res.redirect(`/admin?lang=${lang}`);
});

// Public invite link to fill assessment
app.get('/invite/:token', async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send(lang === 'en' ? 'Invalid link' : 'Lien invalide');
	res.redirect(`/assessment/${supplier.invite_token}?lang=${lang}`);
});

app.get('/assessment/:token', async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send(lang === 'en' ? 'Invalid link' : 'Lien invalide');
	const questions = getQuestions(lang);
	res.render('assessment_form', { layout: 'public_layout', supplier, QUESTIONS: questions, lang, urlWithLang: res.locals.urlWithLang });
});

app.get('/assessment/:token/success', async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send(lang === 'en' ? 'Invalid link' : 'Lien invalide');
	const rawScore = Number(req.query.score);
	const score = Number.isFinite(rawScore) ? Math.min(Math.max(Math.round(rawScore), 0), 100) : null;
	const statusQuery = (req.query.status || '').toString().toUpperCase();
	const allowedStatuses = ['COMPLIANT', 'IN_PROGRESS', 'NON_COMPLIANT'];
	const statusKey = allowedStatuses.includes(statusQuery) ? statusQuery : null;

	if (score === null || statusKey === null) {
		return res.redirect(`/assessment/${supplier.invite_token}?lang=${lang}`);
	}

	const statusText = getStatus(statusKey, lang);
	res.render('assessment_success', { layout: 'public_layout', score, statusKey, statusText, lang, getStatus, urlWithLang: res.locals.urlWithLang });
});

app.post('/assessment/:token', upload.fields([...QUESTIONS_FR, ...QUESTIONS_EN].map(q => ({ name: `${q.id}_file`, maxCount: 1 }))), async (req, res) => {
	// Get language from body (form), query, or cookie
	const langParam = req.body.lang || req.query.lang;
	const lang = langParam || res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send(lang === 'en' ? 'Invalid link' : 'Lien invalide');

	const questions = getQuestions(lang);
	const answers = {};
	const proofs = {};
	for (const q of questions) {
		answers[q.id] = req.body[q.id];
		const files = req.files?.[`${q.id}_file`];
		if (files && files[0]) {
			proofs[q.id] = `/uploads/${files[0].filename}`;
		}
	}

	const score = calculateScore(answers, questions);
	const statusKey = deriveStatus(score);
	const statusText = getStatus(statusKey, lang);

	await dbRun(
		`INSERT INTO assessments (supplier_id, answers_json, proofs_json, score, status) VALUES (?, ?, ?, ?, ?)`,
		[supplier.id, JSON.stringify(answers), JSON.stringify(proofs), score, statusKey]
 	);

	// Update cookie with language from form if provided
	if (langParam) {
		res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
	}
	
	const redirectUrl = `/assessment/${supplier.invite_token}/success?score=${encodeURIComponent(score)}&status=${encodeURIComponent(statusKey)}&lang=${lang}`;
	res.redirect(redirectUrl);
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


