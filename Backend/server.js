const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs').promises;
const validator = require('validator');
const mimeTypes = require('mime-types');

const app = express();
const port = 3002;

// CORS Setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
const publicDir = path.join(__dirname, 'public');
const ensureDirExists = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`Directory ensured: ${dir}`);
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err.message);
  }
};
ensureDirExists(publicDir);
app.use(express.static(publicDir));

const uploadDir = path.join(__dirname, 'Uploads');
ensureDirExists(uploadDir);
app.use('/Uploads', express.static(uploadDir, {
  setHeaders: (res, path) => {
    res.setHeader('Content-Disposition', 'inline');
  }
}));

// PostgreSQL Pool
const pool = new Pool({
  user: 'postgres',
  host: 'postgres',
  database: 'new_employee_db',
  password: 'admin123',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000
});

// Setup Database
const setupDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ajay_table (
        id SERIAL PRIMARY KEY,
        emp_name VARCHAR(255) NOT NULL,
        emp_email VARCHAR(255) UNIQUE NOT NULL,
        emp_gender VARCHAR(20) NOT NULL,
        emp_marital_status VARCHAR(20) NOT NULL,
        emp_dob DATE NOT NULL,
        emp_mobile VARCHAR(20) NOT NULL,
        emp_alt_mobile VARCHAR(20),
        emp_aadhaar VARCHAR(20) UNIQUE NOT NULL,
        emp_pan VARCHAR(20) UNIQUE NOT NULL,
        emp_address TEXT NOT NULL,
        emp_city VARCHAR(100) NOT NULL,
        emp_state VARCHAR(100) NOT NULL,
        emp_zipcode VARCHAR(20) NOT NULL,
        emp_bank VARCHAR(255) NOT NULL,
        emp_account VARCHAR(50) NOT NULL,
        emp_ifsc VARCHAR(20) NOT NULL,
        emp_bank_branch VARCHAR(100) NOT NULL,
        emp_job_role VARCHAR(255) NOT NULL,
        emp_department VARCHAR(255) NOT NULL,
        emp_experience_status VARCHAR(20) NOT NULL,
        emp_joining_date DATE NOT NULL,
        emp_profile_pic VARCHAR(255),
        emp_ssc_doc VARCHAR(255),
        ssc_school VARCHAR(255) NOT NULL,
        ssc_year INTEGER NOT NULL,
        ssc_grade VARCHAR(20) NOT NULL,
        emp_inter_doc VARCHAR(255),
        inter_college VARCHAR(255) NOT NULL,
        inter_year INTEGER NOT NULL,
        inter_grade VARCHAR(20) NOT NULL,
        inter_branch VARCHAR(100) NOT NULL,
        emp_grad_doc VARCHAR(255),
        grad_college VARCHAR(255) NOT NULL,
        grad_year INTEGER NOT NULL,
        grad_grade VARCHAR(20) NOT NULL,
        grad_degree VARCHAR(100) NOT NULL,
        grad_branch VARCHAR(100) NOT NULL,
        resume VARCHAR(255),
        id_proof VARCHAR(255),
        signed_document VARCHAR(255),
        emp_terms_accepted BOOLEAN NOT NULL,
        primary_contact_name VARCHAR(255) NOT NULL,
        primary_contact_mobile VARCHAR(20) NOT NULL,
        primary_contact_relation VARCHAR(50) NOT NULL,
        primary_contact_email VARCHAR(255),
        secondary_contact_name VARCHAR(255),
        secondary_contact_mobile VARCHAR(20),
        secondary_contact_relation VARCHAR(50),
        secondary_contact_email VARCHAR(255),
        previous_employments JSONB,
        additional_educations JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table setup completed');
  } catch (err) {
    console.error('DB setup error:', err.stack || err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
  }
};
setupDatabase();

