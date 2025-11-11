import 'dotenv/config';
import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initDb, db, run as dbRun, get as dbGet, all as dbAll } from './db.js';
import expressLayouts from 'express-ejs-layouts';
import { customAlphabet } from 'nanoid';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import crypto from 'crypto';
import { sendAssessmentNotification, testEmailConfig } from './email.js';
import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection (must be defined early)
const isVercelEnv = process.env.VERCEL === '1';

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
const SESSION_SECRET = process.env.SESSION_SECRET || 'vendorshield-secret-key-change-in-production';

// Helper function to create signed auth token (for Vercel compatibility)
function createAuthToken(username) {
	const timestamp = Date.now();
	const data = `${username}:${timestamp}`;
	const hash = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
	return `${data}:${hash}`;
}

// Helper function to verify auth token
function verifyAuthToken(token) {
	if (!token) return null;
	const parts = token.split(':');
	if (parts.length !== 3) return null;
	const [username, timestamp, hash] = parts;
	const expectedHash = crypto.createHmac('sha256', SESSION_SECRET).update(`${username}:${timestamp}`).digest('hex');
	if (hash !== expectedHash) return null;
	// Check if token is not too old (24 hours)
	const age = Date.now() - parseInt(timestamp);
	if (age > 24 * 60 * 60 * 1000) return null;
	return username;
}

// Views & static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Session configuration
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const isVercel = process.env.VERCEL === '1';

const sessionConfig = {
	secret: process.env.SESSION_SECRET || 'vendorshield-secret-key-change-in-production',
	name: 'vendorshield.sid', // Explicit session cookie name
	resave: true, // Changed to true for Vercel (helps with serverless)
	saveUninitialized: false,
	cookie: {
		secure: isProduction, // HTTPS only in production/Vercel
		httpOnly: true,
		maxAge: 24 * 60 * 60 * 1000, // 24 hours
		sameSite: isVercel ? 'none' : 'lax', // Required for Vercel (cross-origin)
		domain: undefined // Let browser set domain automatically
	}
};

if (isVercel) {
	console.log('Session config for Vercel:', {
		secure: sessionConfig.cookie.secure,
		sameSite: sessionConfig.cookie.sameSite,
		hasSecret: !!sessionConfig.secret
	});
}

