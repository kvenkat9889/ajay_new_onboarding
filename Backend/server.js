const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const fs = require('fs').promises; // Use promises version for async/await
const validator = require('validator');
const mimeTypes = require('mime-types');

const app = express();
const PORT = 3000;

// CORS Setup
const allowedOrigins = [
  'http://localhost:3001',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://127.0.0.1:5501'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    console.log(`CORS request from origin: ${origin}`);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error('CORS error: Origin not allowed', origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle CORS errors explicitly
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.message.includes('not allowed by CORS')) {
    console.error('CORS error:', err.message);
    return res.status(403).json({
      success: false,
      error: err.message,
      code: 'CORS_ERROR'
    });
  }
  next(err);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for favicon and uploads)
const publicDir = path.join(__dirname, 'public');
const ensureDirExists = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err.message);
  }
};
ensureDirExists(publicDir);
app.use(express.static(publicDir));

const uploadDir = path.join(__dirname, 'Uploads');
ensureDirExists(uploadDir);
app.use('/Uploads', express.static(uploadDir));

// PostgreSQL Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'new_employee_db',
  password: 'Password@12345',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000
});

// Connect to DB and create table
const setupDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL');
    // await client.query('DROP TABLE IF EXISTS ajay_table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ajay_table (
        id SERIAL PRIMARY KEY,
        emp_name VARCHAR(255) NOT NULL,
        emp_email VARCHAR(255) UNIQUE NOT NULL,
        emp_gender VARCHAR(20),
        emp_marital_status VARCHAR(20),
        emp_dob DATE,
        emp_mobile VARCHAR(20),
        emp_alt_mobile VARCHAR(20),
        emp_aadhaar VARCHAR(20) UNIQUE,
        emp_pan VARCHAR(20) UNIQUE,
        emp_address TEXT,
        emp_city VARCHAR(100),
        emp_state VARCHAR(100),
        emp_zipcode VARCHAR(20),
        emp_bank VARCHAR(255),
        emp_account VARCHAR(50),
        emp_ifsc VARCHAR(20),
        emp_bank_branch VARCHAR(100),
        emp_job_role VARCHAR(255),
        emp_department VARCHAR(255),
        emp_experience_status VARCHAR(20),
        emp_joining_date DATE,
        emp_profile_pic VARCHAR(255),
        emp_ssc_doc VARCHAR(255),
        ssc_school VARCHAR(255),
        ssc_year INTEGER,
        ssc_grade VARCHAR(20),
        emp_inter_doc VARCHAR(255),
        inter_college VARCHAR(255),
        inter_year INTEGER,
        inter_grade VARCHAR(20),
        inter_branch VARCHAR(100),
        emp_grad_doc VARCHAR(255),
        grad_college VARCHAR(255),
        grad_year INTEGER,
        grad_grade VARCHAR(20),
        grad_degree VARCHAR(100),
        grad_branch VARCHAR(100),
        resume VARCHAR(255),
        id_proof VARCHAR(255),
        signed_document VARCHAR(255),
        emp_terms_accepted BOOLEAN DEFAULT FALSE,
        primary_contact_name VARCHAR(255),
        primary_contact_mobile VARCHAR(20),
        primary_contact_relation VARCHAR(50),
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
    console.log('Table setup completed successfully');
  } catch (err) {
    console.error('DB setup error:', err.stack || err.message);
    process.exit(1); // Exit if database setup fails
  } finally {
    if (client) client.release();
  }
};
setupDatabase();

