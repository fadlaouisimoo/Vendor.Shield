import nodemailer from 'nodemailer';

// Configuration SMTP depuis les variables d'environnement
const createTransporter = () => {
	// Si toutes les variables SMTP sont définies, utiliser SMTP personnalisé
	if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
		return nodemailer.createTransport({
			host: process.env.SMTP_HOST,
			port: parseInt(process.env.SMTP_PORT || '587'),
			secure: process.env.SMTP_SECURE === 'true', // true pour 465, false pour autres ports
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
			},
			tls: {
				rejectUnauthorized: false // Pour les certificats auto-signés (développement)
			}
		});
	}
	
	// Sinon, utiliser Gmail par défaut (nécessite un "App Password")
	if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
		return nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: process.env.GMAIL_USER,
				pass: process.env.GMAIL_APP_PASSWORD
			}
		});
	}
	
	// Mode développement : transporter de test (ne fait rien, juste pour éviter les erreurs)
	console.warn('⚠️  Email configuration not found. Using test transporter (emails will not be sent).');
	console.warn('   Set SMTP_HOST, SMTP_USER, SMTP_PASS or GMAIL_USER, GMAIL_APP_PASSWORD environment variables.');
	console.warn('   See EMAIL_SETUP.md for configuration instructions.');
	
	// Créer un transporter "null" qui ne fait rien (pour éviter les erreurs)
	return nodemailer.createTransport({
		jsonTransport: true // Mode test qui ne fait rien
	});
};

const transporter = createTransporter();

// Email de l'expéditeur
const getFromEmail = () => {
	return process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || 'noreply@vendorshield.com';
};

// Nom de l'expéditeur
const getFromName = () => {
	return process.env.EMAIL_FROM_NAME || 'VendorShield - Équipe Sécurité';
};

/**
 * Envoie un email de notification au fournisseur
 */