// Multer Storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDirExists(uploadDir);
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const sanitizedName = validator.escape(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(sanitizedName)}`;
    console.log(`Generated filename for ${file.fieldname}: ${uniqueName}`);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'emp_profile_pic': ['image/jpeg', 'image/png'],
      'emp_ssc_doc': ['application/pdf'],
      'emp_inter_doc': ['application/pdf'],
      'emp_grad_doc': ['application/pdf'],
      'resume': ['application/pdf'],
      'id_proof': ['application/pdf', 'image/jpeg', 'image/png'],
      'signed_document': ['application/pdf'],
      'emp_offer_letter_1': ['application/pdf'],
      'emp_offer_letter_2': ['application/pdf'],
      'emp_offer_letter_3': ['application/pdf'],
      'emp_relieving_letter_1': ['application/pdf'],
      'emp_relieving_letter_2': ['application/pdf'],
      'emp_relieving_letter_3': ['application/pdf'],
      'emp_experience_certificate_1': ['application/pdf'],
      'emp_experience_certificate_2': ['application/pdf'],
      'emp_experience_certificate_3': ['application/pdf'],
      'emp_extra_doc_4': ['application/pdf'],
      'emp_extra_doc_5': ['application/pdf']
    };
    console.log('Processing file:', file.fieldname, file.mimetype);
    const allowed = allowedTypes[file.fieldname] || ['application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      console.error(`Invalid file type for ${file.fieldname}: ${file.mimetype}`);
      return cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowed.join(', ')}`));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
}).fields([
  { name: 'emp_profile_pic', maxCount: 1 },
  { name: 'emp_ssc_doc', maxCount: 1 },
  { name: 'emp_inter_doc', maxCount: 1 },
  { name: 'emp_grad_doc', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'id_proof', maxCount: 1 },
  { name: 'signed_document', maxCount: 1 },
  { name: 'emp_offer_letter_1', maxCount: 1 },
  { name: 'emp_offer_letter_2', maxCount: 1 },
  { name: 'emp_offer_letter_3', maxCount: 1 },
  { name: 'emp_relieving_letter_1', maxCount: 1 },
  { name: 'emp_relieving_letter_2', maxCount: 1 },
  { name: 'emp_relieving_letter_3', maxCount: 1 },
  { name: 'emp_experience_certificate_1', maxCount: 1 },
  { name: 'emp_experience_certificate_2', maxCount: 1 },
  { name: 'emp_experience_certificate_3', maxCount: 1 },
  { name: 'emp_extra_doc_4', maxCount: 1 },
  { name: 'emp_extra_doc_5', maxCount: 1 }
]);

// File Cleanup
const cleanupFiles = async (files) => {
  if (!files) return;
  for (const fileArray of Object.values(files)) {
    for (const file of fileArray) {
      try {
        const filePath = path.join(uploadDir, file.filename);
        await fs.unlink(filePath);
        console.log(`Cleaned up file: ${filePath}`);
      } catch (err) {
        console.error('File cleanup error:', err.message);
      }
    }
  }
};

// Validation Functions
const validateField = (field, value, regex, errorMessage, required = true) => {
  if (required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === ''))) {
    throw new Error(`Missing or empty required field: ${field}`);
  }
  if (value && regex && !regex.test(value)) {
    throw new Error(`${errorMessage} for ${field}`);
  }
};

const validateOptionalField = (field, value, regex, errorMessage) => {
  if (value && regex && !regex.test(value)) {
    throw new Error(`${errorMessage} for ${field}`);
  }
};

const validateDate = (field, value, minDate, maxDate, errorMessage) => {
  if (!value && field !== 'emp_end_date_1') throw new Error(`Missing required date: ${field}`);
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error(`Invalid date format for ${field}`);
  if (minDate && date < minDate) throw new Error(`${errorMessage} for ${field}: too early`);
  if (maxDate && date > maxDate) throw new Error(`${errorMessage} for ${field}: too late`);
};

// Log Requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve Form Page
app.get('/', (req, res) => {
  if (req.get('host').includes('8083')) {
    res.sendFile(path.join(publicDir, 'form.html'));
  } else {
    res.sendFile(path.join(publicDir, 'view.html'));
  }
});