// Multer Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const sanitizedName = validator.escape(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(sanitizedName)}`);
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
      'emp_relieving_letter_1': ['application/pdf'],
      'emp_experience_certificate_1': ['application/pdf'],
      'emp_offer_letter_2': ['application/pdf'],
      'emp_relieving_letter_2': ['application/pdf'],
      'emp_experience_certificate_2': ['application/pdf'],
      'emp_offer_letter_3': ['application/pdf'],
      'emp_relieving_letter_3': ['application/pdf'],
      'emp_experience_certificate_3': ['application/pdf'],
      'emp_extra_doc_4': ['application/pdf'],
      'emp_extra_doc_5': ['application/pdf']
    };

    console.log('Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowed = allowedTypes[file.fieldname] || ['application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowed.join(', ')}`));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

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

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Save Employee Endpoint
app.post('/save-employee', upload.fields([
  { name: 'emp_profile_pic', maxCount: 1 },
  { name: 'emp_ssc_doc', maxCount: 1 },
  { name: 'emp_inter_doc', maxCount: 1 },
  { name: 'emp_grad_doc', maxCount: 1 },
  { name: 'resume', maxCount: 1 },
  { name: 'id_proof', maxCount: 1 },
  { name: 'signed_document', maxCount: 1 },
  { name: 'emp_offer_letter_1', maxCount: 1 },
  { name: 'emp_relieving_letter_1', maxCount: 1 },
  { name: 'emp_experience_certificate_1', maxCount: 1 },
  { name: 'emp_offer_letter_2', maxCount: 1 },
  { name: 'emp_relieving_letter_2', maxCount: 1 },
  { name: 'emp_experience_certificate_2', maxCount: 1 },
  { name: 'emp_offer_letter_3', maxCount: 1 },
  { name: 'emp_relieving_letter_3', maxCount: 1 },
  { name: 'emp_experience_certificate_3', maxCount: 1 },
  { name: 'emp_extra_doc_4', maxCount: 1 },
  { name: 'emp_extra_doc_5', maxCount: 1 }
]), async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.files:', JSON.stringify(req.files, null, 2));

    // Define expected fields
    const expectedFields = [
      'emp_name', 'emp_email', 'emp_gender', 'emp_marital_status', 'emp_dob', 'emp_mobile',
      'emp_alt_mobile', 'emp_aadhaar', 'emp_pan', 'emp_address', 'emp_city', 'emp_state',
      'emp_zipcode', 'emp_bank', 'emp_account', 'emp_ifsc', 'emp_bank_branch', 'emp_job_role',
      'emp_department', 'emp_experience_status', 'emp_joining_date', 'ssc_school',
      'ssc_year', 'ssc_grade', 'inter_college', 'inter_year', 'inter_grade', 'inter_branch',
      'grad_college', 'grad_year', 'grad_grade', 'grad_degree', 'grad_branch',
      'primary_contact_name', 'primary_contact_mobile', 'primary_contact_relation',
      'primary_contact_email', 'secondary_contact_name', 'secondary_contact_mobile',
      'secondary_contact_relation', 'secondary_contact_email', 'emp_terms_accepted',
      'emp_company_name_1', 'emp_years_of_experience_1', 'emp_start_date_1', 'emp_end_date_1',
      'emp_uan_1', 'emp_pf_1', 'emp_company_name_2', 'emp_years_of_experience_2',
      'emp_start_date_2', 'emp_end_date_2', 'emp_uan_2', 'emp_pf_2', 'emp_company_name_3',
      'emp_years_of_experience_3', 'emp_start_date_3', 'emp_end_date_3', 'emp_uan_3', 'emp_pf_3',
      'extra_college_4', 'extra_year_4', 'extra_grade_4', 'extra_degree_4', 'extra_branch_4',
      'extra_college_5', 'extra_year_5', 'extra_grade_5', 'extra_degree_5', 'extra_branch_5'
    ];

    const unexpectedFields = Object.keys(req.body).filter(key => !expectedFields.includes(key));
    if (unexpectedFields.length > 0) {
      throw new Error(`Unexpected form fields: ${unexpectedFields.join(', ')}`);
    }

    // Validate required fields
    const requiredFields = [
      'emp_name', 'emp_email', 'emp_gender', 'emp_marital_status', 'emp_dob', 'emp_mobile',
      'emp_aadhaar', 'emp_pan', 'emp_address', 'emp_city', 'emp_state', 'emp_zipcode',
      'emp_bank', 'emp_account', 'emp_ifsc', 'emp_bank_branch', 'emp_job_role',
      'emp_department', 'emp_experience_status', 'emp_joining_date', 'ssc_school',
      'ssc_year', 'ssc_grade', 'inter_college', 'inter_year', 'inter_grade', 'inter_branch',
      'grad_college', 'grad_year', 'grad_grade', 'grad_degree', 'grad_branch',
      'primary_contact_name', 'primary_contact_mobile', 'primary_contact_relation',
      'emp_terms_accepted'
    ];
    const missingFields = requiredFields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
    });
    if (missingFields.length > 0) {
      throw new Error(`Missing or empty required fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*@(gmail|outlook)\.(com|in|org|co)$/;
    if (!emailRegex.test(req.body.emp_email)) {
      throw new Error('Invalid email format');
    }

    // Validate required files
    const requiredFiles = [
      'emp_profile_pic', 'emp_ssc_doc', 'emp_inter_doc', 'emp_grad_doc',
      'resume', 'id_proof', 'signed_document'
    ];
    if (req.body.emp_experience_status === 'Experienced') {
      requiredFiles.push('emp_offer_letter_1', 'emp_relieving_letter_1');
    }
    const missingFiles = requiredFiles.filter(field => !req.files[field]?.[0]?.filename);
    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

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
          if (!req.files[`emp_offer_letter_${i}`]?.[0]?.filename ||
              !req.files[`emp_relieving_letter_${i}`]?.[0]?.filename) {
            throw new Error(`Missing required files for employment ${i}: offer_letter or relieving_letter`);
          }
          previousEmployments.push({
            company_name: validator.escape(req.body[`emp_company_name_${i}`]),
            years_of_experience: parseFloat(req.body[`emp_years_of_experience_${i}`]) || 0,
            start_date: req.body[`emp_start_date_${i}`],
            end_date: req.body[`emp_end_date_${i}`],
            uan: validator.escape(req.body[`emp_uan_${i}`]),
            pf: validator.escape(req.body[`emp_pf_${i}`]),
            offer_letter: req.files[`emp_offer_letter_${i}`]?.[0]?.filename,
            relieving_letter: req.files[`emp_relieving_letter_${i}`]?.[0]?.filename,
            experience_certificate: req.files[`emp_experience_certificate_${i}`]?.[0]?.filename || null
          });
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
        if (missingEduFields.length > 0 || !req.files[`emp_extra_doc_${i}`]?.[0]?.filename) {
          throw new Error(`Missing education fields or certificate for education ${i-2}: ${missingEduFields.join(', ')}`);
        }
        additionalEducations.push({
          college_name: validator.escape(req.body[`extra_college_${i}`]),
          year_of_completion: parseInt(req.body[`extra_year_${i}`]) || 0,
          grade: validator.escape(req.body[`extra_grade_${i}`]),
          degree: validator.escape(req.body[`extra_degree_${i}`]),
          branch: validator.escape(req.body[`extra_branch_${i}`]),
          certificate: req.files[`emp_extra_doc_${i}`]?.[0]?.filename
        });
      }
    }

    // Define expected columns for INSERT
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

    // Prepare values array
    const values = [
      validator.escape(req.body.emp_name),
      validator.escape(req.body.emp_email),
      validator.escape(req.body.emp_gender),
      validator.escape(req.body.emp_marital_status),
      req.body.emp_dob,
      validator.escape(req.body.emp_mobile),
      validator.escape(req.body.emp_alt_mobile) || null,
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
      req.files['emp_profile_pic']?.[0]?.filename,
      req.files['emp_ssc_doc']?.[0]?.filename,
      validator.escape(req.body.ssc_school),
      parseInt(req.body.ssc_year),
      validator.escape(req.body.ssc_grade),
      req.files['emp_inter_doc']?.[0]?.filename,
      validator.escape(req.body.inter_college),
      parseInt(req.body.inter_year),
      validator.escape(req.body.inter_grade),
      validator.escape(req.body.inter_branch),
      req.files['emp_grad_doc']?.[0]?.filename,
      validator.escape(req.body.grad_college),
      parseInt(req.body.grad_year),
      validator.escape(req.body.grad_grade),
      validator.escape(req.body.grad_degree),
      validator.escape(req.body.grad_branch),
      req.files['resume']?.[0]?.filename,
      req.files['id_proof']?.[0]?.filename,
      req.files['signed_document']?.[0]?.filename,
      req.body.emp_terms_accepted === 'true' || req.body.emp_terms_accepted === 'on',
      validator.escape(req.body.primary_contact_name),
      validator.escape(req.body.primary_contact_mobile),
      validator.escape(req.body.primary_contact_relation),
      validator.escape(req.body.primary_contact_email) || null,
      validator.escape(req.body.secondary_contact_name) || null,
      validator.escape(req.body.secondary_contact_mobile) || null,
      validator.escape(req.body.secondary_contact_relation) || null,
      validator.escape(req.body.secondary_contact_email) || null,
      previousEmployments.length > 0 ? JSON.stringify(previousEmployments) : null,
      additionalEducations.length > 0 ? JSON.stringify(additionalEducations) : null
    ];

    if (values.length !== insertColumns.length) {
      throw new Error(`Values array length (${values.length}) does not match expected columns (${insertColumns.length})`);
    }

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
    await client.query('ROLLBACK');
    await cleanupFiles(req.files);
    console.error('Save employee error:', err.stack || err.message);
    if (err.code === '23505') {
      const field = err.constraint.includes('emp_email') ? 'Email' :
                   err.constraint.includes('emp_aadhaar') ? 'Aadhaar' :
                   err.constraint.includes('emp_pan') ? 'PAN' : 'Field';
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }
    res.status(500).json({
      success: false,
      error: `Database error: ${err.message}`
    });
  } finally {
    if (client) client.release();
  }
});

