const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./database/connection');
const { testConnection: testDefaultItemvalueConnection } = require('./database/defaultItemvalueConnection');
const fs = require('fs');
const path = require('path');

// อ่านไฟล์ config.env
const configPath = path.join(__dirname, '..', 'config.env');
const configContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
const config = {};

configContent.split('\n').forEach(line => {
	const trimmedLine = line.trim();
	// ข้าม comment และบรรทัดว่าง
	if (!trimmedLine || trimmedLine.startsWith('#')) {
		return;
	}
	
	const equalIndex = trimmedLine.indexOf('=');
	if (equalIndex > 0) {
		const key = trimmedLine.substring(0, equalIndex).trim();
		const value = trimmedLine.substring(equalIndex + 1).trim();
		if (key && value) {
			config[key] = value;
		}
	}
});

const app = express();
const PORT = config.PORT || 3104;

// Security middleware
app.use(helmet());
 // Ensure correct client IP when behind proxies (helps rate limiter)
app.set('trust proxy', 1);

// CORS configuration - allow multiple origins
const defaultOrigins = [
	'http://localhost:3014', 
	'http://localhost:3000',
	'http://192.168.0.94:3014',
	'http://192.168.0.94:3000',
	'http://192.168.0.222:3014',
	'http://192.168.0.222:3000'
];
const envOrigins = (config.CORS_ORIGIN || '')
	.split(',')
	.map(o => o.trim())
	.filter(Boolean);
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(cors({
	origin: function (origin, callback) {
		// Allow non-browser requests (no origin) and allowed origins
		if (!origin || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		// Also allow any IP in the 192.168.0.x network for development
		if (origin && origin.includes('192.168.0.')) {
			return callback(null, true);
		}
		// For development, allow all origins
		if (config.NODE_ENV === 'development') {
			return callback(null, true);
		}
		console.log('CORS blocked origin:', origin);
		return callback(new Error('Not allowed by CORS: ' + origin));
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting (relaxed and scoped)
const limiter = rateLimit({
	windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // default 1 minute
	max: parseInt(config.RATE_LIMIT_MAX_REQUESTS) || 1000, // allow higher burst
	standardHeaders: true,
	legacyHeaders: false,
	message: 'Too many requests from this IP, please try again later.',
	skip: (req) => {
		const env = (config.NODE_ENV || 'development').toLowerCase();
		if (env !== 'production') return true; // disable limiter in dev
		if ((req.originalUrl || '').startsWith('/health')) return true; // skip health
		const ip = req.ip || '';
		if (/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1|::ffff:192\.168\.0\.|192\.168\.0\.)/.test(ip)) return true; // local network
		return false;
	}
});
// apply limiter only to API routes
app.use('/api', limiter);

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const batchRoutes = require('./routes/routes/batches');
const materialRoutes = require('./routes/routes/materials');
const productionRoutes = require('./routes/routes/production');
const costRoutes = require('./routes/routes/costs');
const workplanRoutes = require('./routes/routes/workplans');
const pricesRoutes = require('./routes/routes/prices');
const rolesRoutes = require('./routes/routes/roles');

// API routes
app.use('/api/batches', batchRoutes);
app.use('/api/workplans', workplanRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/prices', pricesRoutes);
app.use('/api/roles', rolesRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({
		status: 'OK',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: config.NODE_ENV || 'development',
		allowedOrigins,
		clientIP: req.ip,
		clientOrigin: req.get('Origin')
	});
});

// Test endpoint for network connectivity
app.get('/test', (req, res) => {
	res.json({
		message: 'Backend is accessible from network',
		serverIP: '192.168.0.94',
		serverPort: PORT,
		clientIP: req.ip,
		clientOrigin: req.get('Origin'),
		timestamp: new Date().toISOString()
	});
});

// Root endpoint
app.get('/', (req, res) => {
	res.json({
		message: 'Production Cost Calculation API',
		version: '1.0.0',
		endpoints: {
			batches: '/api/batches',
			materials: '/api/materials',
			production: '/api/production',
			costs: '/api/costs',
			prices: '/api/prices',
			health: '/health'
		}
	});
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({
		error: 'Something went wrong!',
		message: err.message,
		timestamp: new Date().toISOString()
	});
});

// 404 handler
app.use('*', (req, res) => {
	res.status(404).json({
		error: 'Endpoint not found',
		path: req.originalUrl,
		timestamp: new Date().toISOString()
	});
});

// Test database connections
async function initializeServer() {
	try {
		console.log('🔌 Testing database connections...');
		
		// Test main database connection
		await testConnection();
		console.log('✅ Main database connected successfully');
		
		// Test default_itemvalue database connection
		await testDefaultItemvalueConnection();
		console.log('✅ Default Itemvalue database connected successfully');
		
		// Start server
		app.listen(PORT, '0.0.0.0', () => {
			console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
			console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
			console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
			console.log(`🌐 Allowed origins:`, allowedOrigins);
			console.log(`🔧 Environment: ${config.NODE_ENV || 'development'}`);
		});
	} catch (error) {
		console.error('❌ Failed to initialize server:', error.message);
		process.exit(1);
	}
}

// Initialize server
initializeServer();
