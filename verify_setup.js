const fs = require('fs');
const path = require('path');

console.log("================================================");
console.log("     MEDTECH AI - SYSTEM INTEGRITY CHECK        ");
console.log("================================================\n");

const backendFiles = [
  'package.json',
  'server.js',
  'config/db.js',
  'models/Prescription.js',
  'models/Reminder.js',
  'services/geminiService.js',
  'controllers/prescriptionController.js',
  'controllers/reminderController.js',
  'routes/prescriptionRoutes.js',
  'routes/reminderRoutes.js',
  'middleware/upload.js',
  '.env'
];

const frontendFiles = [
  'package.json',
  'index.html',
  'src/main.jsx',
  'src/App.jsx',
  'src/index.css',
  'src/components/PrescriptionScanner.jsx',
  'src/components/PrescriptionReview.jsx',
  'src/components/MedicationTimeline.jsx',
  'src/components/ReminderSystem.jsx'
];

const mobileFiles = [
  'package.json',
  'App.js',
  'config.js',
  'screens/DashboardScreen.js',
  'screens/ScannerScreen.js',
  'screens/ReviewScreen.js',
  'screens/HistoryScreen.js'
];

let missingCount = 0;

console.log("Checking backend server directory structure:");
backendFiles.forEach(file => {
  const filePath = path.join(__dirname, 'backend', file);
  if (fs.existsSync(filePath)) {
    console.log(`  [✓] backend/${file}`);
  } else {
    console.log(`  [✗] backend/${file} (MISSING)`);
    missingCount++;
  }
});

console.log("\nChecking frontend React directory structure:");
frontendFiles.forEach(file => {
  const filePath = path.join(__dirname, 'frontend', file);
  if (fs.existsSync(filePath)) {
    console.log(`  [✓] frontend/${file}`);
  } else {
    console.log(`  [✗] frontend/${file} (MISSING)`);
    missingCount++;
  }
});

console.log("\nChecking mobile React Native directory structure:");
mobileFiles.forEach(file => {
  const filePath = path.join(__dirname, 'mobile', file);
  if (fs.existsSync(filePath)) {
    console.log(`  [✓] mobile/${file}`);
  } else {
    console.log(`  [✗] mobile/${file} (MISSING)`);
    missingCount++;
  }
});

console.log("\n------------------------------------------------");
if (missingCount === 0) {
  console.log("  SUCCESS: All required files are located!");
  console.log("------------------------------------------------");
  process.exit(0);
} else {
  console.log(`  WARNING: ${missingCount} files are missing.`);
  console.log("------------------------------------------------");
  process.exit(1);
}