// Get all employees with document URLs
app.get('/employees', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    console.log('Fetching all employees from database...');
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
          employeeData[`${field}_url`] = `${req.protocol}://${req.get('host')}/Uploads/${employeeData[field]}`;
        }
      });
      if (employeeData.previous_employments) {
        const employments = typeof employeeData.previous_employments === 'string'
          ? JSON.parse(employeeData.previous_employments)
          : employeeData.previous_employments;
        employeeData.previous_employments = employments.map(exp => ({
          ...exp,
          offer_letter_url: exp.offer_letter ? `${req.protocol}://${req.get('host')}/Uploads/${exp.offer_letter}` : null,
          relieving_letter_url: exp.relieving_letter ? `${req.protocol}://${req.get('host')}/Uploads/${exp.relieving_letter}` : null,
          experience_certificate_url: exp.experience_certificate ? `${req.protocol}://${req.get('host')}/Uploads/${exp.experience_certificate}` : null
        }));
      }
      if (employeeData.additional_educations) {
        const educations = typeof employeeData.additional_educations === 'string'
          ? JSON.parse(employeeData.additional_educations)
          : employeeData.additional_educations;
        employeeData.additional_educations = educations.map(edu => ({
          ...edu,
          certificate_url: edu.certificate ? `${req.protocol}://${req.get('host')}/Uploads/${edu.certificate}` : null
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

// Get single employee by ID with full details
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
        employeeData[`${field}_url`] = `${req.protocol}://${req.get('host')}/Uploads/${employeeData[field]}`;
      }
    });
    if (employeeData.previous_employments) {
      const employments = typeof employeeData.previous_employments === 'string'
        ? JSON.parse(employeeData.previous_employments)
        : employeeData.previous_employments;
      employeeData.previous_employments = employments.map(exp => ({
        ...exp,
        offer_letter_url: exp.offer_letter ? `${req.protocol}://${req.get('host')}/Uploads/${exp.offer_letter}` : null,
        relieving_letter_url: exp.relieving_letter ? `${req.protocol}://${req.get('host')}/Uploads/${exp.relieving_letter}` : null,
        experience_certificate_url: exp.experience_certificate ? `${req.protocol}://${req.get('host')}/Uploads/${exp.experience_certificate}` : null
      }));
    }
    if (employeeData.additional_educations) {
      const educations = typeof employeeData.additional_educations === 'string'
        ? JSON.parse(employeeData.additional_educations)
        : employeeData.additional_educations;
      employeeData.additional_educations = educations.map(edu => ({
        ...edu,
        certificate_url: edu.certificate ? `${req.protocol}://${req.get('host')}/Uploads/${edu.certificate}` : null
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

// Get document URLs for an employee
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
        const filePath = path.join(uploadDir, employee[field]);
        try {
          await fs.access(filePath);
          documents[field] = {
            url: `${req.protocol}://${req.get('host')}/Uploads/${employee[field]}`,
            name,
            filename: employee[field]
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
          const filePath = path.join(uploadDir, exp.offer_letter);
          try {
            fs.accessSync(filePath);
            documents[`emp_offer_letter_${index + 1}`] = {
              url: `${req.protocol}://${req.get('host')}/Uploads/${exp.offer_letter}`,
              name: `Offer Letter ${index + 1}`,
              filename: exp.offer_letter
            };
          } catch (err) {
            console.warn(`File not found for emp_offer_letter_${index + 1}: ${filePath}`);
          }
        }
        if (exp.relieving_letter) {
          const filePath = path.join(uploadDir, exp.relieving_letter);
          try {
            fs.accessSync(filePath);
            documents[`emp_relieving_letter_${index + 1}`] = {
              url: `${req.protocol}://${req.get('host')}/Uploads/${exp.relieving_letter}`,
              name: `Relieving Letter ${index + 1}`,
              filename: exp.relieving_letter
            };
          } catch (err) {
            console.warn(`File not found for emp_relieving_letter_${index + 1}: ${filePath}`);
          }
        }
        if (exp.experience_certificate) {
          const filePath = path.join(uploadDir, exp.experience_certificate);
          try {
            fs.accessSync(filePath);
            documents[`emp_experience_certificate_${index + 1}`] = {
              url: `${req.protocol}://${req.get('host')}/Uploads/${exp.experience_certificate}`,
              name: `Experience Certificate ${index + 1}`,
              filename: exp.experience_certificate
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
          const filePath = path.join(uploadDir, edu.certificate);
          try {
            fs.accessSync(filePath);
            documents[`emp_extra_doc_${index + 4}`] = {
              url: `${req.protocol}://${req.get('host')}/Uploads/${edu.certificate}`,
              name: `Additional Education Certificate ${index + 1}`,
              filename: edu.certificate
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

// Download document endpoint
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

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({
    success: true,
    message: 'Server is running'
  });
});

// Error Handling Middleware
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
    error: err.message || 'An unexpected error occurred',
    code: 'SERVER_ERROR'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