app.use(session(sessionConfig));

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
// Only serve /uploads on local (not Vercel)
if (!isVercelEnv) {
	app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize database early (non-blocking)
let serverInitialized = false;
let initPromise = null;

async function initializeServer() {
	if (serverInitialized) return;
	if (initPromise) return initPromise;
	
	initPromise = (async () => {
		try {
			await initDb();
			console.log('✅ Database initialized');
			
			// Test email configuration on startup (non-blocking)
			testEmailConfig().catch(err => {
				console.warn('⚠️  Email configuration test failed (emails may not work):', err.message);
			});
			
			serverInitialized = true;
		} catch (error) {
			console.error('❌ Failed to initialize server:', error);
			throw error;
		}
	})();
	
	return initPromise;
}

// Start initialization (non-blocking)
initializeServer().catch(err => {
	console.error('Initialization error:', err);
});

// Middleware to ensure database is initialized before handling requests
app.use(async (req, res, next) => {
	try {
		await initializeServer();
		next();
	} catch (error) {
		console.error('Database initialization error:', error);
		res.status(500).send('Server initialization error. Please check logs.');
	}
});

// Authentication middleware (supports both session and cookie-based auth for Vercel)
const requireAuth = (req, res, next) => {
	// Check session-based auth (for local development)
	if (req.session && req.session.isAuthenticated) {
		return next();
	}
	
	// Check cookie-based auth (for Vercel/serverless)
	const authCookie = req.cookies?.auth_token;
	if (authCookie) {
		const username = verifyAuthToken(authCookie);
		if (username === ADMIN_USERNAME) {
			req.isAuthenticated = true;
			req.authenticatedUsername = username;
			return next();
		}
	}
	
	// Not authenticated - redirect to login
	const lang = res.locals.lang || 'fr';
	if (req.session) {
		req.session.returnTo = req.originalUrl;
	}
	res.redirect(`/login?lang=${lang}`);
};

// Make authentication status available in views
app.use((req, res, next) => {
	// Check both session and cookie auth
	const sessionAuth = req.session && req.session.isAuthenticated;
	const cookieAuth = req.cookies?.auth_token && verifyAuthToken(req.cookies.auth_token) === ADMIN_USERNAME;
	res.locals.isAuthenticated = sessionAuth || cookieAuth;
	next();
});

// File uploads
// Priority: Cloudinary > Local disk storage
const useCloudinary = isCloudinaryConfigured();

let upload;
if (useCloudinary) {
	// Use Cloudinary: Store files in memory, then upload to Cloudinary
	upload = multer({ 
		storage: multer.memoryStorage(),
		limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
	});
	console.log('✅ Using Cloudinary for file storage');
} else if (isVercelEnv) {
	// Vercel without Cloudinary: Store files in memory, then save to database as base64 (fallback)
	upload = multer({ 
		storage: multer.memoryStorage(),
		limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
	});
	console.warn('⚠️  Cloudinary not configured. Using base64 storage (not recommended for production)');
} else {
	// Local: Store files on disk
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
	upload = multer({ storage });
	console.log('✅ Using local disk storage');
}

// Questionnaire definition (9 questions organisées en 5 sections)
const QUESTIONS_FR = [
	// Section 1 : Authentification et Contrôle d'accès
	{ id: 'mfa', section: 1, sectionTitle: "Authentification et Contrôle d'accès", text: "Votre organisation utilise-t-elle l'authentification multi-facteurs (MFA) pour tous les comptes accédant aux systèmes de l'entreprise ?", weight: 2 },
	{ id: 'iam', section: 1, sectionTitle: "Authentification et Contrôle d'accès", text: "Disposez-vous d'un système de gestion des identités (IAM) pour contrôler les droits d'accès des utilisateurs ?", weight: 2 },
	{ id: 'account_deactivation', section: 1, sectionTitle: "Authentification et Contrôle d'accès", text: "Les comptes utilisateurs sont-ils désactivés immédiatement après le départ d'un collaborateur ?", weight: 1 },
	
	// Section 2 : Sécurité des postes et serveurs
	{ id: 'av_edr', section: 2, sectionTitle: "Sécurité des postes et serveurs", text: "Tous vos postes de travail et serveurs disposent-ils d'un antivirus ou EDR à jour ?", weight: 2 },
	{ id: 'patches', section: 2, sectionTitle: "Sécurité des postes et serveurs", text: "Les mises à jour de sécurité (patchs) sont-elles appliquées régulièrement ?", weight: 2 },
	
	// Section 3 : Segmentation et isolation des environnements
	{ id: 'network_segmentation', section: 3, sectionTitle: "Segmentation et isolation des environnements", text: "Votre réseau interne est-il segmenté pour isoler les environnements critiques ?", weight: 2 },
	{ id: 'monitoring', section: 3, sectionTitle: "Segmentation et isolation des environnements", text: "Disposez-vous de mécanismes de supervision pour surveiller les accès et les flux réseau vers le client ?", weight: 2 },
	
	// Section 4 : Plan de Reprise d'Activité (PRA) et Continuité
	{ id: 'pra', section: 4, sectionTitle: "Plan de Reprise d'Activité (PRA) et Continuité", text: "Disposez-vous d'un PRA documenté et validé par la direction ?", weight: 2 },
	
	// Section 5 : Surveillance, conformité et reporting
	{ id: 'siem', section: 5, sectionTitle: "Surveillance, conformité et reporting", text: "Disposez-vous d'un système centralisé de journalisation (SIEM) pour collecter et analyser les logs de sécurité ?", weight: 2 }
];

const QUESTIONS_EN = [
	// Section 1 : Authentication and Access Control
	{ id: 'mfa', section: 1, sectionTitle: "Authentication and Access Control", text: "Does your organization use multi-factor authentication (MFA) for all accounts accessing company systems?", weight: 2 },
	{ id: 'iam', section: 1, sectionTitle: "Authentication and Access Control", text: "Do you have an Identity and Access Management (IAM) system to control user access rights?", weight: 2 },
	{ id: 'account_deactivation', section: 1, sectionTitle: "Authentication and Access Control", text: "Are user accounts deactivated immediately after an employee leaves?", weight: 1 },
	
	// Section 2 : Workstation and Server Security
	{ id: 'av_edr', section: 2, sectionTitle: "Workstation and Server Security", text: "Do all your workstations and servers have up-to-date antivirus or EDR?", weight: 2 },
	{ id: 'patches', section: 2, sectionTitle: "Workstation and Server Security", text: "Are security updates (patches) applied regularly?", weight: 2 },
	
	// Section 3 : Segmentation and Environment Isolation
	{ id: 'network_segmentation', section: 3, sectionTitle: "Segmentation and Environment Isolation", text: "Is your internal network segmented to isolate critical environments?", weight: 2 },
	{ id: 'monitoring', section: 3, sectionTitle: "Segmentation and Environment Isolation", text: "Do you have monitoring mechanisms to supervise access and network flows to the client?", weight: 2 },
	
	// Section 4 : Business Continuity Plan (BCP) and Continuity
	{ id: 'pra', section: 4, sectionTitle: "Business Continuity Plan (BCP) and Continuity", text: "Do you have a documented and management-approved Business Continuity Plan (BCP)?", weight: 2 },
	
	// Section 5 : Monitoring, Compliance and Reporting
	{ id: 'siem', section: 5, sectionTitle: "Monitoring, Compliance and Reporting", text: "Do you have a centralized logging system (SIEM) to collect and analyze security logs?", weight: 2 }
];

function getQuestions(lang) {
	return lang === 'en' ? QUESTIONS_EN : QUESTIONS_FR;
}

const STATUS = {
	COMPLIANT: { fr: 'Conforme', en: 'Compliant' },
	NON_COMPLIANT: { fr: 'Non Conforme', en: 'Non-Compliant' },
	IN_PROGRESS: { fr: 'En cours', en: 'In Progress' }
};

const VALIDATION_STATUS = {
	PENDING: { fr: 'En attente de validation', en: 'Pending validation' },
	APPROVED: { fr: 'Approuvé', en: 'Approved' },
	REJECTED: { fr: 'Rejeté', en: 'Rejected' },
	NEEDS_CLARIFICATION: { fr: 'Clarifications demandées', en: 'Needs clarification' }
};

function getStatus(statusKey, lang) {
	return STATUS[statusKey]?.[lang] || STATUS[statusKey]?.fr;
}

function getValidationStatus(statusKey, lang) {
	return VALIDATION_STATUS[statusKey]?.[lang] || VALIDATION_STATUS[statusKey]?.fr || statusKey;
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
		// Set session-based auth (for local development)
		if (req.session) {
			req.session.isAuthenticated = true;
			req.session.username = username;
		}
		
		// Set cookie-based auth (for Vercel/serverless - more reliable)
		const authToken = createAuthToken(username);
		const isVercel = process.env.VERCEL === '1';
		const isProduction = process.env.NODE_ENV === 'production' || isVercel;
		
		res.cookie('auth_token', authToken, {
			secure: isProduction,
			httpOnly: true,
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
			sameSite: isVercel ? 'none' : 'lax',
			path: '/'
		});
		
		// Redirect to returnTo URL or admin dashboard
		const returnTo = (req.session && req.session.returnTo) || '/admin';
		if (req.session) {
			delete req.session.returnTo;
		}
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
	
	// Destroy session
	if (req.session) {
		req.session.destroy((err) => {
			if (err) {
				console.error('Error destroying session:', err);
			}
		});
	}
	
	// Clear auth cookie (for Vercel)
	const isVercel = process.env.VERCEL === '1';
	const isProduction = process.env.NODE_ENV === 'production' || isVercel;
	res.clearCookie('auth_token', {
		secure: isProduction,
		httpOnly: true,
		sameSite: isVercel ? 'none' : 'lax',
		path: '/'
	});
	
	res.redirect(`/?lang=${lang}`);
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
	// Count pending assessments
	const pendingCountResult = await dbGet(`SELECT COUNT(*) as count FROM assessments WHERE validation_status = 'PENDING' OR validation_status IS NULL`);
	const pendingCount = pendingCountResult?.count || 0;
	
	// Calculate average compliance time (délai moyen de mise en conformité)
	// For each supplier that became COMPLIANT, calculate time from first assessment to compliance
	// Get all assessments ordered by date for each supplier
	const allAssessments = await dbAll(`
		SELECT supplier_id, created_at, validated_at, status
		FROM assessments
		ORDER BY supplier_id, created_at ASC
	`);
	
	// Group by supplier and find first assessment date and compliance date
	const supplierComplianceData = {};
	for (const assessment of allAssessments) {
		const supplierId = assessment.supplier_id;
		if (!supplierComplianceData[supplierId]) {
			supplierComplianceData[supplierId] = {
				firstAssessmentDate: assessment.created_at,
				complianceDate: null
			};
		}
		// If this assessment is COMPLIANT and we don't have a compliance date yet, use it
		if (assessment.status === 'COMPLIANT' && !supplierComplianceData[supplierId].complianceDate) {
			supplierComplianceData[supplierId].complianceDate = assessment.validated_at || assessment.created_at;
		}
	}
	
	// Calculate average days
	let averageComplianceDays = 0;
	let totalDays = 0;
	let validCount = 0;
	
	for (const supplierId in supplierComplianceData) {
		const data = supplierComplianceData[supplierId];
		if (data.firstAssessmentDate && data.complianceDate) {
			const firstDate = new Date(data.firstAssessmentDate);
			const compDate = new Date(data.complianceDate);
			if (compDate >= firstDate) {
				const diffTime = compDate - firstDate;
				const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
				totalDays += diffDays;
				validCount++;
			}
		}
	}
	
	if (validCount > 0) {
		averageComplianceDays = Math.round(totalDays / validCount);
	}
	
	// Calculate KPI data for charts
	const totalSuppliers = suppliersWithStatus.length;
	const compliantCount = suppliersWithStatus.filter(s => s.statusKey === 'COMPLIANT').length;
	const inProgressCount = suppliersWithStatus.filter(s => s.statusKey === 'IN_PROGRESS').length;
	const nonCompliantCount = suppliersWithStatus.filter(s => s.statusKey === 'NON_COMPLIANT').length;
	const compliantPercentage = totalSuppliers > 0 ? Math.round((compliantCount / totalSuppliers) * 100) : 0;
	
	// Check if notification has been marked as read
	// Compare the current pending count with the count when it was marked as read
	// If current count is greater than last read count, show notification (new assessments arrived)
	const lastReadPendingCount = req.session.lastReadPendingCount || 0;
	const notificationRead = (pendingCount <= lastReadPendingCount) || (pendingCount === 0);
	
	res.render('dashboard', { 
		suppliers: suppliersWithStatus, 
		STATUS, 
		VALIDATION_STATUS,
		getStatus, 
		getValidationStatus,
		pendingCount: pendingCount,
		notificationRead: notificationRead,
		averageComplianceDays: averageComplianceDays,
		// Chart data
		totalSuppliers: totalSuppliers,
		compliantCount: compliantCount,
		inProgressCount: inProgressCount,
		nonCompliantCount: nonCompliantCount,
		compliantPercentage: compliantPercentage,
		lang, 
		urlWithLang: res.locals.urlWithLang
	});
});

