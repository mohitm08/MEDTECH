import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Get the directory name of the current module
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Load environment variables explicitly from the backend directory
// ================= ENCODING DIAGNOSTIC START =================
import fs from 'fs';
console.log("-----------------------------------------");
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.log("❌ Dotenv Error:", result.error.message);
  } else {
    console.log("Parsed keys by dotenv:", Object.keys(result.parsed || {}));
  }

  // Raw read to check encoding issues
  const rawContent = fs.readFileSync(envPath, 'utf8');
  console.log(`Raw file character length: ${rawContent.length}`);
  if (rawContent.includes('\u0000')) {
    console.log("⚠️ WARNING: Your file contains null bytes. This means it is encoded in UTF-16 (PowerShell default) and CANNOT be read by dotenv!");
  }
} else {
  console.log("❌ File not found at standard path.");
}
console.log("-----------------------------------------");
// ================= ENCODING DIAGNOSTIC END =================
// Fallback if already inside the backend directory
if (!process.env.OPENROUTER_API_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all client connections
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded prescription images statically
const uploadPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadPath));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/reminders', reminderRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Medtech AI Backend Server is running.'
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});