const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./database/connection');
const fs = require('fs');
const path = require('path');

// อ่านไฟล์ config.env
const configPath = path.join(__dirname, '..', 'config.env');
const configContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
const config = {};

configContent.split('\n').forEach(line => {
	const [key, value] = line.split('=');
	if (key && value) {
		config[key.trim()] = value.trim();
	}
});

const app = express();
const PORT = config.PORT || 3104;

// Security middleware
app.use(helmet());

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

// Rate limiting
const limiter = rateLimit({
	windowMs: parseInt(config.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
	max: parseInt(config.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
	message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

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

// API routes
app.use('/api/batches', batchRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/costs', costRoutes);

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
	console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
	console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
	console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
	console.log(`🌐 Allowed origins:`, allowedOrigins);
	console.log(`🔧 Environment: ${config.NODE_ENV || 'development'}`);
});