// Route to mark notification as read
app.post('/admin/notification/mark-read', requireAuth, async (req, res) => {
	// Store the current pending count when marking as read
	const pendingCountResult = await dbGet(`SELECT COUNT(*) as count FROM assessments WHERE validation_status = 'PENDING' OR validation_status IS NULL`);
	const pendingCount = pendingCountResult?.count || 0;
	req.session.lastReadPendingCount = pendingCount;
	res.json({ success: true });
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
	res.render('supplier_detail', { 
		supplier, 
		assessments: assessmentsWithStatus, 
		QUESTIONS: questions, 
		STATUS,
		VALIDATION_STATUS,
		getStatus, 
		getValidationStatus,
		lang, 
		urlWithLang: res.locals.urlWithLang 
	});
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

// Validation routes
app.post('/assessments/:id/approve', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const { comments, manual_status } = req.body;
	const assessment = await dbGet(`SELECT * FROM assessments WHERE id = ?`, [req.params.id]);
	if (!assessment) return res.status(404).send('Assessment not found');
	
	const finalStatus = manual_status && ['COMPLIANT', 'IN_PROGRESS', 'NON_COMPLIANT'].includes(manual_status) 
		? manual_status 
		: assessment.status;
	
	await dbRun(
		`UPDATE assessments 
		 SET validation_status = 'APPROVED', 
		     validated_by = ?, 
		     validated_at = CURRENT_TIMESTAMP,
		     validation_comments = ?,
		     status = ?,
		     manual_status_override = ?
		 WHERE id = ?`,
		[req.session.username || 'admin', comments || null, finalStatus, manual_status || null, req.params.id]
	);
	
	// Récupérer l'évaluation mise à jour et le fournisseur
	const updatedAssessment = await dbGet(`SELECT * FROM assessments WHERE id = ?`, [req.params.id]);
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE id = ?`, [assessment.supplier_id]);
	
	// Envoyer l'email de notification
	if (supplier && supplier.contact_email) {
		await sendAssessmentNotification(supplier, updatedAssessment, 'APPROVED', lang);
	}
	
	res.redirect(`/suppliers/${supplier.id}?lang=${lang}`);
});

app.post('/assessments/:id/reject', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const { comments } = req.body;
	if (!comments || comments.trim() === '') {
		return res.status(400).send(lang === 'en' ? 'Comments are required for rejection' : 'Les commentaires sont requis pour le rejet');
	}
	
	const assessment = await dbGet(`SELECT * FROM assessments WHERE id = ?`, [req.params.id]);
	if (!assessment) return res.status(404).send('Assessment not found');
	
	await dbRun(
		`UPDATE assessments 
		 SET validation_status = 'REJECTED', 
		     validated_by = ?, 
		     validated_at = CURRENT_TIMESTAMP,
		     validation_comments = ?,
		     status = 'NON_COMPLIANT'
		 WHERE id = ?`,
		[req.session.username || 'admin', comments, req.params.id]
	);
	
	// Récupérer l'évaluation mise à jour et le fournisseur
	const updatedAssessment = await dbGet(`SELECT * FROM assessments WHERE id = ?`, [req.params.id]);
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE id = ?`, [assessment.supplier_id]);
	
	// Envoyer l'email de notification
	if (supplier && supplier.contact_email) {
		await sendAssessmentNotification(supplier, updatedAssessment, 'REJECTED', lang);
	}
	
	res.redirect(`/suppliers/${supplier.id}?lang=${lang}`);
});

