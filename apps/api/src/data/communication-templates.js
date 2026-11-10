import { brandShell, buttonLink, escapeHtml } from '../utils/email-brand.js';

// Canonical company communication copy. These templates are designed for the
// dark-and-gold TradingBible shell. They are not a licence to send: the admin
// route only permits a test to the signed-in administrator, and fundraising
// templates remain restricted until counsel clears the applicable gate.

export const COMMUNICATION_CATEGORIES = [
	{ id: 'account', label: 'Account & security', description: 'Sign-in, verification, recovery, suspension and closure.' },
	{ id: 'billing', label: 'Billing', description: 'Subscription, receipts, failed payments, renewals and refunds.' },
	{ id: 'platform', label: 'Platform', description: 'Digests, alerts, evaluations, Academy, affiliate and support.' },
	{ id: 'investor', label: 'Investor relations', description: 'Investor updates and inquiry acknowledgments. No offering.' },
	{ id: 'fundraising-private', label: 'Fundraising — private', description: 'One-to-one private-placement communications. Restricted.' },
	{ id: 'fundraising-regcf', label: 'Fundraising — Reg CF', description: 'Pre-qualification and post-qualification campaign copy. Counsel-gated.' },
	{ id: 'internal', label: 'Internal operations', description: 'Board, DocuSign, investor-document and incident notices.' },
];

const COMMON = {
	firstName: 'Alex',
	lastName: 'Morgan',
	fullName: 'Alex Morgan',
	email: 'alex@example.com',
	brandName: 'TradingBible',
	companyName: 'TradingBible Holdings, Inc.',
	supportEmail: 'support@tradingbible.app',
	legalEmail: 'legal@tradingbible.app',
	privacyEmail: 'privacy@tradingbible.app',
	appUrl: 'https://tradingbible.app',
	dashboardUrl: 'https://tradingbible.app/dashboard',
	securityUrl: 'https://tradingbible.app/security',
	settingsUrl: 'https://tradingbible.app/settings',
	billingUrl: 'https://tradingbible.app/billing',
	alertsUrl: 'https://tradingbible.app/alerts',
	academyUrl: 'https://tradingbible.app/academy',
	unsubscribeUrl: 'https://tradingbible.app/unsubscribe',
	verificationUrl: 'https://tradingbible.app/verify?token=[VERIFICATION TOKEN]',
	magicLinkUrl: 'https://tradingbible.app/sign-in?token=[SIGN-IN TOKEN]',
	resetUrl: 'https://tradingbible.app/reset?token=[RESET TOKEN]',
	signInTime: '[SIGN-IN TIME]',
	changedAt: '[CHANGE TIME]',
	device: '[DEVICE]',
	location: '[LOCATION]',
	ipAddress: '[IP ADDRESS]',
	planName: 'TradingBible Premium',
	planPrice: 'US$19.99/month',
	renewalDate: '[RENEWAL DATE]',
	invoiceNumber: '[INVOICE NUMBER]',
	amount: '[AMOUNT]',
	refundReference: '[REFUND REFERENCE]',
	accessEndDate: '[ACCESS END DATE]',
	symbol: '[SYMBOL]',
	direction: '[above/below]',
	target: '[TARGET]',
	triggeredAt: '[TRIGGER TIME]',
	courseTitle: '[COURSE TITLE]',
	certificateUrl: 'https://tradingbible.app/academy/certificates/[CERTIFICATE ID]',
	payoutAmount: '[PAYOUT AMOUNT]',
	payoutDate: '[PAYOUT DATE]',
	ticketId: '[TICKET ID]',
	ticketSubject: '[TICKET SUBJECT]',
	updateTitle: '[UPDATE TITLE]',
	investorName: '[INVESTOR NAME]',
	investorEmail: '[INVESTOR EMAIL]',
	purchaseAmount: '[PURCHASE AMOUNT]',
	valuationCap: '[VALUATION CAP]',
	documentNumber: '[DOCUMENT NUMBER]',
	documentTitle: '[DOCUMENT TITLE]',
	envelopeUrl: '[DOCUSIGN ENVELOPE LINK]',
	signingDeadline: '[SIGNING DEADLINE]',
	closingDate: '[CLOSING DATE]',
	callBookingUrl: 'https://tradingbible.app/investors/private-introduction',
	fundingReference: '[FUNDING REFERENCE]',
	companyPhone: '[COMPANY PHONE]',
	offeringUrl: '[REGISTERED INTERMEDIARY OFFERING URL]',
	campaignDeadline: '[CAMPAIGN DEADLINE]',
	deadline: '[DEADLINE]',
	severity: '[SEVERITY]',
	startDate: '[START DATE]',
	managerName: '[MANAGER NAME]',
};

const SAMPLE_VARIABLES = {
	...COMMON,
};

const p = (html) => `<p style="margin:0 0 14px;color:#c9c4b4">${html}</p>`;
const ul = (...items) => `<ul style="margin:0 0 16px 20px;padding:0;color:#c9c4b4">${items.map((item) => `<li style="margin:0 0 6px">${item}</li>`).join('')}</ul>`;
const small = (html) => `<p style="margin:0 0 12px;color:#8a8577;font-size:12px;line-height:1.55">${html}</p>`;
const cta = (href, label) => `<div style="margin:22px 0">${buttonLink(href, label)}</div>`;
const link = (href, label) => `<a href="${href}" style="color:#d4af37;text-decoration:underline">${label}</a>`;

function template(config) {
	const channels = [];
	if (config.email) channels.push('email');
	if (config.sms) channels.push('sms');
	if (config.inApp) channels.push('in-app');
	return {
		implementation: 'template',
		sendPolicy: 'test-only',
		variables: [],
		...config,
		channels,
	};
}