export async function sendAssessmentNotification(supplier, assessment, validationStatus, lang = 'fr') {
	try {
		const supplierEmail = supplier.contact_email;
		if (!supplierEmail) {
			console.warn(`No email found for supplier ${supplier.name}`);
			return { success: false, error: 'No email address' };
		}

		const statusMessages = {
			fr: {
				APPROVED: {
					subject: '✅ Votre évaluation a été approuvée',
					title: 'Évaluation Approuvée',
					message: 'Félicitations ! Votre évaluation de conformité a été approuvée par l\'équipe sécurité.'
				},
				REJECTED: {
					subject: '❌ Votre évaluation a été rejetée',
					title: 'Évaluation Rejetée',
					message: 'Votre évaluation de conformité a été rejetée par l\'équipe sécurité.'
				},
				NEEDS_CLARIFICATION: {
					subject: '📋 Clarifications demandées sur votre évaluation',
					title: 'Clarifications Demandées',
					message: 'L\'équipe sécurité a besoin de clarifications concernant votre évaluation de conformité.'
				}
			},
			en: {
				APPROVED: {
					subject: '✅ Your assessment has been approved',
					title: 'Assessment Approved',
					message: 'Congratulations! Your compliance assessment has been approved by the security team.'
				},
				REJECTED: {
					subject: '❌ Your assessment has been rejected',
					title: 'Assessment Rejected',
					message: 'Your compliance assessment has been rejected by the security team.'
				},
				NEEDS_CLARIFICATION: {
					subject: '📋 Clarifications requested on your assessment',
					title: 'Clarifications Requested',
					message: 'The security team needs clarifications regarding your compliance assessment.'
				}
			}
		};

		const messages = statusMessages[lang] || statusMessages.fr;
		const statusInfo = messages[validationStatus];
		
		if (!statusInfo) {
			console.warn(`Unknown validation status: ${validationStatus}`);
			return { success: false, error: 'Unknown status' };
		}

		// Construire le lien de statut
		const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
		const statusUrl = `${baseUrl}/assessment/${supplier.invite_token}/status?lang=${lang}`;

		// Template HTML de l'email
		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #f59e0b, #fb923c); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
		.content { background: #f8f9fa; padding: 30px; border: 1px solid #e0e0e0; }
		.footer { background: #ffffff; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; font-size: 12px; color: #666; }
		.button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
		.comments-box { background: #ffffff; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
		.info-row { margin: 10px 0; }
		.info-label { font-weight: bold; color: #666; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1 style="margin: 0;">${statusInfo.title}</h1>
		</div>
		<div class="content">
			<p>Bonjour ${supplier.name},</p>
			
			<p>${statusInfo.message}</p>
			
			${assessment.validated_by ? `
			<div class="info-row">
				<span class="info-label">${lang === 'fr' ? 'Validé par' : 'Validated by'}:</span> ${assessment.validated_by}
			</div>
			` : ''}
			
			${assessment.validated_at ? `
			<div class="info-row">
				<span class="info-label">${lang === 'fr' ? 'Date de validation' : 'Validation date'}:</span> ${new Date(assessment.validated_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}
			</div>
			` : ''}
			
			${assessment.validation_comments ? `
			<div class="comments-box">
				<p style="margin-top: 0;"><strong>${lang === 'fr' ? 'Commentaires' : 'Comments'}:</strong></p>
				<p style="white-space: pre-wrap;">${assessment.validation_comments}</p>
			</div>
			` : ''}
			
			${validationStatus === 'NEEDS_CLARIFICATION' ? `
			<p><strong>${lang === 'fr' ? 'Action requise' : 'Action required'}:</strong> ${lang === 'fr' ? 'Veuillez soumettre à nouveau votre évaluation avec les clarifications demandées.' : 'Please resubmit your assessment with the requested clarifications.'}</p>
			` : ''}
			
			<div style="text-align: center;">
				<a href="${statusUrl}" class="button">${lang === 'fr' ? 'Voir le statut détaillé' : 'View detailed status'}</a>
			</div>
			
			<p style="margin-top: 30px; font-size: 14px; color: #666;">
				${lang === 'fr' 
					? 'Vous pouvez également consulter votre statut à tout moment en utilisant ce lien :' 
					: 'You can also check your status anytime using this link:'}
			</p>
			<p style="font-size: 12px; color: #999; word-break: break-all;">
				<a href="${statusUrl}" style="color: #f59e0b;">${statusUrl}</a>
			</p>
		</div>
		<div class="footer">
			<p>${lang === 'fr' 
				? 'Cet email a été envoyé automatiquement par VendorShield. Merci de ne pas y répondre.' 
				: 'This email was automatically sent by VendorShield. Please do not reply.'}</p>
		</div>
	</div>
</body>
</html>
		`;

		// Version texte simple
		const textContent = `
${statusInfo.title}

Bonjour ${supplier.name},

${statusInfo.message}

${assessment.validated_by ? `Validé par: ${assessment.validated_by}\n` : ''}
${assessment.validated_at ? `Date de validation: ${new Date(assessment.validated_at).toLocaleString()}\n` : ''}
${assessment.validation_comments ? `\nCommentaires:\n${assessment.validation_comments}\n` : ''}

${validationStatus === 'NEEDS_CLARIFICATION' ? 'Action requise: Veuillez soumettre à nouveau votre évaluation.\n' : ''}

Voir le statut détaillé: ${statusUrl}

---
Cet email a été envoyé automatiquement par VendorShield.
		`;

		const mailOptions = {
			from: `"${getFromName()}" <${getFromEmail()}>`,
			to: supplierEmail,
			subject: statusInfo.subject,
			text: textContent,
			html: htmlContent
		};

		// Vérifier si on est en mode test
		if (transporter.transporter && transporter.transporter.name === 'JSONTransport') {
			console.warn(`⚠️  Email not sent (test mode): Would send to ${supplierEmail} (${validationStatus})`);
			console.warn('   Email content:', JSON.stringify(mailOptions, null, 2));
			return { success: false, error: 'Email in test mode', testMode: true };
		}
		
		const info = await transporter.sendMail(mailOptions);
		
		console.log(`✅ Email sent to ${supplierEmail} (${validationStatus}):`, info.messageId);
		
		return { success: true, messageId: info.messageId };
	} catch (error) {
		console.error('❌ Error sending email:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Teste la configuration email
 */
export async function testEmailConfig() {
	try {
		// Ne pas tester si c'est le mode test (jsonTransport)
		if (transporter.transporter && transporter.transporter.name === 'JSONTransport') {
			console.warn('⚠️  Email is in test mode (no emails will be sent)');
			return false;
		}
		await transporter.verify();
		console.log('✅ Email server is ready');
		return true;
	} catch (error) {
		console.warn('⚠️  Email server configuration error (emails may not work):', error.message);
		return false;
	}
}