app.post('/assessments/:id/request-clarification', requireAuth, async (req, res) => {
	const lang = res.locals.lang;
	const { comments } = req.body;
	if (!comments || comments.trim() === '') {
		return res.status(400).send(lang === 'en' ? 'Comments are required' : 'Les commentaires sont requis');
	}
	
	const assessment = await dbGet(`SELECT * FROM assessments WHERE id = ?`, [req.params.id]);
	if (!assessment) return res.status(404).send('Assessment not found');
	
	await dbRun(
		`UPDATE assessments 
		 SET validation_status = 'NEEDS_CLARIFICATION', 
		     validated_by = ?, 
		     validated_at = CURRENT_TIMESTAMP,
		     validation_comments = ?
		 WHERE id = ?`,
		[req.session.username || 'admin', comments, req.params.id]
	);
	
	// Récupérer l'évaluation mise à jour et le fournisseur
	const updatedAssessment = await dbGet(`SELECT * FROM assessments WHERE id = ?`, [req.params.id]);
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE id = ?`, [assessment.supplier_id]);
	
	// Envoyer l'email de notification
	if (supplier && supplier.contact_email) {
		await sendAssessmentNotification(supplier, updatedAssessment, 'NEEDS_CLARIFICATION', lang);
	}
	
	res.redirect(`/suppliers/${supplier.id}?lang=${lang}`);
});

// Public invite link to fill assessment
app.get('/invite/:token', async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send(lang === 'en' ? 'Invalid link' : 'Lien invalide');
	res.redirect(`/assessment/${supplier.invite_token}?lang=${lang}`);
});

// Route to serve proof files (redirects to Cloudinary URL or serves base64/local files)
app.get('/proof/:assessmentId/:questionId', requireAuth, async (req, res) => {
	try {
		const assessment = await dbGet(`SELECT proofs_json FROM assessments WHERE id = ?`, [req.params.assessmentId]);
		if (!assessment) return res.status(404).send('Assessment not found');
		
		const proofs = JSON.parse(assessment.proofs_json || '{}');
		const proof = proofs[req.params.questionId];
		
		if (!proof) return res.status(404).send('Proof not found');
		
		// Check if it's a Cloudinary URL (starts with https://res.cloudinary.com)
		if (proof.startsWith('https://res.cloudinary.com') || proof.startsWith('http://res.cloudinary.com')) {
			// Redirect to Cloudinary URL
			return res.redirect(proof);
		}
		
		// Check if it's a base64 data URL (fallback for Vercel without Cloudinary)
		if (proof.startsWith('data:')) {
			// Base64 file from Vercel (fallback)
			const [header, base64Data] = proof.split(',');
			const mimeMatch = header.match(/data:([^;]+)/);
			const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
			
			const buffer = Buffer.from(base64Data, 'base64');
			res.setHeader('Content-Type', mimeType);
			res.setHeader('Content-Disposition', 'inline');
			return res.send(buffer);
		}
		
		// File path (local) - redirect or serve file
		if (proof.startsWith('/uploads/')) {
			return res.redirect(proof);
		}
		
		// If it's already a full URL, redirect to it
		if (proof.startsWith('http://') || proof.startsWith('https://')) {
			return res.redirect(proof);
		}
		
		return res.status(404).send('Invalid proof format');
	} catch (error) {
		console.error('Error serving proof:', error);
		res.status(500).send('Error serving proof');
	}
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
	
	res.render('assessment_success', { 
		layout: 'public_layout', 
		token: req.params.token,
		lang, 
		urlWithLang: res.locals.urlWithLang 
	});
});

// Route for supplier to check assessment status and see comments/clarifications
app.get('/assessment/:token/status', async (req, res) => {
	const lang = res.locals.lang;
	const supplier = await dbGet(`SELECT * FROM suppliers WHERE invite_token = ?`, [req.params.token]);
	if (!supplier) return res.status(404).send(lang === 'en' ? 'Invalid link' : 'Lien invalide');
	
	// Get the latest assessment
	const assessment = await dbGet(`
		SELECT * FROM assessments 
		WHERE supplier_id = ? 
		ORDER BY created_at DESC 
		LIMIT 1
	`, [supplier.id]);
	
	if (!assessment) {
		return res.status(404).send(lang === 'en' ? 'No assessment found' : 'Aucune évaluation trouvée');
	}
	
	const validationStatus = assessment.validation_status || 'PENDING';
	const validationStatusKey = ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION'].includes(validationStatus) 
		? validationStatus 
		: 'PENDING';
	
	res.render('assessment_status', { 
		layout: 'public_layout', 
		supplier,
		assessment,
		validationStatusKey,
		VALIDATION_STATUS,
		getValidationStatus,
		lang, 
		urlWithLang: res.locals.urlWithLang 
	});
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
			try {
				if (useCloudinary) {
					// Upload to Cloudinary
					const fileBuffer = files[0].buffer;
					const originalName = files[0].originalname || 'file';
					const uploadResult = await uploadToCloudinary(fileBuffer, originalName, `vendorshield/proofs/${supplier.id}`);
					proofs[q.id] = uploadResult.url; // Store Cloudinary URL
				} else if (isVercelEnv) {
					// Vercel without Cloudinary: Store file as base64 in database (fallback)
					const fileBuffer = files[0].buffer;
					const base64 = fileBuffer.toString('base64');
					const mimeType = files[0].mimetype || 'application/octet-stream';
					proofs[q.id] = `data:${mimeType};base64,${base64}`;
				} else {
					// Local: Store file path
					proofs[q.id] = `/uploads/${files[0].filename}`;
				}
			} catch (error) {
				console.error(`Error uploading file for question ${q.id}:`, error);
				// Continue without the proof if upload fails
			}
		}
	}

	const score = calculateScore(answers, questions);
	const statusKey = deriveStatus(score);
	const statusText = getStatus(statusKey, lang);

	await dbRun(
		`INSERT INTO assessments (supplier_id, answers_json, proofs_json, score, status, validation_status) VALUES (?, ?, ?, ?, ?, 'PENDING')`,
		[supplier.id, JSON.stringify(answers), JSON.stringify(proofs), score, statusKey]
 	);

	// Update cookie with language from form if provided
	if (langParam) {
		res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
	}
	
	// Redirect to success page without showing score
	const redirectUrl = `/assessment/${supplier.invite_token}/success?lang=${lang}`;
	res.redirect(redirectUrl);
});

// Database functions (dbRun, dbGet, dbAll) are imported from db.js

// Start server only if not on Vercel (Vercel handles the server)
if (process.env.VERCEL !== '1') {
	app.listen(port, () => {
		console.log(`VendorShield running at http://localhost:${port}`);
	});
}

// Export for Vercel serverless functions
export default app;