export const COMMUNICATION_TEMPLATES = [
	// ── Account & security ──────────────────────────────────────────────────
	template({
		id: 'account.welcome',
		category: 'account',
		name: 'Welcome and onboarding',
		description: 'First sign-in welcome with the next three useful actions.',
		audience: 'Member',
		compliance: 'transactional',
		implementation: 'brand-shell',
		variables: ['firstName', 'dashboardUrl'],
		email: {
			subject: 'Welcome to TradingBible, {{firstName}}',
			preheader: 'Your account is ready. Start with the terminal, the journal and your first review.',
			eyebrow: 'Welcome',
			headerTag: 'Member access',
			title: 'Your TradingBible account is ready',
			body: [
				p('Hi {{firstName}}, welcome to TradingBible. Your account is active, and the platform is ready when you are.'),
				ul(
					'<strong>Open the terminal</strong> — build a layout, add a watchlist and save your first workspace.',
					'<strong>Start the journal</strong> — connect a broker or add a trade manually so the review has a record to work from.',
					'<strong>Run your first review</strong> — use the analytics and SI report to see what your process actually looks like.',
				),
				cta('{{dashboardUrl}}', 'Open TradingBible'),
				small('TradingBible is a software platform, not a broker-dealer or investment adviser. Nothing in the platform is investment advice.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nWelcome to TradingBible. Your account is active and the platform is ready when you are.\n\n1. Open the terminal and save a workspace.\n2. Start the journal with a broker connection or a manual trade.\n3. Run your first analytics and SI review.\n\nOpen TradingBible: {{dashboardUrl}}\n\nTradingBible is a software platform, not a broker-dealer or investment adviser. Nothing in the platform is investment advice.',
		},
		inApp: {
			title: 'Welcome to TradingBible',
			body: 'Your account is ready. Start with the terminal, the journal and your first review.',
			actionLabel: 'Open dashboard',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'account.verify-email',
		category: 'account',
		name: 'Verify email',
		description: 'Email verification link with expiry and a no-password security note.',
		audience: 'Member',
		compliance: 'security',
		variables: ['firstName', 'verificationUrl'],
		email: {
			subject: 'Confirm your TradingBible email',
			preheader: 'One click confirms your email and finishes account setup.',
			eyebrow: 'Account security',
			headerTag: 'Verify email',
			title: 'Confirm your email address',
			body: [
				p('Hi {{firstName}}, please confirm this email address for your TradingBible account.'),
				cta('{{verificationUrl}}', 'Confirm email'),
				p('This link expires in 24 hours and can be used once. If it has expired, request a new link from the sign-in page.'),
				small('TradingBible will never ask for your password, one-time code or private key by email.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nPlease confirm this email address for your TradingBible account:\n{{verificationUrl}}\n\nThis link expires in 24 hours and can be used once. If it has expired, request a new link from the sign-in page.\n\nTradingBible will never ask for your password, one-time code or private key by email.',
		},
	}),
	template({
		id: 'account.magic-link',
		category: 'account',
		name: 'Magic sign-in link',
		description: 'Passwordless sign-in link with expiry and device warning.',
		audience: 'Member',
		compliance: 'security',
		variables: ['firstName', 'magicLinkUrl'],
		email: {
			subject: 'Your TradingBible sign-in link',
			preheader: 'Use this single-use link to sign in. It expires shortly.',
			eyebrow: 'Secure sign-in',
			headerTag: 'Single use',
			title: 'Sign in to TradingBible',
			body: [
				p('Hi {{firstName}}, use the button below to sign in. The link is single-use and expires shortly.'),
				cta('{{magicLinkUrl}}', 'Sign in securely'),
				p('If you did not request this link, you can ignore this email. No one can sign in without the link.'),
				small('Do not forward this email. If you receive a sign-in link you did not request, change your password and review your active sessions.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nUse this single-use link to sign in to TradingBible:\n{{magicLinkUrl}}\n\nThe link expires shortly. If you did not request it, ignore this email. Do not forward it.',
		},
	}),
	template({
		id: 'account.password-reset',
		category: 'account',
		name: 'Password reset',
		description: 'Reset link with expiry and a clear “if this wasn’t you” path.',
		audience: 'Member',
		compliance: 'security',
		variables: ['firstName', 'resetUrl'],
		email: {
			subject: 'Reset your TradingBible password',
			preheader: 'A single-use link to choose a new password.',
			eyebrow: 'Account security',
			headerTag: 'Password reset',
			title: 'Choose a new password',
			body: [
				p('Hi {{firstName}}, we received a request to reset the password for your TradingBible account.'),
				cta('{{resetUrl}}', 'Reset password'),
				p('This link expires in 60 minutes and can be used once. If you did not request a reset, no action is required.'),
				small('If you requested this reset, choose a password you do not use on another site. TradingBible support will never ask you to send a password by email.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nWe received a request to reset your TradingBible password:\n{{resetUrl}}\n\nThe link expires in 60 minutes and can be used once. If you did not request a reset, no action is required.',
		},
	}),
	template({
		id: 'account.new-signin',
		category: 'account',
		name: 'New sign-in alert',
		description: 'Sign-in notice with time, device, location and a secure-account link.',
		audience: 'Member',
		compliance: 'security',
		variables: ['firstName', 'signInTime', 'device', 'location', 'ipAddress', 'securityUrl'],
		email: {
			subject: 'New sign-in to your TradingBible account',
			preheader: 'Review the device, location and time. If this was not you, secure the account now.',
			eyebrow: 'Security alert',
			headerTag: 'New sign-in',
			title: 'New sign-in detected',
			body: [
				p('Hi {{firstName}}, a new sign-in to your TradingBible account was recorded.'),
				ul(
					'<strong>Time:</strong> {{signInTime}}',
					'<strong>Device:</strong> {{device}}',
					'<strong>Location:</strong> {{location}}',
					'<strong>IP address:</strong> {{ipAddress}}',
				),
				p('If this was you, no action is needed. If it was not you, secure the account immediately.'),
				cta('{{securityUrl}}', 'Review account security'),
				small('TradingBible will never ask you to approve a sign-in by sending a password or one-time code to another person.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nA new sign-in to your TradingBible account was recorded.\n\nTime: {{signInTime}}\nDevice: {{device}}\nLocation: {{location}}\nIP address: {{ipAddress}}\n\nIf this was not you, secure the account immediately: {{securityUrl}}\n\nIf this was you, no action is needed.',
		},
		sms: {
			body: 'TradingBible: New sign-in at {{signInTime}} from {{device}}. If this was not you, secure your account: {{securityUrl}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: 'New sign-in detected',
			body: '{{device}} · {{location}} · {{signInTime}}. If this was not you, review account security.',
			actionLabel: 'Review security',
			href: '{{securityUrl}}',
		},
	}),
	template({
		id: 'account.password-changed',
		category: 'account',
		name: 'Password changed',
		description: 'Confirmation of a password change with a recovery path.',
		audience: 'Member',
		compliance: 'security',
		variables: ['firstName', 'changedAt', 'securityUrl'],
		email: {
			subject: 'Your TradingBible password was changed',
			preheader: 'The password on your account changed at {{changedAt}}.',
			eyebrow: 'Security alert',
			headerTag: 'Password changed',
			title: 'Your password was changed',
			body: [
				p('Hi {{firstName}}, the password for your TradingBible account was changed at {{changedAt}}.'),
				p('If you made this change, no action is needed. If you did not, secure the account and contact support immediately.'),
				cta('{{securityUrl}}', 'Review account security'),
				small('Support will never ask for your new password or a one-time code.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nThe password for your TradingBible account was changed at {{changedAt}}.\n\nIf you made this change, no action is needed. If you did not, secure the account immediately: {{securityUrl}}\n\nSupport will never ask for your new password or a one-time code.',
		},
		sms: {
			body: 'TradingBible: Your password was changed at {{changedAt}}. If this was not you, secure your account now: {{securityUrl}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: 'Password changed',
			body: 'Your TradingBible password changed at {{changedAt}}. If this was not you, review account security.',
			actionLabel: 'Review security',
			href: '{{securityUrl}}',
		},
	}),
	template({
		id: 'account.two-factor-enabled',
		category: 'account',
		name: 'Two-factor enabled',
		description: 'Confirmation that a second factor was added, with recovery-code guidance.',
		audience: 'Member',
		compliance: 'security',
		variables: ['firstName', 'securityUrl'],
		email: {
			subject: 'Two-factor authentication is on',
			preheader: 'Your account now requires a second factor at sign-in.',
			eyebrow: 'Account security',
			headerTag: '2FA enabled',
			title: 'Two-factor authentication is on',
			body: [
				p('Hi {{firstName}}, two-factor authentication is now enabled for your TradingBible account.'),
				p('Keep your recovery codes somewhere safe and offline. If you lose access to your authenticator, the recovery code is the fastest way back in.'),
				cta('{{securityUrl}}', 'Manage security'),
				small('If you did not enable two-factor authentication, secure the account and contact support immediately.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nTwo-factor authentication is now enabled for your TradingBible account. Keep your recovery codes somewhere safe and offline.\n\nManage security: {{securityUrl}}\n\nIf you did not enable two-factor authentication, contact support immediately.',
		},
		inApp: {
			title: 'Two-factor authentication enabled',
			body: 'Your account now requires a second factor at sign-in. Store your recovery codes offline.',
			actionLabel: 'Manage security',
			href: '{{securityUrl}}',
		},
	}),
	template({
		id: 'account.suspended',
		category: 'account',
		name: 'Account suspended',
		description: 'Suspension notice with a support-only path and no marketing content.',
		audience: 'Member',
		compliance: 'account',
		variables: ['firstName', 'supportEmail'],
		email: {
			subject: 'Important: your TradingBible account is suspended',
			preheader: 'Access is paused. Support is the only door for a review request.',
			eyebrow: 'Account notice',
			headerTag: 'Action required',
			title: 'Your account is suspended',
			body: [
				p('Hi {{firstName}}, access to your TradingBible account has been suspended while we review an account or security issue.'),
				p('Sign-in, trading tools, journal access and billing changes are paused. Your data is retained according to our policies.'),
				p(`If you believe this is a mistake, contact ${link('mailto:{{supportEmail}}', '{{supportEmail}}')} from the email address on the account. Include your account email and any relevant reference.`),
				small('We will not ask for your password, one-time code or private key. Do not send those in a support message.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nAccess to your TradingBible account has been suspended while we review an account or security issue.\n\nIf you believe this is a mistake, contact {{supportEmail}} from the email address on the account.\n\nWe will not ask for your password, one-time code or private key.',
		},
		inApp: {
			title: 'Account suspended',
			body: 'Access is paused while we review an account or security issue. Contact support from the email on the account.',
			actionLabel: 'Contact support',
			href: 'mailto:{{supportEmail}}',
		},
	}),
	template({
		id: 'account.closed',
		category: 'account',
		name: 'Account closed',
		description: 'Closure confirmation with retention and re-activation guidance.',
		audience: 'Member',
		compliance: 'account',
		variables: ['firstName', 'supportEmail'],
		email: {
			subject: 'Your TradingBible account has been closed',
			preheader: 'A confirmation of closure and the records we retain.',
			eyebrow: 'Account notice',
			headerTag: 'Closed',
			title: 'Your account has been closed',
			body: [
				p('Hi {{firstName}}, your TradingBible account has been closed and access to member features has ended.'),
				p('We retain certain records where required for legal, tax, security, fraud-prevention and dispute-resolution purposes. Our Privacy Policy explains the categories and retention periods.'),
				p(`If you have a question about the closure or want to ask whether re-activation is available, contact ${link('mailto:{{supportEmail}}', '{{supportEmail}}')}.`),
				small('This notice is separate from any marketing communication. It is sent because it relates to your account.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour TradingBible account has been closed and access to member features has ended.\n\nWe retain certain records where required for legal, tax, security, fraud-prevention and dispute-resolution purposes.\n\nQuestions: {{supportEmail}}',
		},
		inApp: {
			title: 'Account closed',
			body: 'Your TradingBible account has been closed. Contact support if you have a question about the closure.',
			actionLabel: 'Contact support',
			href: 'mailto:{{supportEmail}}',
		},
	}),

	// ── Billing ─────────────────────────────────────────────────────────────
	template({
		id: 'billing.subscription-started',
		category: 'billing',
		name: 'Subscription started',
		description: 'Plan confirmation with price, renewal date and billing controls.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'planName', 'planPrice', 'renewalDate', 'billingUrl'],
		email: {
			subject: 'Your TradingBible Premium subscription is active',
			preheader: 'Plan, price and renewal details for your records.',
			eyebrow: 'Billing',
			headerTag: 'Subscription active',
			title: 'Your subscription is active',
			body: [
				p('Hi {{firstName}}, your {{planName}} subscription is active.'),
				ul(
					'<strong>Plan:</strong> {{planName}}',
					'<strong>Price:</strong> {{planPrice}}',
					'<strong>Next renewal:</strong> {{renewalDate}}',
				),
				p('You can view invoices, update the payment method or cancel from the billing page.'),
				cta('{{billingUrl}}', 'Manage billing'),
				small('The price shown is the price in effect at purchase. Taxes may be added where required by law.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour {{planName}} subscription is active.\n\nPlan: {{planName}}\nPrice: {{planPrice}}\nNext renewal: {{renewalDate}}\n\nManage billing: {{billingUrl}}\n\nTaxes may be added where required by law.',
		},
		inApp: {
			title: 'Subscription active',
			body: '{{planName}} is active at {{planPrice}}. Next renewal: {{renewalDate}}.',
			actionLabel: 'Manage billing',
			href: '{{billingUrl}}',
		},
	}),
	template({
		id: 'billing.payment-receipt',
		category: 'billing',
		name: 'Payment receipt',
		description: 'Receipt with amount, invoice reference and billing link.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'amount', 'invoiceNumber', 'billingUrl'],
		email: {
			subject: 'Your TradingBible receipt — {{invoiceNumber}}',
			preheader: 'Payment received. Keep this receipt for your records.',
			eyebrow: 'Billing',
			headerTag: 'Receipt',
			title: 'Payment received',
			body: [
				p('Hi {{firstName}}, thank you. Your payment has been received.'),
				ul(
					'<strong>Amount:</strong> {{amount}}',
					'<strong>Invoice:</strong> {{invoiceNumber}}',
				),
				cta('{{billingUrl}}', 'View invoice'),
				small('This receipt is issued by TradingBible Holdings, Inc. It is not a tax invoice unless your local law requires one.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nThank you. Your payment has been received.\n\nAmount: {{amount}}\nInvoice: {{invoiceNumber}}\n\nView invoice: {{billingUrl}}',
		},
	}),
	template({
		id: 'billing.payment-failed',
		category: 'billing',
		name: 'Payment failed',
		description: 'Failed-payment notice with a clear action and no shaming.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'amount', 'billingUrl'],
		email: {
			subject: 'Action needed: your TradingBible payment failed',
			preheader: 'Update the payment method to keep access.',
			eyebrow: 'Billing',
			headerTag: 'Action required',
			title: 'Your payment did not go through',
			body: [
				p('Hi {{firstName}}, we could not process the payment of {{amount}} for your TradingBible subscription.'),
				p('Update the payment method or settle the balance to keep the subscription active. If the issue is not resolved, access may be paused.'),
				cta('{{billingUrl}}', 'Update payment method'),
				small('If you have already updated the payment method, you can ignore this notice. Contact support if the charge keeps failing.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nWe could not process the payment of {{amount}} for your TradingBible subscription.\n\nUpdate the payment method or settle the balance to keep the subscription active: {{billingUrl}}\n\nIf you have already updated the payment method, you can ignore this notice.',
		},
		sms: {
			body: 'TradingBible: Your payment of {{amount}} did not go through. Update the payment method to keep access: {{billingUrl}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: 'Payment failed',
			body: 'We could not process {{amount}}. Update the payment method to keep the subscription active.',
			actionLabel: 'Update billing',
			href: '{{billingUrl}}',
		},
	}),
	template({
		id: 'billing.renewal-reminder',
		category: 'billing',
		name: 'Renewal reminder',
		description: 'Advance notice of the next charge and the cancellation path.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'planPrice', 'renewalDate', 'billingUrl'],
		email: {
			subject: 'Your TradingBible Premium renews on {{renewalDate}}',
			preheader: 'The next charge is {{planPrice}}. Manage or cancel before the renewal.',
			eyebrow: 'Billing',
			headerTag: 'Upcoming renewal',
			title: 'Your subscription renews soon',
			body: [
				p('Hi {{firstName}}, your TradingBible Premium subscription will renew on {{renewalDate}} for {{planPrice}}.'),
				p('If you want to keep the subscription, no action is needed. If you want to change or cancel it, use the billing page before the renewal date.'),
				cta('{{billingUrl}}', 'Manage subscription'),
				small('Cancellation stops future renewals. Access continues until the end of the current paid period unless the plan says otherwise.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour TradingBible Premium subscription will renew on {{renewalDate}} for {{planPrice}}.\n\nNo action is needed to keep it. To change or cancel, use the billing page before the renewal date: {{billingUrl}}',
		},
		sms: {
			body: 'TradingBible: Your Premium plan renews on {{renewalDate}} for {{planPrice}}. Manage or cancel: {{billingUrl}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
	}),
	template({
		id: 'billing.refund-approved',
		category: 'billing',
		name: 'Refund approved',
		description: 'Refund confirmation with amount, method and processing time.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'amount', 'refundReference', 'billingUrl'],
		email: {
			subject: 'Your TradingBible refund has been approved',
			preheader: 'Refund reference and expected processing window.',
			eyebrow: 'Billing',
			headerTag: 'Refund approved',
			title: 'Your refund is approved',
			body: [
				p('Hi {{firstName}}, your refund has been approved.'),
				ul(
					'<strong>Amount:</strong> {{amount}}',
					'<strong>Reference:</strong> {{refundReference}}',
				),
				p('Refunds are returned to the original payment method. The bank or card issuer usually posts the credit within 5–10 business days, but timing depends on the institution.'),
				cta('{{billingUrl}}', 'View billing'),
				small('If the refund has not appeared after 10 business days, contact support with the reference above.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour refund has been approved.\n\nAmount: {{amount}}\nReference: {{refundReference}}\n\nThe refund is returned to the original payment method and usually posts within 5–10 business days.\n\nView billing: {{billingUrl}}',
		},
		inApp: {
			title: 'Refund approved',
			body: '{{amount}} was approved for refund. Reference: {{refundReference}}.',
			actionLabel: 'View billing',
			href: '{{billingUrl}}',
		},
	}),
	template({
		id: 'billing.cancelled',
		category: 'billing',
		name: 'Subscription cancelled',
		description: 'Cancellation confirmation with access end date and reactivation path.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'accessEndDate', 'billingUrl'],
		email: {
			subject: 'Your TradingBible subscription is cancelled',
			preheader: 'Access continues until {{accessEndDate}}.',
			eyebrow: 'Billing',
			headerTag: 'Cancelled',
			title: 'Your subscription is cancelled',
			body: [
				p('Hi {{firstName}}, your TradingBible subscription has been cancelled. Access continues until {{accessEndDate}}.'),
				p('You can reactivate from the billing page at any time. Your journal, notes and account data remain subject to our retention policies.'),
				cta('{{billingUrl}}', 'Manage subscription'),
				small('This notice confirms a billing change. It is not a marketing message.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour TradingBible subscription has been cancelled. Access continues until {{accessEndDate}}.\n\nYou can reactivate from the billing page: {{billingUrl}}\n\nYour journal, notes and account data remain subject to our retention policies.',
		},
		inApp: {
			title: 'Subscription cancelled',
			body: 'Access continues until {{accessEndDate}}. You can reactivate from billing.',
			actionLabel: 'Manage billing',
			href: '{{billingUrl}}',
		},
	}),

	// ── Platform ────────────────────────────────────────────────────────────
	template({
		id: 'platform.weekly-digest',
		category: 'platform',
		name: 'Weekly member digest',
		description: 'Opt-in weekly review of the member’s own record, with an unsubscribe link.',
		audience: 'Member',
		compliance: 'marketing',
		variables: ['firstName', 'dashboardUrl', 'unsubscribeUrl'],
		email: {
			subject: 'Your TradingBible week in review',
			preheader: 'Your journal, your risk and the one thing to work on next.',
			eyebrow: 'Weekly review',
			headerTag: 'Member digest',
			title: 'Your week, in one record',
			body: [
				p('Hi {{firstName}}, here is your weekly TradingBible review.'),
				ul(
					'<strong>Trades logged:</strong> [NUMBER]',
					'<strong>Win rate:</strong> [PERCENTAGE]',
					'<strong>Largest drawdown:</strong> [AMOUNT OR PERCENTAGE]',
					'<strong>Best decision:</strong> [NOTE]',
					'<strong>One thing to work on:</strong> [NOTE]',
				),
				p('Open the journal to read the full review and add the missing context while it is still fresh.'),
				cta('{{dashboardUrl}}', 'Open your review'),
				small('These figures come from your own records. They are not a performance promise or investment advice.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nHere is your weekly TradingBible review.\n\nTrades logged: [NUMBER]\nWin rate: [PERCENTAGE]\nLargest drawdown: [AMOUNT OR PERCENTAGE]\nBest decision: [NOTE]\nOne thing to work on: [NOTE]\n\nOpen your review: {{dashboardUrl}}\n\nThese figures come from your own records. They are not a performance promise or investment advice.\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
	}),
	template({
		id: 'platform.price-alert',
		category: 'platform',
		name: 'Price alert triggered',
		description: 'Consent-based price alert with symbol, direction, target and manage link.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'symbol', 'direction', 'target', 'triggeredAt', 'alertsUrl'],
		email: {
			subject: 'TradingBible alert: {{symbol}} is {{direction}} {{target}}',
			preheader: 'Your price alert triggered at {{triggeredAt}}.',
			eyebrow: 'Price alert',
			headerTag: 'Alert triggered',
			title: '{{symbol}} triggered your alert',
			body: [
				p('Your alert for {{symbol}} triggered at {{triggeredAt}}.'),
				ul(
					'<strong>Condition:</strong> {{direction}} {{target}}',
					'<strong>Symbol:</strong> {{symbol}}',
				),
				p('Open the terminal to review the chart, your position and the reason for the alert.'),
				cta('{{alertsUrl}}', 'Open alerts'),
				small('Alerts are a notification tool, not a recommendation to trade. Quotes may be delayed or unavailable.'),
			].join(''),
			text: 'Your TradingBible alert for {{symbol}} triggered at {{triggeredAt}}.\n\nCondition: {{direction}} {{target}}\n\nOpen alerts: {{alertsUrl}}\n\nAlerts are a notification tool, not a recommendation to trade. Quotes may be delayed or unavailable.',
		},
		sms: {
			body: 'TradingBible alert: {{symbol}} is {{direction}} {{target}} at {{triggeredAt}}. Manage alerts: {{alertsUrl}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: '{{symbol}} alert triggered',
			body: 'Condition met: {{direction}} {{target}} at {{triggeredAt}}.',
			actionLabel: 'Open alerts',
			href: '{{alertsUrl}}',
		},
	}),
	template({
		id: 'platform.prop-passed',
		category: 'platform',
		name: 'Evaluation passed',
		description: 'Evaluation pass notice with next-step instructions.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'dashboardUrl'],
		email: {
			subject: 'You passed your TradingBible evaluation',
			preheader: 'The next step is in your dashboard.',
			eyebrow: 'Funded evaluation',
			headerTag: 'Passed',
			title: 'You passed your evaluation',
			body: [
				p('Hi {{firstName}}, your TradingBible evaluation has passed.'),
				p('Open the dashboard to review the next step, confirm your details and read the funded-account rules. The evaluation result is not a promise of a payout or a live trading account until the next step is completed.'),
				cta('{{dashboardUrl}}', 'Open evaluation dashboard'),
				small('Review the current evaluation and payout rules before trading. The rules control if there is any conflict with this email.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour TradingBible evaluation has passed.\n\nOpen the dashboard to review the next step, confirm your details and read the funded-account rules: {{dashboardUrl}}\n\nThe evaluation result is not a promise of a payout or a live trading account until the next step is completed.',
		},
		inApp: {
			title: 'Evaluation passed',
			body: 'Your evaluation passed. Review the next step and funded-account rules.',
			actionLabel: 'Open dashboard',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'platform.prop-payout',
		category: 'platform',
		name: 'Payout approved',
		description: 'Payout approval with amount, method and expected timing.',
		audience: 'Member',
		compliance: 'transactional',
		variables: ['firstName', 'payoutAmount', 'payoutDate', 'dashboardUrl'],
		email: {
			subject: 'Your TradingBible payout is approved',
			preheader: '{{payoutAmount}} is approved for payout.',
			eyebrow: 'Funded evaluation',
			headerTag: 'Payout approved',
			title: 'Your payout is approved',
			body: [
				p('Hi {{firstName}}, your payout of {{payoutAmount}} has been approved.'),
				ul(
					'<strong>Amount:</strong> {{payoutAmount}}',
					'<strong>Expected date:</strong> {{payoutDate}}',
				),
				p('Open the dashboard to review the payout method, status and any remaining verification step.'),
				cta('{{dashboardUrl}}', 'View payout'),
				small('The payout is subject to the funded-account rules and the payment provider’s processing time. This email is not a bank confirmation.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour payout of {{payoutAmount}} has been approved.\n\nAmount: {{payoutAmount}}\nExpected date: {{payoutDate}}\n\nView payout: {{dashboardUrl}}\n\nThe payout is subject to the funded-account rules and the payment provider’s processing time.',
		},
		inApp: {
			title: 'Payout approved',
			body: '{{payoutAmount}} is approved. Expected date: {{payoutDate}}.',
			actionLabel: 'View payout',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'platform.prop-breach',
		category: 'platform',
		name: 'Evaluation rule breach',
		description: 'Rule-breach notice with the specific rule, evidence and reset path.',
		audience: 'Member',
		compliance: 'account',
		variables: ['firstName', 'dashboardUrl', 'supportEmail'],
		email: {
			subject: 'Important: evaluation rule breach',
			preheader: 'A rule was breached. Review the evidence and the reset options.',
			eyebrow: 'Funded evaluation',
			headerTag: 'Rule breach',
			title: 'Your evaluation has been paused',
			body: [
				p('Hi {{firstName}}, your evaluation has been paused because a rule was breached.'),
				ul(
					'<strong>Rule:</strong> [RULE]',
					'<strong>Evidence:</strong> [EVIDENCE]',
					'<strong>Account:</strong> [ACCOUNT REFERENCE]',
				),
				p('Open the dashboard to review the evidence and the available reset options. If you believe the decision is wrong, contact support with the account reference.'),
				cta('{{dashboardUrl}}', 'Review evaluation'),
				small('Do not open another account to avoid the rule. That can result in a permanent restriction.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour evaluation has been paused because a rule was breached.\n\nRule: [RULE]\nEvidence: [EVIDENCE]\nAccount: [ACCOUNT REFERENCE]\n\nReview the evidence and reset options: {{dashboardUrl}}\n\nIf you believe the decision is wrong, contact {{supportEmail}} with the account reference.',
		},
		inApp: {
			title: 'Evaluation rule breach',
			body: 'Your evaluation is paused. Review the rule, evidence and reset options.',
			actionLabel: 'Review evaluation',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'platform.academy-enrollment',
		category: 'platform',
		name: 'Academy enrollment',
		description: 'Course enrollment confirmation with start guidance.',
		audience: 'Student',
		compliance: 'transactional',
		variables: ['firstName', 'courseTitle', 'academyUrl'],
		email: {
			subject: 'You’re enrolled in {{courseTitle}}',
			preheader: 'Your Academy course is ready.',
			eyebrow: 'TradingBible Academy',
			headerTag: 'Enrollment confirmed',
			title: 'You’re enrolled in {{courseTitle}}',
			body: [
				p('Hi {{firstName}}, your enrollment in {{courseTitle}} is confirmed.'),
				p('Open the course to review the lessons, the lesson order and the final exam requirement. Your progress is saved to your Academy account.'),
				cta('{{academyUrl}}', 'Open Academy'),
				small('Academy education is not individualized investment advice. Trading involves risk, including the loss of capital.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour enrollment in {{courseTitle}} is confirmed.\n\nOpen the course: {{academyUrl}}\n\nYour progress is saved to your Academy account. Academy education is not individualized investment advice.',
		},
		inApp: {
			title: 'Academy enrollment confirmed',
			body: 'You’re enrolled in {{courseTitle}}. Open the course to begin.',
			actionLabel: 'Open Academy',
			href: '{{academyUrl}}',
		},
	}),
	template({
		id: 'platform.academy-certificate',
		category: 'platform',
		name: 'Academy certificate',
		description: 'Certificate-ready notice with a verification link.',
		audience: 'Student',
		compliance: 'transactional',
		variables: ['firstName', 'courseTitle', 'certificateUrl'],
		email: {
			subject: 'Your TradingBible Academy certificate is ready',
			preheader: '{{courseTitle}} certificate and verification link.',
			eyebrow: 'TradingBible Academy',
			headerTag: 'Certificate ready',
			title: 'Your certificate is ready',
			body: [
				p('Hi {{firstName}}, you completed {{courseTitle}}. Your certificate is ready.'),
				cta('{{certificateUrl}}', 'View certificate'),
				p('The certificate records completion of the course. It is not a licence, a professional designation or an endorsement by a regulator.'),
				small('You can share the verification link with an employer or client. The link shows the course and completion record, not your account data.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYou completed {{courseTitle}}. Your certificate is ready:\n{{certificateUrl}}\n\nThe certificate records completion of the course. It is not a licence, a professional designation or an endorsement by a regulator.',
		},
		inApp: {
			title: 'Academy certificate ready',
			body: 'Your {{courseTitle}} certificate is ready to view and share.',
			actionLabel: 'View certificate',
			href: '{{certificateUrl}}',
		},
	}),
	template({
		id: 'platform.affiliate-commission',
		category: 'platform',
		name: 'Affiliate commission approved',
		description: 'Commission approval with period, amount and payout date.',
		audience: 'Affiliate',
		compliance: 'transactional',
		variables: ['firstName', 'amount', 'payoutDate', 'dashboardUrl'],
		email: {
			subject: 'Your TradingBible affiliate commission is approved',
			preheader: '{{amount}} approved for the {{payoutDate}} payout.',
			eyebrow: 'Affiliate programme',
			headerTag: 'Commission approved',
			title: 'Your commission is approved',
			body: [
				p('Hi {{firstName}}, your affiliate commission has been approved.'),
				ul(
					'<strong>Amount:</strong> {{amount}}',
					'<strong>Payout date:</strong> {{payoutDate}}',
				),
				p('Open the affiliate dashboard to review the qualifying activity, the payout method and any hold period.'),
				cta('{{dashboardUrl}}', 'Open affiliate dashboard'),
				small('Commission is subject to the affiliate terms, refunds, chargebacks and fraud review. This email is not a guarantee of payment until the payout settles.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour affiliate commission has been approved.\n\nAmount: {{amount}}\nPayout date: {{payoutDate}}\n\nOpen the affiliate dashboard: {{dashboardUrl}}\n\nCommission is subject to the affiliate terms, refunds, chargebacks and fraud review.',
		},
		inApp: {
			title: 'Affiliate commission approved',
			body: '{{amount}} approved. Payout date: {{payoutDate}}.',
			actionLabel: 'Open affiliate dashboard',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'platform.support-received',
		category: 'platform',
		name: 'Support request received',
		description: 'Support acknowledgment with ticket reference and response expectation.',
		audience: 'Member',
		compliance: 'transactional',
		implementation: 'brand-shell',
		variables: ['firstName', 'ticketId', 'ticketSubject', 'supportEmail'],
		email: {
			subject: 'We received your TradingBible support request',
			preheader: 'Ticket {{ticketId}} is open.',
			eyebrow: 'Support',
			headerTag: 'Request received',
			title: 'We received your request',
			body: [
				p('Hi {{firstName}}, your support request has been received.'),
				ul(
					'<strong>Ticket:</strong> {{ticketId}}',
					'<strong>Subject:</strong> {{ticketSubject}}',
				),
				p('We usually reply within one business day. If your request is urgent, reply to this email with “URGENT” and the ticket number.'),
				small(`Do not send passwords, one-time codes, private keys or full bank details. Contact ${link('mailto:{{supportEmail}}', '{{supportEmail}}')} if you need to correct your request.`),
			].join(''),
			text: 'Hi {{firstName}},\n\nYour support request has been received.\n\nTicket: {{ticketId}}\nSubject: {{ticketSubject}}\n\nWe usually reply within one business day. If your request is urgent, reply with URGENT and the ticket number.',
		},
		sms: {
			body: 'TradingBible: Support request {{ticketId}} received. We usually reply within one business day. Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
	}),
	template({
		id: 'platform.support-reply',
		category: 'platform',
		name: 'Support reply',
		description: 'Support response notice that points back to the secure thread.',
		audience: 'Member',
		compliance: 'transactional',
		implementation: 'brand-shell',
		variables: ['firstName', 'ticketId', 'ticketSubject', 'supportEmail'],
		email: {
			subject: 'TradingBible support replied to your request',
			preheader: 'Ticket {{ticketId}} has a new reply.',
			eyebrow: 'Support',
			headerTag: 'New reply',
			title: 'Support replied to your request',
			body: [
				p('Hi {{firstName}}, there is a new reply on ticket {{ticketId}} ({{ticketSubject}}).'),
				p('Open the support thread in your account to read the full reply and respond securely.'),
				small(`If you cannot access the thread, contact ${link('mailto:{{supportEmail}}', '{{supportEmail}}')} from the email address on the account.`),
			].join(''),
			text: 'Hi {{firstName}},\n\nThere is a new reply on ticket {{ticketId}} ({{ticketSubject}}).\n\nOpen the support thread in your account to read the full reply and respond securely.\n\nIf you cannot access the thread, contact {{supportEmail}}.',
		},
		sms: {
			body: 'TradingBible: Support replied to ticket {{ticketId}}. Open your account to read the reply. Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
	}),

	// ── Investor relations ──────────────────────────────────────────────────
	template({
		id: 'investor.subscribe-confirm',
		category: 'investor',
		name: 'Investor updates confirmation',
		description: 'Double opt-in for company updates. No offering, no solicitation.',
		audience: 'Investor updates subscriber',
		compliance: 'marketing',
		implementation: 'brand-shell',
		variables: ['email', 'verificationUrl', 'unsubscribeUrl'],
		email: {
			subject: 'Confirm your TradingBible investor updates',
			preheader: 'Confirm the subscription. No offering is being made.',
			eyebrow: 'Investor relations',
			headerTag: 'Double opt-in',
			title: 'Confirm your investor updates',
			body: [
				p('You asked to receive TradingBible investor updates at {{email}}. Confirm the subscription below.'),
				cta('{{verificationUrl}}', 'Confirm subscription'),
				p('You will receive company updates, product milestones and public company records. This list is not an offering, a solicitation or a pre-qualification for any investment.'),
				small('If you did not request this, ignore the email. You will not be subscribed without confirmation.'),
			].join(''),
			text: 'You asked to receive TradingBible investor updates at {{email}}. Confirm the subscription:\n{{verificationUrl}}\n\nThis list is not an offering, a solicitation or a pre-qualification for any investment.\n\nIf you did not request this, ignore the email.\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
	}),
	template({
		id: 'investor.update',
		category: 'investor',
		name: 'Investor update',
		description: 'Company update to confirmed subscribers. No offer, no performance promise.',
		audience: 'Investor updates subscriber',
		compliance: 'marketing',
		variables: ['firstName', 'updateTitle', 'dashboardUrl', 'unsubscribeUrl'],
		email: {
			subject: 'TradingBible investor update — {{updateTitle}}',
			preheader: 'A company update for confirmed subscribers.',
			eyebrow: 'Investor relations',
			headerTag: 'Company update',
			title: '{{updateTitle}}',
			body: [
				p('Hi {{firstName}}, here is the latest TradingBible company update.'),
				p('[APPROVED UPDATE CONTENT]'),
				p('You can read the current company record and public documents in the investor relations area.'),
				cta('{{dashboardUrl}}', 'Read the update'),
				small('This update is not an offer to sell or a solicitation of an offer to buy securities. It is not investment advice and does not promise any result.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nHere is the latest TradingBible company update: {{updateTitle}}\n\n[APPROVED UPDATE CONTENT]\n\nRead more: {{dashboardUrl}}\n\nThis update is not an offer to sell or a solicitation of an offer to buy securities. It is not investment advice and does not promise any result.\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
	}),
	template({
		id: 'investor.inquiry-received',
		category: 'investor',
		name: 'Investor inquiry received',
		description: 'Acknowledgment of an investor inquiry with no offer language.',
		audience: 'Investor',
		compliance: 'transactional',
		implementation: 'brand-shell',
		variables: ['name', 'inquiryType', 'legalEmail'],
		email: {
			subject: 'We received your TradingBible investor inquiry',
			preheader: 'Your inquiry is with the investor relations team.',
			eyebrow: 'Investor relations',
			headerTag: 'Inquiry received',
			title: 'We received your inquiry',
			body: [
				p('Hi {{name}}, thank you for contacting TradingBible. Your {{inquiryType}} inquiry has been received.'),
				p('A member of the team will respond within two business days. Please do not send original documents, passwords, private keys or full bank details by email.'),
				small(`If your message is urgent, contact ${link('mailto:{{legalEmail}}', '{{legalEmail}}')} and include the same subject line.`),
			].join(''),
			text: 'Hi {{name}},\n\nThank you for contacting TradingBible. Your {{inquiryType}} inquiry has been received.\n\nA member of the team will respond within two business days. Please do not send original documents, passwords, private keys or full bank details by email.\n\nUrgent messages: {{legalEmail}}',
		},
	}),

	// ── Private fundraising ─────────────────────────────────────────────────
	template({
		id: 'fundraising.private-invite',
		category: 'fundraising-private',
		name: 'Private introduction',
		description: 'One-to-one introduction. No general solicitation, no attachment, no terms before eligibility.',
		audience: 'Pre-existing contact',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['firstName', 'callBookingUrl', 'legalEmail'],
		email: {
			subject: 'Confidential: TradingBible private introduction',
			preheader: 'A private, one-to-one conversation. No offer is being made by this email.',
			eyebrow: 'Confidential',
			headerTag: 'Private introduction',
			title: 'A private conversation about TradingBible',
			body: [
				p('Hi {{firstName}}, I am reaching out privately because of our existing relationship with you. We are preparing a possible private financing for TradingBible Holdings, Inc. and I would like to know whether a short conversation is appropriate.'),
				p('This email is not an offer to sell or a solicitation of an offer to buy securities. It is not a private placement memorandum, and it does not contain offering terms. Any discussion of terms will happen only after we confirm that you are eligible and after you receive the definitive documents.'),
				p('If you would like to speak, choose a time below. If this is not relevant, reply “not now” and I will not follow up.'),
				cta('{{callBookingUrl}}', 'Arrange a private call'),
				small('Please do not forward this email. TradingBible is not conducting general solicitation, and the information is confidential.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nI am reaching out privately because of our existing relationship. We are preparing a possible private financing for TradingBible Holdings, Inc. and I would like to know whether a short conversation is appropriate.\n\nThis email is not an offer to sell or a solicitation of an offer to buy securities. It is not a private placement memorandum, and it does not contain offering terms. Any discussion of terms will happen only after eligibility is confirmed and the definitive documents are provided.\n\nArrange a private call: {{callBookingUrl}}\n\nPlease do not forward this email. TradingBible is not conducting general solicitation.\n\nQuestions: {{legalEmail}}',
		},
	}),
	template({
		id: 'fundraising.private-follow-up',
		category: 'fundraising-private',
		name: 'Private follow-up',
		description: 'Follow-up after a private conversation. Eligibility and documents come first.',
		audience: 'Pre-existing contact',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['firstName', 'callBookingUrl', 'legalEmail'],
		email: {
			subject: 'Follow-up: TradingBible private conversation',
			preheader: 'Thank you for the conversation. The next step is eligibility, not a commitment.',
			eyebrow: 'Confidential',
			headerTag: 'Follow-up',
			title: 'Thank you for the conversation',
			body: [
				p('Hi {{firstName}}, thank you for taking the time to speak with me about TradingBible.'),
				p('As we discussed, the next step is to confirm eligibility and provide the definitive documents. Nothing in this email is an offer, and no investment can be accepted until the eligibility, risk and subscription process is complete.'),
				p('If you would like to continue, reply to this email or arrange a follow-up call. If you would prefer not to proceed, tell me and I will close the file.'),
				cta('{{callBookingUrl}}', 'Arrange a follow-up'),
				small('Do not send funds or bank details in response to this email. Funding instructions, if applicable, are delivered only through a separately verified channel.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nThank you for taking the time to speak with me about TradingBible.\n\nAs we discussed, the next step is to confirm eligibility and provide the definitive documents. Nothing in this email is an offer, and no investment can be accepted until the eligibility, risk and subscription process is complete.\n\nArrange a follow-up: {{callBookingUrl}}\n\nIf you would prefer not to proceed, tell me and I will close the file.\n\nDo not send funds or bank details in response to this email.\n\nQuestions: {{legalEmail}}',
		},
	}),
	template({
		id: 'fundraising.safe-signature-request',
		category: 'fundraising-private',
		name: 'SAFE signature request',
		description: 'DocuSign delivery notice for a verified investor. No funding details.',
		audience: 'Eligible investor',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['investorName', 'documentNumber', 'documentTitle', 'envelopeUrl', 'signingDeadline', 'legalEmail'],
		email: {
			subject: 'TradingBible SAFE ready for signature — {{documentNumber}}',
			preheader: 'Review and sign the controlled document through DocuSign.',
			eyebrow: 'DocuSign',
			headerTag: 'Signature required',
			title: 'Your SAFE is ready for signature',
			body: [
				p('Hi {{investorName}}, the controlled document {{documentNumber}} — {{documentTitle}} is ready for your review and signature.'),
				p('Open the DocuSign envelope and complete only the fields assigned to you. Do not sign a field allocated to another party.'),
				cta('{{envelopeUrl}}', 'Open DocuSign envelope'),
				ul(
					'<strong>Document:</strong> {{documentNumber}} — {{documentTitle}}',
					'<strong>Requested by:</strong> {{signingDeadline}}',
				),
				p('This email does not contain funding instructions. If you have not received separately verified funding instructions, do not send funds.'),
				small(`Questions about the document go to ${link('mailto:{{legalEmail}}', '{{legalEmail}}')}. Do not send passwords, one-time codes or private keys.`),
			].join(''),
			text: 'Hi {{investorName}},\n\nThe controlled document {{documentNumber}} — {{documentTitle}} is ready for your review and signature.\n\nOpen the DocuSign envelope and complete only the fields assigned to you:\n{{envelopeUrl}}\n\nRequested by: {{signingDeadline}}\n\nThis email does not contain funding instructions. If you have not received separately verified funding instructions, do not send funds.\n\nQuestions: {{legalEmail}}',
		},
	}),
	template({
		id: 'fundraising.safe-signature-reminder',
		category: 'fundraising-private',
		name: 'SAFE signature reminder',
		description: 'Short reminder for an unsigned envelope. No pressure, no wire details.',
		audience: 'Eligible investor',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['investorName', 'documentNumber', 'envelopeUrl', 'signingDeadline', 'legalEmail'],
		email: {
			subject: 'Reminder: TradingBible SAFE awaiting your signature',
			preheader: '{{documentNumber}} is still awaiting your signature.',
			eyebrow: 'DocuSign',
			headerTag: 'Reminder',
			title: 'Your signature is still pending',
			body: [
				p('Hi {{investorName}}, the DocuSign envelope for {{documentNumber}} is still awaiting your signature.'),
				p('If you intend to proceed, complete the fields assigned to you before {{signingDeadline}}. If you do not intend to proceed, reply and we will close the file.'),
				cta('{{envelopeUrl}}', 'Open DocuSign envelope'),
				small('This reminder is not a funding request. Do not send funds until you have a countersigned SAFE and have independently verified the funding instructions.'),
			].join(''),
			text: 'Hi {{investorName}},\n\nThe DocuSign envelope for {{documentNumber}} is still awaiting your signature.\n\nIf you intend to proceed, complete the fields assigned to you before {{signingDeadline}}:\n{{envelopeUrl}}\n\nIf you do not intend to proceed, reply and we will close the file.\n\nThis reminder is not a funding request. Do not send funds until you have a countersigned SAFE and have independently verified the funding instructions.\n\nQuestions: {{legalEmail}}',
		},
		sms: {
			body: 'TradingBible: Your SAFE {{documentNumber}} is awaiting signature. Open DocuSign: {{envelopeUrl}} Questions: {{legalEmail}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
	}),
	template({
		id: 'fundraising.safe-executed',
		category: 'fundraising-private',
		name: 'SAFE executed',
		description: 'Completed-signature notice with the next step separated from funding.',
		audience: 'Investor',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['investorName', 'documentNumber', 'documentTitle', 'closingDate', 'legalEmail'],
		email: {
			subject: 'TradingBible SAFE executed — {{documentNumber}}',
			preheader: 'Your signed document is complete. Funding instructions are separate.',
			eyebrow: 'DocuSign',
			headerTag: 'Executed',
			title: 'Your SAFE is executed',
			body: [
				p('Hi {{investorName}}, the DocuSign envelope for {{documentNumber}} — {{documentTitle}} is complete. A copy of the executed document and the certificate of completion is available in the envelope.'),
				p('Execution is not the same as funding or closing. If funding is applicable, the company will deliver instructions through a separate verified channel and will confirm them by a call-back to a known number.'),
				ul(
					'<strong>Document:</strong> {{documentNumber}}',
					'<strong>Target closing:</strong> {{closingDate}}',
				),
				small(`Questions go to ${link('mailto:{{legalEmail}}', '{{legalEmail}}')}. Do not send funds in response to an email that changes bank details.`),
			].join(''),
			text: 'Hi {{investorName}},\n\nThe DocuSign envelope for {{documentNumber}} — {{documentTitle}} is complete. A copy of the executed document and the certificate of completion is available in the envelope.\n\nExecution is not the same as funding or closing. If funding is applicable, the company will deliver instructions through a separate verified channel and will confirm them by a call-back to a known number.\n\nTarget closing: {{closingDate}}\n\nQuestions: {{legalEmail}}',
		},
		inApp: {
			title: 'SAFE executed',
			body: '{{documentNumber}} is complete. Funding instructions, if applicable, are delivered separately.',
			actionLabel: 'Open documents',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'fundraising.funding-instructions',
		category: 'fundraising-private',
		name: 'Funding instructions notice',
		description: 'Secure funding notice. It deliberately contains no bank details.',
		audience: 'Investor',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['investorName', 'purchaseAmount', 'fundingReference', 'companyPhone', 'legalEmail'],
		email: {
			subject: 'TradingBible funding instructions — verify by phone',
			preheader: 'No bank details in this email. Call the known number before sending funds.',
			eyebrow: 'Closing',
			headerTag: 'Funding instructions',
			title: 'Verify your funding instructions',
			body: [
				p('Hi {{investorName}}, your subscription has reached the funding step. The company will deliver the account details through a separate secure channel.'),
				p('This email deliberately does not contain bank details. Before sending any funds:'),
				ul(
					'<strong>Call the company</strong> at {{companyPhone}} using a number you already have, not a number in an email.',
					'<strong>Confirm the account name</strong> is TradingBible Holdings, Inc.',
					'<strong>Confirm the amount</strong> and the reference {{fundingReference}}.',
					'<strong>Record the name</strong> of the person who confirmed the instructions.',
				),
				p('If you cannot verify the instructions, do not send funds.'),
				small(`Report a suspicious message to ${link('mailto:{{legalEmail}}', '{{legalEmail}}')}. The company will never ask for your online banking password, one-time code or private key.`),
			].join(''),
			text: 'Hi {{investorName}},\n\nYour subscription has reached the funding step. The company will deliver the account details through a separate secure channel.\n\nThis email deliberately does not contain bank details. Before sending any funds:\n\n1. Call the company at {{companyPhone}} using a number you already have, not a number in an email.\n2. Confirm the account name is TradingBible Holdings, Inc.\n3. Confirm the amount and the reference {{fundingReference}}.\n4. Record the name of the person who confirmed the instructions.\n\nIf you cannot verify the instructions, do not send funds.\n\nReport a suspicious message to {{legalEmail}}.',
		},
	}),
	template({
		id: 'fundraising.closing-welcome',
		category: 'fundraising-private',
		name: 'Closing confirmation',
		description: 'Investor welcome after a completed closing. No performance promise.',
		audience: 'Investor',
		compliance: 'securities-private',
		implementation: 'restricted',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['investorName', 'documentNumber', 'closingDate', 'legalEmail'],
		email: {
			subject: 'Welcome to TradingBible Holdings, Inc.',
			preheader: 'Your closing is confirmed. Here is what happens next.',
			eyebrow: 'Investor relations',
			headerTag: 'Closing confirmed',
			title: 'Your closing is confirmed',
			body: [
				p('Hi {{investorName}}, your closing in the TradingBible private placement is confirmed.'),
				ul(
					'<strong>Document:</strong> {{documentNumber}}',
					'<strong>Closing date:</strong> {{closingDate}}',
				),
				p('You will receive company updates at the email address on file. Those updates are informational and are not an offer, a solicitation or a promise of any result.'),
				p('If your contact details, tax information or investment entity changes, tell us promptly so the register stays accurate.'),
				small(`Investor relations: ${link('mailto:{{legalEmail}}', '{{legalEmail}}')}. Do not send passwords, private keys or full bank details by email.`),
			].join(''),
			text: 'Hi {{investorName}},\n\nYour closing in the TradingBible private placement is confirmed.\n\nDocument: {{documentNumber}}\nClosing date: {{closingDate}}\n\nYou will receive company updates at the email address on file. Those updates are informational and are not an offer, a solicitation or a promise of any result.\n\nIf your contact details, tax information or investment entity changes, tell us promptly.\n\nInvestor relations: {{legalEmail}}',
		},
		inApp: {
			title: 'Closing confirmed',
			body: 'Your private placement closing is confirmed. Keep your investor details current.',
			actionLabel: 'Investor relations',
			href: '{{dashboardUrl}}',
		},
	}),

	// ── Regulation CF ───────────────────────────────────────────────────────
	template({
		id: 'fundraising.regcf-prelaunch-education',
		category: 'fundraising-regcf',
		name: 'Reg CF pre-launch education',
		description: 'Pre-qualification education only. No offer, no money, no allocation.',
		audience: 'Investor updates subscriber',
		compliance: 'securities-cf',
		implementation: 'counsel-gated',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['firstName', 'unsubscribeUrl', 'legalEmail'],
		email: {
			subject: 'TradingBible — Regulation CF preparation update',
			preheader: 'We are preparing, not offering. No money is being accepted.',
			eyebrow: 'Regulation CF',
			headerTag: 'Preparation only',
			title: 'We are preparing. We are not offering.',
			body: [
				p('Hi {{firstName}}, we are preparing for a possible Regulation CF offering. This email is an educational update only.'),
				p('No offer is being made, no money is being accepted and no allocation or reservation is available. Any offering will be made only through a FINRA-registered intermediary after the SEC qualifies the offering statement.'),
				p('If and when the campaign opens, the qualified offering statement and the intermediary’s page will contain the terms, risks and instructions. Do not send money in response to this email.'),
				small('This is not a solicitation of an offer to buy securities. The company may decide not to proceed.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nWe are preparing for a possible Regulation CF offering. This email is an educational update only.\n\nNo offer is being made, no money is being accepted and no allocation or reservation is available. Any offering will be made only through a FINRA-registered intermediary after the SEC qualifies the offering statement.\n\nIf and when the campaign opens, the qualified offering statement and the intermediary’s page will contain the terms, risks and instructions. Do not send money in response to this email.\n\nThis is not a solicitation of an offer to buy securities.\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
	}),
	template({
		id: 'fundraising.regcf-live',
		category: 'fundraising-regcf',
		name: 'Reg CF campaign live',
		description: 'Post-qualification campaign notice. Only after SEC qualification and portal launch.',
		audience: 'Investor updates subscriber',
		compliance: 'securities-cf',
		implementation: 'counsel-gated',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['firstName', 'offeringUrl', 'campaignDeadline', 'unsubscribeUrl', 'legalEmail'],
		email: {
			subject: 'TradingBible Regulation CF offering is live',
			preheader: 'The qualified offering statement and the registered intermediary’s page are open.',
			eyebrow: 'Regulation CF',
			headerTag: 'Campaign live',
			title: 'The Regulation CF campaign is open',
			body: [
				p('Hi {{firstName}}, the TradingBible Regulation CF campaign is open through the registered intermediary.'),
				p('Read the qualified offering statement before investing. It contains the offering terms, the risk factors, the use of proceeds and the investor-limit rules.'),
				cta('{{offeringUrl}}', 'Read the qualified offering'),
				ul(
					'<strong>Campaign deadline:</strong> {{campaignDeadline}}',
					'<strong>Intermediary:</strong> [REGISTERED INTERMEDIARY NAME]',
				),
				p('Investment is optional. Do not invest more than you can afford to lose, and do not invest based on this email alone.'),
				small('This email is not the offering statement. The qualified offering statement and the intermediary’s page control.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nThe TradingBible Regulation CF campaign is open through the registered intermediary.\n\nRead the qualified offering statement before investing. It contains the offering terms, the risk factors, the use of proceeds and the investor-limit rules:\n{{offeringUrl}}\n\nCampaign deadline: {{campaignDeadline}}\nIntermediary: [REGISTERED INTERMEDIARY NAME]\n\nInvestment is optional. Do not invest more than you can afford to lose, and do not invest based on this email alone.\n\nThis email is not the offering statement. The qualified offering statement and the intermediary’s page control.\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
		sms: {
			body: 'TradingBible: The Regulation CF campaign is open. Read the qualified offering statement before investing: {{offeringUrl}} Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: 'Regulation CF campaign live',
			body: 'Read the qualified offering statement and the intermediary’s page before investing.',
			actionLabel: 'Read the offering',
			href: '{{offeringUrl}}',
		},
	}),
	template({
		id: 'fundraising.regcf-reminder',
		category: 'fundraising-regcf',
		name: 'Reg CF closing reminder',
		description: 'Post-qualification deadline reminder. No pressure, no new claims.',
		audience: 'Investor updates subscriber',
		compliance: 'securities-cf',
		implementation: 'counsel-gated',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['firstName', 'offeringUrl', 'campaignDeadline', 'unsubscribeUrl'],
		email: {
			subject: 'TradingBible Regulation CF campaign — closing soon',
			preheader: 'The campaign closes on {{campaignDeadline}}. Review the qualified offering statement.',
			eyebrow: 'Regulation CF',
			headerTag: 'Deadline',
			title: 'The campaign closes soon',
			body: [
				p('Hi {{firstName}}, the TradingBible Regulation CF campaign is scheduled to close on {{campaignDeadline}}.'),
				p('This is a timing reminder, not a recommendation. If you have not read the qualified offering statement, do that before deciding. Investment is optional.'),
				cta('{{offeringUrl}}', 'Review the qualified offering'),
				small('Do not invest more than you can afford to lose. The intermediary’s investor-limit calculation controls.'),
			].join(''),
			text: 'Hi {{firstName}},\n\nThe TradingBible Regulation CF campaign is scheduled to close on {{campaignDeadline}}.\n\nThis is a timing reminder, not a recommendation. If you have not read the qualified offering statement, do that before deciding. Investment is optional.\n\nReview the qualified offering: {{offeringUrl}}\n\nDo not invest more than you can afford to lose. The intermediary’s investor-limit calculation controls.\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
	}),
	template({
		id: 'fundraising.regcf-closing',
		category: 'fundraising-regcf',
		name: 'Reg CF campaign closed',
		description: 'Post-campaign acknowledgment with reporting and refund guidance.',
		audience: 'Investor updates subscriber',
		compliance: 'securities-cf',
		implementation: 'counsel-gated',
		sendPolicy: 'test-only',
		requiresCounsel: true,
		variables: ['firstName', 'offeringUrl', 'unsubscribeUrl', 'legalEmail'],
		email: {
			subject: 'TradingBible Regulation CF campaign closed',
			preheader: 'Thank you. Here is what happens next.',
			eyebrow: 'Regulation CF',
			headerTag: 'Campaign closed',
			title: 'The campaign has closed',
			body: [
				p('Hi {{firstName}}, the TradingBible Regulation CF campaign has closed. Thank you for following the process.'),
				p('If you invested, the intermediary will confirm the status of your investment, any refund if the offering did not close, and the next reporting steps. If you did not invest, no action is needed.'),
				p('The company will meet its ongoing reporting obligations and will not treat the closing as the end of the compliance work.'),
				small(`Questions about your investment go to the registered intermediary. Company questions go to ${link('mailto:{{legalEmail}}', '{{legalEmail}}')}.`),
			].join(''),
			text: 'Hi {{firstName}},\n\nThe TradingBible Regulation CF campaign has closed. Thank you for following the process.\n\nIf you invested, the intermediary will confirm the status of your investment, any refund if the offering did not close, and the next reporting steps. If you did not invest, no action is needed.\n\nThe company will meet its ongoing reporting obligations and will not treat the closing as the end of the compliance work.\n\nCompany questions: {{legalEmail}}\n\nUnsubscribe: {{unsubscribeUrl}}',
		},
	}),

	// ── Internal operations ─────────────────────────────────────────────────
	template({
		id: 'internal.board-approval-required',
		category: 'internal',
		name: 'Board approval required',
		description: 'Internal action request for a board or committee decision.',
		audience: 'Director / officer',
		compliance: 'internal',
		variables: ['documentNumber', 'documentTitle', 'deadline', 'dashboardUrl'],
		email: {
			subject: '[Internal] Board approval required — {{documentNumber}}',
			preheader: '{{documentTitle}} is waiting for a decision.',
			eyebrow: 'Internal',
			headerTag: 'Action required',
			title: 'Board approval required',
			body: [
				p('{{documentTitle}} ({{documentNumber}}) is waiting for a board or committee decision.'),
				ul(
					'<strong>Document:</strong> {{documentNumber}} — {{documentTitle}}',
					'<strong>Requested by:</strong> {{deadline}}',
				),
				p('Open the controlled document, review the supporting evidence and record the decision in the execution register. Do not approve a document that still contains unresolved blanks or an unverified cap table.'),
				cta('{{dashboardUrl}}', 'Open the controlled document'),
				small('This is an internal governance message. It is not an investor communication.'),
			].join(''),
			text: '{{documentTitle}} ({{documentNumber}}) is waiting for a board or committee decision.\n\nDocument: {{documentNumber}} — {{documentTitle}}\nRequested by: {{deadline}}\n\nOpen the controlled document: {{dashboardUrl}}\n\nDo not approve a document that still contains unresolved blanks or an unverified cap table.\n\nThis is an internal governance message.',
		},
		inApp: {
			title: 'Board approval required',
			body: '{{documentNumber}} is waiting for a decision.',
			actionLabel: 'Open document',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'internal.docusign-complete',
		category: 'internal',
		name: 'DocuSign envelope completed',
		description: 'Internal completion notice with certificate and register instructions.',
		audience: 'Operations / finance',
		compliance: 'internal',
		variables: ['documentNumber', 'documentTitle', 'investorName', 'closingDate', 'dashboardUrl'],
		email: {
			subject: '[Internal] DocuSign envelope completed — {{documentNumber}}',
			preheader: 'Download the certificate, verify the fields and update the register.',
			eyebrow: 'Internal',
			headerTag: 'Envelope complete',
			title: 'DocuSign envelope completed',
			body: [
				p('The DocuSign envelope for {{documentNumber}} — {{documentTitle}} is complete.'),
				ul(
					'<strong>Signer:</strong> {{investorName}}',
					'<strong>Completion date:</strong> {{closingDate}}',
				),
				p('Download the certificate of completion and the completed PDF. Verify that every required field is complete and that no party signed another party’s block. Update the SAFE register and cap table only after the funding and closing conditions are satisfied.'),
				cta('{{dashboardUrl}}', 'Open execution register'),
				small('A completed envelope is not a regulatory approval, a funding confirmation or a closing certificate.'),
			].join(''),
			text: 'The DocuSign envelope for {{documentNumber}} — {{documentTitle}} is complete.\n\nSigner: {{investorName}}\nCompletion date: {{closingDate}}\n\nDownload the certificate of completion and the completed PDF. Verify that every required field is complete and that no party signed another party’s block. Update the SAFE register and cap table only after the funding and closing conditions are satisfied.\n\nOpen the execution register: {{dashboardUrl}}\n\nA completed envelope is not a regulatory approval, a funding confirmation or a closing certificate.',
		},
		inApp: {
			title: 'DocuSign envelope completed',
			body: '{{documentNumber}} is complete. Verify the fields and update the register.',
			actionLabel: 'Open register',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'internal.investor-docs-received',
		category: 'internal',
		name: 'Investor documents received',
		description: 'Internal checklist update for a new investor file.',
		audience: 'Operations / counsel',
		compliance: 'internal',
		variables: ['investorName', 'investorEmail', 'dashboardUrl'],
		email: {
			subject: '[Internal] Investor documents received — {{investorName}}',
			preheader: 'Eligibility, bad-actor and risk documents received. Review the open items.',
			eyebrow: 'Internal',
			headerTag: 'Investor file',
			title: 'Investor documents received',
			body: [
				p('Documents have been received for {{investorName}} ({{investorEmail}}).'),
				p('Review the file against the closing checklist:'),
				ul(
					'Accredited investor or Regulation S certificate',
					'Bad-actor questionnaire',
					'Risk disclosure and acknowledgment',
					'Tax form (W-9, W-8BEN or W-8BEN-E)',
					'DocuSign envelope and completed PDF',
					'Funding verification and closing approval',
				),
				cta('{{dashboardUrl}}', 'Open investor file'),
				small('Do not send funding instructions until the identity, eligibility and bank-detail verification are complete.'),
			].join(''),
			text: 'Documents have been received for {{investorName}} ({{investorEmail}}).\n\nReview the file against the closing checklist:\n- Accredited investor or Regulation S certificate\n- Bad-actor questionnaire\n- Risk disclosure and acknowledgment\n- Tax form (W-9, W-8BEN or W-8BEN-E)\n- DocuSign envelope and completed PDF\n- Funding verification and closing approval\n\nOpen investor file: {{dashboardUrl}}\n\nDo not send funding instructions until the identity, eligibility and bank-detail verification are complete.',
		},
		inApp: {
			title: 'Investor documents received',
			body: '{{investorName}} has new documents. Review the open closing items.',
			actionLabel: 'Open investor file',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'internal.form-d-deadline',
		category: 'internal',
		name: 'Form D deadline',
		description: 'Internal deadline reminder. Form D is a notice, not an approval.',
		audience: 'Finance / counsel',
		compliance: 'internal',
		variables: ['deadline', 'documentNumber', 'dashboardUrl'],
		email: {
			subject: '[Internal] Form D deadline — {{deadline}}',
			preheader: 'The 15-calendar-day Form D window is running.',
			eyebrow: 'Internal',
			headerTag: 'Filing deadline',
			title: 'Form D filing deadline',
			body: [
				p('The Form D filing window for the private placement is running. The deadline is {{deadline}}.'),
				p('Confirm the first-sale date, complete the filing worksheet and file through EDGAR. A Form D is a notice filing; it is not an SEC approval of the offering.'),
				ul(
					'<strong>Owner:</strong> [FILING OWNER]',
					'<strong>Worksheet:</strong> {{documentNumber}}',
					'<strong>Evidence:</strong> EDGAR confirmation and filed copy',
				),
				cta('{{dashboardUrl}}', 'Open filing worksheet'),
				small('If the deadline is at risk, escalate to the chief executive officer and counsel immediately.'),
			].join(''),
			text: 'The Form D filing window for the private placement is running. The deadline is {{deadline}}.\n\nConfirm the first-sale date, complete the filing worksheet and file through EDGAR. A Form D is a notice filing; it is not an SEC approval of the offering.\n\nOwner: [FILING OWNER]\nWorksheet: {{documentNumber}}\nEvidence: EDGAR confirmation and filed copy\n\nOpen filing worksheet: {{dashboardUrl}}\n\nIf the deadline is at risk, escalate to the chief executive officer and counsel immediately.',
		},
		sms: {
			body: 'TradingBible internal: Form D deadline {{deadline}}. Confirm first sale and file through EDGAR. Form D is a notice, not an approval. Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: 'Form D deadline',
			body: 'The Form D window closes {{deadline}}. Confirm the first-sale date and filing owner.',
			actionLabel: 'Open worksheet',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'internal.security-incident',
		category: 'internal',
		name: 'Security incident opened',
		description: 'Internal incident notice with severity, commander and containment instruction.',
		audience: 'Incident response team',
		compliance: 'internal',
		variables: ['severity', 'dashboardUrl', 'supportEmail'],
		email: {
			subject: '[Internal] Security incident opened — {{severity}}',
			preheader: 'Incident response is active. Do not discuss outside the response team.',
			eyebrow: 'Internal',
			headerTag: 'Security incident',
			title: 'Security incident opened',
			body: [
				p('A security incident has been opened at severity {{severity}}.'),
				p('The incident commander will coordinate containment, evidence preservation and communications. Do not discuss the incident outside the response team, and do not delete logs, messages or affected systems.'),
				ul(
					'<strong>Severity:</strong> {{severity}}',
					'<strong>Commander:</strong> [INCIDENT COMMANDER]',
					'<strong>Channel:</strong> [INCIDENT CHANNEL]',
				),
				cta('{{dashboardUrl}}', 'Open incident record'),
				small(`If you see unusual activity, report it to ${link('mailto:{{supportEmail}}', '{{supportEmail}}')} and preserve the evidence.`),
			].join(''),
			text: 'A security incident has been opened at severity {{severity}}.\n\nThe incident commander will coordinate containment, evidence preservation and communications. Do not discuss the incident outside the response team, and do not delete logs, messages or affected systems.\n\nSeverity: {{severity}}\nCommander: [INCIDENT COMMANDER]\nChannel: [INCIDENT CHANNEL]\n\nOpen incident record: {{dashboardUrl}}\n\nReport unusual activity to {{supportEmail}} and preserve the evidence.',
		},
		sms: {
			body: 'TradingBible internal: Security incident opened at {{severity}}. Join the incident channel. Do not delete logs. Reply STOP to opt out.',
			optOut: 'Reply STOP to opt out.',
		},
		inApp: {
			title: 'Security incident opened',
			body: 'Severity {{severity}}. Join the incident channel and preserve evidence.',
			actionLabel: 'Open incident',
			href: '{{dashboardUrl}}',
		},
	}),
	template({
		id: 'internal.employee-welcome',
		category: 'internal',
		name: 'Employee welcome',
		description: 'New-starter welcome with start details and first-day checklist.',
		audience: 'Employee',
		compliance: 'internal',
		variables: ['firstName', 'startDate', 'managerName', 'supportEmail'],
		email: {
			subject: 'Welcome to TradingBible, {{firstName}}',
			preheader: 'Your start date, manager and first-day checklist.',
			eyebrow: 'People operations',
			headerTag: 'New starter',
			title: 'Welcome to the team',
			body: [
				p('Hi {{firstName}}, we are looking forward to welcoming you to TradingBible.'),
				ul(
					'<strong>Start date:</strong> {{startDate}}',
					'<strong>Manager:</strong> {{managerName}}',
					'<strong>First day:</strong> check your email for the account setup link and complete the identity and policy acknowledgments.',
				),
				p('Bring your questions. The first week is for context, not performance.'),
				small(`If you have a onboarding question, contact ${link('mailto:{{supportEmail}}', '{{supportEmail}}')}.`),
			].join(''),
			text: 'Hi {{firstName}},\n\nWe are looking forward to welcoming you to TradingBible.\n\nStart date: {{startDate}}\nManager: {{managerName}}\n\nOn your first day, check your email for the account setup link and complete the identity and policy acknowledgments.\n\nOnboarding questions: {{supportEmail}}',
		},
		inApp: {
			title: 'Welcome to TradingBible',
			body: 'Your start date is {{startDate}}. Your manager is {{managerName}}.',
			actionLabel: 'Open onboarding',
			href: '{{dashboardUrl}}',
		},
	}),
];

export const communicationTemplateMap = new Map(
	COMMUNICATION_TEMPLATES.map((item) => [item.id, item]),
);

export function findCommunicationTemplate(id) {
	return communicationTemplateMap.get(String(id || '')) || null;
}

function interpolate(value, variables, { html = false } = {}) {
	return String(value || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
		const raw = variables?.[key] ?? SAMPLE_VARIABLES[key] ?? `[${key}]`;
		return html ? escapeHtml(raw) : String(raw);
	});
}

function templateWarnings(template, variables) {
	const warnings = [];
	const missing = (template.variables || []).filter((key) => !variables?.[key]);
	if (missing.length) warnings.push(`Using sample or placeholder values for: ${missing.join(', ')}.`);
	if (template.compliance === 'marketing' && !String(process.env.COMPANY_POSTAL_ADDRESS || '').trim()) {
		warnings.push('A physical postal address is required before a commercial email is sent. Set COMPANY_POSTAL_ADDRESS.');
	}
	if (template.requiresCounsel) {
		warnings.push('Counsel approval is required before this template can be used for a real investor communication.');
	}
	return warnings;
}

export function renderCommunicationTemplate(id, { channel = 'email', variables = {}, baseUrl = '' } = {}) {
	const template = findCommunicationTemplate(id);
	if (!template) {
		const err = new Error('Template not found');
		err.status = 404;
		throw err;
	}
	const vars = { ...SAMPLE_VARIABLES, ...(baseUrl ? { appUrl: baseUrl } : {}), ...(variables || {}) };
	const warnings = templateWarnings(template, vars);
	const result = {
		id: template.id,
		category: template.category,
		name: template.name,
		channel,
		compliance: template.compliance,
		implementation: template.implementation,
		sendPolicy: template.sendPolicy,
		requiresCounsel: Boolean(template.requiresCounsel),
		warnings,
		blockedReason: '',
	};

	if (channel === 'email') {
		if (!template.email) {
			const err = new Error('This template has no email copy');
			err.status = 422;
			throw err;
		}
		const marketing = template.compliance === 'marketing';
		const address = String(process.env.COMPANY_POSTAL_ADDRESS || '').trim();
		if (marketing && !address) {
			result.blockedReason = 'A physical postal address is required before a commercial email can be sent. Set COMPANY_POSTAL_ADDRESS.';
		}
		const subject = interpolate(template.email.subject, vars);
		const preheader = interpolate(template.email.preheader, vars);
		const title = interpolate(template.email.title || template.name, vars);
		const body = interpolate(template.email.body, vars, { html: true });
		const unsubscribeUrl = marketing
			? interpolate(template.email.unsubscribeUrl || vars.unsubscribeUrl || `${vars.appUrl}/unsubscribe`, vars)
			: '';
		result.subject = subject;
		result.preheader = preheader;
		result.html = brandShell({
			title,
			body,
			eyebrow: template.email.eyebrow,
			headerTag: template.email.headerTag,
			preheader,
			marketing,
			unsubscribeUrl,
			footerNote: template.compliance.startsWith('securities')
				? 'Confidential. This communication is not an offer unless the applicable legal gate has been satisfied.'
				: '',
		});
		result.text = interpolate(template.email.text || '', vars);
		return result;
	}

	if (channel === 'sms') {
		if (!template.sms) {
			const err = new Error('This template has no SMS copy');
			err.status = 422;
			throw err;
		}
		result.sms = interpolate(template.sms.body, vars);
		result.optOut = template.sms.optOut || '';
		result.blockedReason = 'SMS delivery is not configured. A provider, consent records and opt-out handling must be in place before sending.';
		return result;
	}

	if (channel === 'in-app') {
		if (!template.inApp) {
			const err = new Error('This template has no in-app copy');
			err.status = 422;
			throw err;
		}
		result.inApp = {
			title: interpolate(template.inApp.title, vars),
			body: interpolate(template.inApp.body, vars),
			actionLabel: interpolate(template.inApp.actionLabel || '', vars),
			href: interpolate(template.inApp.href || '', vars),
		};
		return result;
	}

	const err = new Error('Unknown channel');
	err.status = 422;
	throw err;
}

export function renderCommunicationsMarkdown({ category = '', fundraisingOnly = false } = {}) {
	const filtered = COMMUNICATION_TEMPLATES.filter((item) => {
		if (fundraisingOnly) return item.category.startsWith('fundraising');
		return !category || item.category === category;
	});
	const lines = [
		'# TradingBible communication templates',
		'',
		'Company: TradingBible Holdings, Inc.  ',
		'Brand: TradingBible  ',
		'Generated from the controlled communication registry.',
		'',
		'> These are controlled copy templates, not a send authorization. Fundraising templates are restricted and require counsel approval. SMS is design-only until a provider, consent records and opt-out handling exist.',
		'',
	];
	for (const item of filtered) {
		lines.push(`## ${item.name}`, '', `- ID: \`${item.id}\``, `- Category: ${item.category}`, `- Audience: ${item.audience}`, `- Compliance: ${item.compliance}`, `- Implementation: ${item.implementation}`, `- Channels: ${item.channels.join(', ')}`, '');
		if (item.email) {
			lines.push(`### Email`, '', `**Subject:** ${item.email.subject}`, '', `**Preheader:** ${item.email.preheader}`, '', item.email.body, '', `**Plain text:**`, '', '```text', item.email.text, '```', '');
		}
		if (item.sms) {
			lines.push(`### SMS`, '', `\`\`\`text`, item.sms.body, '```', '');
		}
		if (item.inApp) {
			lines.push(`### In-app`, '', `**Title:** ${item.inApp.title}`, '', `**Body:** ${item.inApp.body}`, '', `**Action:** ${item.inApp.actionLabel} → ${item.inApp.href}`, '');
		}
	}
	return lines.join('\n');
}