// Save Employee
app.post('/save-employee', async (req, res) => {
  let client;
  try {
    // Apply multer middleware
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return reject(new Error(`Multer error: ${err.message}`));
        } else if (err) {
          return reject(err);
        }
        resolve();
      });
    });

    client = await pool.connect();
    await client.query('BEGIN');

    console.log('Received /save-employee request');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? Object.keys(req.files) : 'No files');

    const MASAI = new Date();
    const indiaOffset = 330 * 60 * 1000;
    const indiaNow = new Date(now.getTime() + indiaOffset);

    // Required fields validation
    const requiredFields = [
      { field: 'emp_name', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Name must be 3-60 alphabetic characters with single spaces' },
      { field: 'emp_email', regex: /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*@(gmail|outlook)\.(com|in|org|co)$/, error: 'Invalid email format' },
      { field: 'emp_gender', regex: /^(Male|Female|Others)$/, error: 'Invalid gender' },
      { field: 'emp_marital_status', regex: /^(Single|Married|Divorced|Widowed)$/, error: 'Invalid marital status' },
      { field: 'emp_dob', error: 'Invalid date of birth' },
      { field: 'emp_mobile', regex: /^[6789]\d{9}$/, error: 'Invalid 10-digit mobile number' },
      { field: 'emp_aadhaar', regex: /^\d{12}$/, error: 'Aadhaar must be 12 digits' },
      { field: 'emp_pan', regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, error: 'PAN must be 10 alphanumeric characters' },
      { field: 'emp_address', regex: /^[A-Za-z0-9][A-Za-z0-9\s,.\-\/#]+[A-Za-z0-9]$/, error: 'Address must be 5-80 characters' },
      { field: 'emp_city', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid city name' },
      { field: 'emp_state', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid state' },
      { field: 'emp_zipcode', regex: /^[1-9][0-9]{5}$/, error: 'Invalid 6-digit zip code' },
      { field: 'emp_bank', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid bank name' },
      { field: 'emp_account', regex: /^(?!0+$)[0-9]{9,18}$/, error: 'Account number must be 9-18 digits' },
      { field: 'emp_ifsc', regex: /^[A-Z]{4}0[A-Z0-9]{6}$/, error: 'Invalid IFSC code' },
      { field: 'emp_bank_branch', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid branch location' },
      { field: 'emp_job_role', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid job role' },
      { field: 'emp_department', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid department' },
      { field: 'emp_experience_status', regex: /^(Fresher|Experienced)$/, error: 'Invalid experience status' },
      { field: 'emp_joining_date', error: 'Invalid joining date' },
      { field: 'ssc_school', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid school name' },
      { field: 'ssc_year', regex: /^(19|20)\d{2}$/, error: 'Invalid SSC year' },
      { field: 'ssc_grade', regex: /^(\d{1,2}(\.\d)?%?|10\.0|4\.0)$/, error: 'Invalid SSC grade (4-100% or 4.0-10.0)' },
      { field: 'inter_college', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid college name' },
      { field: 'inter_year', regex: /^(19|20)\d{2}$/, error: 'Invalid intermediate year' },
      { field: 'inter_grade', regex: /^(\d{1,2}(\.\d)?%?|10\.0|4\.0)$/, error: 'Invalid intermediate grade (4-100% or 4.0-10.0)' },
      { field: 'inter_branch', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid branch' },
      { field: 'grad_college', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid college name' },
      { field: 'grad_year', regex: /^(19|20)\d{2}$/, error: 'Invalid graduation year' },
      { field: 'grad_grade', regex: /^(\d{1,2}(\.\d)?%?|10\.0|4\.0)$/, error: 'Invalid graduation grade (4-100% or 4.0-10.0)' },
      { field: 'grad_degree', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid degree' },
      { field: 'grad_branch', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid branch' },
      { field: 'primary_contact_name', regex: /^[A-Za-z]+(?: [A-Za-z]+)*$/, error: 'Invalid contact name' },
      { field: 'primary_contact_mobile', regex: /^[6789]\d{9}$/, error: 'Invalid 10-digit mobile number' },
      { field: 'primary_contact_relation', regex: /^(Parent|Spouse|Sibling|Friend|Other)$/, error: 'Invalid relation' },
      { field: 'emp_terms_accepted', regex: /^(true|on)$/, error: 'Terms must be accepted' }
    ];

    requiredFields.forEach(({ field, regex, error }) => {
      validateField(field, req.body[field], regex, error);
    });

    // Optional fields validation
    validateOptionalField('emp_alt_mobile', req.body.emp_alt_mobile, /^[6789]\d{9}$/, 'Invalid 10-digit mobile number');
    validateOptionalField('primary_contact_email', req.body.primary_contact_email, /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*@(gmail|outlook)\.(com|in|org|co)$/, 'Invalid email format');
    validateOptionalField('secondary_contact_name', req.body.secondary_contact_name, /^[A-Za-z]+(?: [A-Za-z]+)*$/, 'Invalid contact name');
    validateOptionalField('secondary_contact_mobile', req.body.secondary_contact_mobile, /^[6789]\d{9}$/, 'Invalid 10-digit mobile number');
    validateOptionalField('secondary_contact_email', req.body.secondary_contact_email, /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*@(gmail|outlook)\.(com|in|org|co)$/, 'Invalid email format');
    validateOptionalField('secondary_contact_relation', req.body.secondary_contact_relation, /^(Parent|Spouse|Sibling|Friend|Other)$/, 'Invalid relation');

    // Date validations
    const dob = new Date(req.body.emp_dob);
    const minDob = new Date(indiaNow.getFullYear() - 60, indiaNow.getMonth(), indiaNow.getDate());
    const maxDob = new Date(indiaNow.getFullYear() - 20, indiaNow.getMonth(), indiaNow.getDate());
    validateDate('emp_dob', req.body.emp_dob, minDob, maxDob, 'Employee must be 20-60 years old');

    const joiningDate = new Date(req.body.emp_joining_date);
    const minJoining = indiaNow;
    const maxJoining = new Date(indiaNow.getFullYear(), indiaNow.getMonth() + 6, indiaNow.getDate());
    validateDate('emp_joining_date', req.body.emp_joining_date, minJoining, maxJoining, 'Joining date must be within 6 months');

    const sscYear = parseInt(req.body.ssc_year);
    if (sscYear < dob.getFullYear() + 12 || sscYear > indiaNow.getFullYear()) {
      throw new Error(`SSC year must be between ${dob.getFullYear() + 12} and ${indiaNow.getFullYear()}`);
    }

    const interYear = parseInt(req.body.inter_year);
    if (interYear < sscYear + 2 || interYear > indiaNow.getFullYear()) {
      throw new Error(`Intermediate year must be at least 2 years after SSC (${sscYear + 2}-${indiaNow.getFullYear()})`);
    }

    const gradYear = parseInt(req.body.grad_year);
    if (gradYear < interYear + 3 || gradYear > indiaNow.getFullYear() + 2) {
      throw new Error(`Graduation year must be at least 3 years after Intermediate (${interYear + 3}-${indiaNow.getFullYear() + 2})`);
    }

    // Validate required files
    const requiredFiles = [
      'emp_ssc_doc', 'emp_inter_doc', 'emp_grad_doc', 'resume', 'id_proof', 'signed_document'
    ];
    if (req.body.emp_experience_status === 'Experienced') {
      requiredFiles.push('emp_offer_letter_1', 'emp_relieving_letter_1');
    }
    const missingFiles = requiredFiles.filter(field => !req.files[field]?.[0]?.filename);
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    // Process file fields
    const fileFields = [
      'emp_profile_pic', 'emp_ssc_doc', 'emp_inter_doc', 'emp_grad_doc',
      'resume', 'id_proof', 'signed_document'
    ];
    const fileValues = {};
    fileFields.forEach(field => {
      fileValues[field] = req.files[field]?.[0]?.filename ? `/Uploads/${req.files[field][0].filename}` : null;
    });

    // Process previous employments
    let previousEmployments = [];
    if (req.body.emp_experience_status === 'Experienced') {
      for (let i = 1; i <= 3; i++) {
        if (req.body[`emp_company_name_${i}`]) {
          const expFields = [
            `emp_company_name_${i}`, `emp_years_of_experience_${i}`, `emp_start_date_${i}`,
            `emp_end_date_${i}`, `emp_uan_${i}`, `emp_pf_${i}`
          ];
          const missingExpFields = expFields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
          });
          if (missingExpFields.length > 0) {
            throw new Error(`Missing experience fields for employment ${i}: ${missingExpFields.join(', ')}`);
          }
          const offerLetter = req.files[`emp_offer_letter_${i}`]?.[0]?.filename ? `/Uploads/${req.files[`emp_offer_letter_${i}`][0].filename}` : null;
          const relievingLetter = req.files[`emp_relieving_letter_${i}`]?.[0]?.filename ? `/Uploads/${req.files[`emp_relieving_letter_${i}`][0].filename}` : null;
          const experienceCertificate = req.files[`emp_experience_certificate_${i}`]?.[0]?.filename ? `/Uploads/${req.files[`emp_experience_certificate_${i}`][0].filename}` : null;

          const employment = {
            company_name: validator.escape(req.body[`emp_company_name_${i}`]),
            years_of_experience: parseFloat(req.body[`emp_years_of_experience_${i}`]),
            start_date: req.body[`emp_start_date_${i}`],
            end_date: req.body[`emp_end_date_${i}`],
            uan: validator.escape(req.body[`emp_uan_${i}`]),
            pf: validator.escape(req.body[`emp_pf_${i}`]),
            offer_letter: offerLetter,
            relieving_letter: relievingLetter,
            experience_certificate: experienceCertificate
          };

          // Validate employment fields
          validateField(`emp_company_name_${i}`, employment.company_name, /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/, 'Company name must be 3-60 characters');
          if (isNaN(employment.years_of_experience) || employment.years_of_experience < 0.1 || employment.years_of_experience > 40) {
            throw new Error(`Invalid years of experience for employment ${i} (0.1-40)`);
          }
          validateDate(`emp_start_date_${i}`, employment.start_date, new Date(sscYear + 1, 0, 1), indiaNow, 'Start date must be after SSC completion');
          validateDate(`emp_end_date_${i}`, employment.end_date, new Date(new Date(employment.start_date).setMonth(new Date(employment.start_date).getMonth() + 1)), indiaNow, 'End date must be at least 1 month after start date');
          validateField(`emp_uan_${i}`, employment.uan, /^\d{12}$/, 'UAN must be 12 digits');
          validateField(`emp_pf_${i}`, employment.pf, /^[A-Z0-9]{17}$/, 'PF number must be 17 alphanumeric characters');
          if (!employment.offer_letter) throw new Error(`Missing offer letter for employment ${i}`);
          if (!employment.relieving_letter) throw new Error(`Missing relieving letter for employment ${i}`);

          previousEmployments.push(employment);
        }
      }
      if (previousEmployments.length === 0) {
        throw new Error('At least one previous employment is required for Experienced status');
      }
    }

    // Process additional educations
    let additionalEducations = [];
    for (let i = 4; i <= 5; i++) {
      if (req.body[`extra_college_${i}`]) {
        const eduFields = [
          `extra_college_${i}`, `extra_year_${i}`, `extra_grade_${i}`,
          `extra_degree_${i}`, `extra_branch_${i}`
        ];
        const missingEduFields = eduFields.filter(field => {
          const value = req.body[field];
          return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
        });
        const certificate = req.files[`emp_extra_doc_${i}`]?.[0]?.filename ? `/Uploads/${req.files[`emp_extra_doc_${i}`][0].filename}` : null;
        if (missingEduFields.length > 0 || !certificate) {
          throw new Error(`Missing education fields or certificate for education ${i-2}: ${missingEduFields.join(', ')}`);
        }
        const education = {
          college: validator.escape(req.body[`extra_college_${i}`]),
          year: parseInt(req.body[`extra_year_${i}`]),
          grade: validator.escape(req.body[`extra_grade_${i}`]),
          degree: validator.escape(req.body[`extra_degree_${i}`]),
          branch: validator.escape(req.body[`extra_branch_${i}`]),
          certificate
        };

        // Validate education fields
        validateField(`extra_college_${i}`, education.college, /^[A-Za-z]+(?: [A-Za-z]+)*$/, 'College name must be 3-60 characters');
        if (isNaN(education.year) || education.year < gradYear || education.year > indiaNow.getFullYear() + 2) {
          throw new Error(`Invalid year for education ${i} (${gradYear}-${indiaNow.getFullYear() + 2})`);
        }
        validateField(`extra_grade_${i}`, education.grade, /^(\d{1,2}(\.\d)?%?|10\.0|4\.0)$/, 'Grade must be 4-100% or 4.0-10.0');
        validateField(`extra_degree_${i}`, education.degree, /^[A-Za-z]+(?: [A-Za-z]+)*$/, 'Degree must be 3-30 characters');
        validateField(`extra_branch_${i}`, education.branch, /^[A-Za-z]+(?: [A-Za-z]+)*$/, 'Branch must be 3-30 characters');

        additionalEducations.push(education);
      }
    }

    // Validate mobile number uniqueness
    const mobileNumbers = [
      req.body.emp_mobile,
      req.body.emp_alt_mobile,
      req.body.primary_contact_mobile,
      req.body.secondary_contact_mobile
    ].filter(num => num);
    if (new Set(mobileNumbers).size !== mobileNumbers.length) {
      throw new Error('Duplicate mobile numbers detected');
    }

    // Prepare insert columns and values
    const insertColumns = [
      'emp_name', 'emp_email', 'emp_gender', 'emp_marital_status', 'emp_dob', 'emp_mobile',
      'emp_alt_mobile', 'emp_aadhaar', 'emp_pan', 'emp_address', 'emp_city', 'emp_state',
      'emp_zipcode', 'emp_bank', 'emp_account', 'emp_ifsc', 'emp_bank_branch', 'emp_job_role',
      'emp_department', 'emp_experience_status', 'emp_joining_date', 'emp_profile_pic',
      'emp_ssc_doc', 'ssc_school', 'ssc_year', 'ssc_grade', 'emp_inter_doc', 'inter_college',
      'inter_year', 'inter_grade', 'inter_branch', 'emp_grad_doc', 'grad_college', 'grad_year',
      'grad_grade', 'grad_degree', 'grad_branch', 'resume', 'id_proof', 'signed_document',
      'emp_terms_accepted', 'primary_contact_name', 'primary_contact_mobile',
      'primary_contact_relation', 'primary_contact_email', 'secondary_contact_name',
      'secondary_contact_mobile', 'secondary_contact_relation', 'secondary_contact_email',
      'previous_employments', 'additional_educations'
    ];

    const values = [
      validator.escape(req.body.emp_name),
      validator.escape(req.body.emp_email),
      validator.escape(req.body.emp_gender),
      validator.escape(req.body.emp_marital_status),
      req.body.emp_dob,
      validator.escape(req.body.emp_mobile),
      req.body.emp_alt_mobile ? validator.escape(req.body.emp_alt_mobile) : null,
      validator.escape(req.body.emp_aadhaar),
      validator.escape(req.body.emp_pan),
      validator.escape(req.body.emp_address),
      validator.escape(req.body.emp_city),
      validator.escape(req.body.emp_state),
      validator.escape(req.body.emp_zipcode),
      validator.escape(req.body.emp_bank),
      validator.escape(req.body.emp_account),
      validator.escape(req.body.emp_ifsc),
      validator.escape(req.body.emp_bank_branch),
      validator.escape(req.body.emp_job_role),
      validator.escape(req.body.emp_department),
      validator.escape(req.body.emp_experience_status),
      req.body.emp_joining_date,
      fileValues.emp_profile_pic,
      fileValues.emp_ssc_doc,
      validator.escape(req.body.ssc_school),
      parseInt(req.body.ssc_year) || 0,
      validator.escape(req.body.ssc_grade),
      fileValues.emp_inter_doc,
      validator.escape(req.body.inter_college),
      parseInt(req.body.inter_year) || 0,
      validator.escape(req.body.inter_grade),
      validator.escape(req.body.inter_branch),
      fileValues.emp_grad_doc,
      validator.escape(req.body.grad_college),
      parseInt(req.body.grad_year) || 0,
      validator.escape(req.body.grad_grade),
      validator.escape(req.body.grad_degree),
      validator.escape(req.body.grad_branch),
      fileValues.resume,
      fileValues.id_proof,
      fileValues.signed_document,
      req.body.emp_terms_accepted === 'true' || req.body.emp_terms_accepted === 'on',
      validator.escape(req.body.primary_contact_name),
      validator.escape(req.body.primary_contact_mobile),
      validator.escape(req.body.primary_contact_relation),
      req.body.primary_contact_email ? validator.escape(req.body.primary_contact_email) : null,
      req.body.secondary_contact_name ? validator.escape(req.body.secondary_contact_name) : null,
      req.body.secondary_contact_mobile ? validator.escape(req.body.secondary_contact_mobile) : null,
      req.body.secondary_contact_relation ? validator.escape(req.body.secondary_contact_relation) : null,
      req.body.secondary_contact_email ? validator.escape(req.body.secondary_contact_email) : null,
      previousEmployments.length > 0 ? JSON.stringify(previousEmployments) : null,
      additionalEducations.length > 0 ? JSON.stringify(additionalEducations) : null
    ];

    // Check for undefined values
    const undefinedValues = values.map((value, index) => ({
      column: insertColumns[index],
      value
    })).filter(item => item.value === undefined);
    if (undefinedValues.length > 0) {
      console.error('Undefined values detected:', undefinedValues);
      throw new Error(`Undefined values for columns: ${undefinedValues.map(item => item.column).join(', ')}`);
    }

    console.log('Insert columns:', insertColumns);
    console.log('Insert values:', values.map((v, i) => ({ column: insertColumns[i], value: v })));

    // Insert into database
    const result = await client.query(`
      INSERT INTO ajay_table (
        ${insertColumns.join(', ')}
      ) VALUES (
        ${insertColumns.map((_, i) => `$${i + 1}`).join(', ')}
      )
      RETURNING id
    `, values);

    await client.query('COMMIT');
    console.log(`Employee ${req.body.emp_email} inserted with ID ${result.rows[0].id}`);
    res.status(201).json({
      success: true,
      data: { employeeId: result.rows[0].id }
    });
  } catch (err) {
    await client?.query('ROLLBACK');
    await cleanupFiles(req.files);
    console.error('Save employee error:', {
      message: err.message,
      stack: err.stack,
      reqBody: req.body,
      reqFiles: req.files,
      errorCode: err.code,
      errorConstraint: err.constraint
    });
    if (err.code === '23505') {
      const field = err.constraint.includes('emp_email') ? 'Email' :
        err.constraint.includes('emp_aadhaar') ? 'Aadhaar' :
        err.constraint.includes('emp_pan') ? 'PAN' : 'Field';
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }
    res.status(400).json({
      success: false,
      error: err.message,
      details: {
        message: err.message,
        stack: err.stack,
        code: err.code,
        constraint: err.constraint
      }
    });
  } finally {
    if (client) client.release();
  }
});

// Get Employees with Document URLs
app.get('/employees', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    console.log('Fetching employees...');
    const result = await client.query('SELECT * FROM ajay_table ORDER BY created_at DESC');
    console.log(`Found ${result.rows.length} employees`);
    const employees = result.rows.map(emp => {
      const employeeData = { ...emp };
      const documentFields = [
        'emp_profile_pic', 'emp_ssc_doc', 'emp_inter_doc',
        'emp_grad_doc', 'resume', 'id_proof', 'signed_document'
      ];
      documentFields.forEach(field => {
        if (employeeData[field]) {
          employeeData[`${field}_url`] = `${req.protocol}://${req.get('host')}${employeeData[field]}`;
        }
      });
      if (employeeData.previous_employments) {
        const employments = typeof employeeData.previous_employments === 'string'
          ? JSON.parse(employeeData.previous_employments)
          : employeeData.previous_employments;
        employeeData.previous_employments = employments.map(exp => ({
          ...exp,
          offer_letter_url: exp.offer_letter ? `${req.protocol}://${req.get('host')}${exp.offer_letter}` : null,
          relieving_letter_url: exp.relieving_letter ? `${req.protocol}://${req.get('host')}${exp.relieving_letter}` : null,
          experience_certificate_url: exp.experience_certificate ? `${req.protocol}://${req.get('host')}${exp.experience_certificate}` : null
        }));
      }
      if (employeeData.additional_educations) {
        const educations = typeof employeeData.additional_educations === 'string'
          ? JSON.parse(employeeData.additional_educations)
          : employeeData.additional_educations;
        employeeData.additional_educations = educations.map(edu => ({
          ...edu,
          certificate_url: edu.certificate ? `${req.protocol}://${req.get('host')}${edu.certificate}` : null
        }));
      }
      return employeeData;
    });
    res.json({ success: true, data: employees });
  } catch (err) {
    console.error('Fetch employees error:', err.stack || err.message);
    res.status(500).json({
      success: false,
      error: `Database error: ${err.message}`
    });
  } finally {
    if (client) client.release();
  }
});

// Get Single Employee by ID
app.get('/employees/:id', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const { id } = req.params;
    console.log(`Fetching employee with ID: ${id}`);
    const result = await client.query('SELECT * FROM ajay_table WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      console.log(`Employee with ID ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    const employee = result.rows[0];
    const employeeData = { ...employee };
    const documentFields = [
      'emp_profile_pic', 'emp_ssc_doc', 'emp_inter_doc',
      'emp_grad_doc', 'resume', 'id_proof', 'signed_document'
    ];
    documentFields.forEach(field => {
      if (employeeData[field]) {
        employeeData[`${field}_url`] = `${req.protocol}://${req.get('host')}${employeeData[field]}`;
      }
    });
    if (employeeData.previous_employments) {
      const employments = typeof employeeData.previous_employments === 'string'
        ? JSON.parse(employeeData.previous_employments)
        : employeeData.previous_employments;
      employeeData.previous_employments = employments.map(exp => ({
        ...exp,
        offer_letter_url: exp.offer_letter ? `${req.protocol}://${req.get('host')}${exp.offer_letter}` : null,
        relieving_letter_url: exp.relieving_letter ? `${req.protocol}://${req.get('host')}${exp.relieving_letter}` : null,
        experience_certificate_url: exp.experience_certificate ? `${req.protocol}://${req.get('host')}${exp.experience_certificate}` : null
      }));
    }
    if (employeeData.additional_educations) {
      const educations = typeof employeeData.additional_educations === 'string'
        ? JSON.parse(employeeData.additional_educations)
        : employeeData.additional_educations;
      employeeData.additional_educations = educations.map(edu => ({
        ...edu,
        certificate_url: edu.certificate ? `${req.protocol}://${req.get('host')}${edu.certificate}` : null
      }));
    }
    res.json({ success: true, data: employeeData });
  } catch (err) {
    console.error('Fetch employee error:', err.stack || err.message);
    res.status(500).json({
      success: false,
      error: `Database error: ${err.message}`
    });
  } finally {
    if (client) client.release();
  }
});

// Get Document URLs for an Employee
app.post('/get-documents', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    const { empEmail } = req.body;
    console.log(`Fetching documents for employee: ${empEmail}`);
    if (!empEmail || typeof empEmail !== 'string' || empEmail.trim() === '') {
      console.warn('Get documents request failed: empEmail is required');
      return res.status(400).json({
        success: false,
        error: 'Employee email is required'
      });
    }
    const result = await client.query(
      'SELECT * FROM ajay_table WHERE emp_email = $1',
      [validator.escape(empEmail)]
    );
    if (result.rows.length === 0) {
      console.warn(`No employee found with email: ${empEmail}`);
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    const employee = result.rows[0];
    const documents = {};
    const docFields = [
      { field: 'emp_profile_pic', name: 'Profile Picture' },
      { field: 'emp_ssc_doc', name: 'SSC Document' },
      { field: 'emp_inter_doc', name: 'Intermediate Document' },
      { field: 'emp_grad_doc', name: 'Graduation Document' },
      { field: 'resume', name: 'Resume' },
      { field: 'id_proof', name: 'ID Proof' },
      { field: 'signed_document', name: 'Signed Document' }
    ];
    for (const { field, name } of docFields) {
      if (employee[field]) {
        const filePath = path.join(uploadDir, path.basename(employee[field]));
        try {
          await fs.access(filePath);
          documents[field] = {
            url: `${req.protocol}://${req.get('host')}${employee[field]}`,
            name,
            filename: path.basename(employee[field])
          };
        } catch (err) {
          console.warn(`File not found for ${field}: ${filePath}`);
        }
      }
    }
    if (employee.previous_employments) {
      const employments = typeof employee.previous_employments === 'string'
        ? JSON.parse(employee.previous_employments)
        : employee.previous_employments;
      employments.forEach((exp, index) => {
        if (exp.offer_letter) {
          const filePath = path.join(uploadDir, path.basename(exp.offer_letter));
          try {
            fs.accessSync(filePath);
            documents[`emp_offer_letter_${index + 1}`] = {
              url: `${req.protocol}://${req.get('host')}${exp.offer_letter}`,
              name: `Offer Letter ${index + 1}`,
              filename: path.basename(exp.offer_letter)
            };
          } catch (err) {
            console.warn(`File not found for emp_offer_letter_${index + 1}: ${filePath}`);
          }
        }
        if (exp.relieving_letter) {
          const filePath = path.join(uploadDir, path.basename(exp.relieving_letter));
          try {
            fs.accessSync(filePath);
            documents[`emp_relieving_letter_${index + 1}`] = {
              url: `${req.protocol}://${req.get('host')}${exp.relieving_letter}`,
              name: `Relieving Letter ${index + 1}`,
              filename: path.basename(exp.relieving_letter)
            };
          } catch (err) {
            console.warn(`File not found for emp_relieving_letter_${index + 1}: ${filePath}`);
          }
        }
        if (exp.experience_certificate) {
          const filePath = path.join(uploadDir, path.basename(exp.experience_certificate));
          try {
            fs.accessSync(filePath);
            documents[`emp_experience_certificate_${index + 1}`] = {
              url: `${req.protocol}://${req.get('host')}${exp.experience_certificate}`,
              name: `Experience Certificate ${index + 1}`,
              filename: path.basename(exp.experience_certificate)
            };
          } catch (err) {
            console.warn(`File not found for emp_experience_certificate_${index + 1}: ${filePath}`);
          }
        }
      });
    }
    if (employee.additional_educations) {
      const educations = typeof employee.additional_educations === 'string'
        ? JSON.parse(employee.additional_educations)
        : employee.additional_educations;
      educations.forEach((edu, index) => {
        if (edu.certificate) {
          const filePath = path.join(uploadDir, path.basename(edu.certificate));
          try {
            fs.accessSync(filePath);
            documents[`emp_extra_doc_${index + 4}`] = {
              url: `${req.protocol}://${req.get('host')}${edu.certificate}`,
              name: `Additional Education Certificate ${index + 1}`,
              filename: path.basename(edu.certificate)
            };
          } catch (err) {
            console.warn(`File not found for emp_extra_doc_${index + 4}: ${filePath}`);
          }
        }
      });
    }
    console.log(`Returning documents for ${empEmail}:`, documents);
    res.json({ success: true, data: documents });
  } catch (err) {
    console.error('Get documents error:', err.stack || err.message);
    res.status(500).json({
      success: false,
      error: `Database error: ${err.message}`
    });
  } finally {
    if (client) client.release();
  }
});

// Download Document
app.get('/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  try {
    console.log(`Attempting to download file: ${filePath}`);
    await fs.access(filePath);
    const mimeType = mimeTypes.lookup(filePath) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('File send error:', err.message);
        res.status(500).json({
          success: false,
          error: 'Error sending file'
        });
      } else {
        console.log(`File ${filename} downloaded successfully`);
      }
    });
  } catch (err) {
    console.error('File access error:', err.message);
    res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  console.log('Health check');
  res.status(200).json({
    success: true,
    message: 'Server is running'
  });
});

// Error Handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err.message);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }
  res.status(500).json({
    success: false,
    error: err.message || 'Server error',
    code: 'SERVER_ERROR'
  });
});

// Start Server
const IP_ADDRESS = '3.84.202.40';
const servers = [
  { port: 8083, page: 'form' },
  { port: 8084, page: 'view' }
];

servers.forEach(({ port, page }) => {
  const server = app.listen(port, IP_ADDRESS, () => {
    console.log(`Server running on http://${IP_ADDRESS}:${port} serving ${page} page`);
  });
  server.on('error', (err) => {
    console.error(`Failed to start server on port ${port}: ${err.message}`);
  });
});