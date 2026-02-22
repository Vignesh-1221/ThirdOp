# Nephrofind - IgA Nephropathy Diagnosis & Decision Support System

A comprehensive full-stack healthcare application for IgA Nephropathy diagnosis, combining Machine Learning predictions with clinical rule-based decision support. The system helps clinicians assess kidney disease cases by integrating ML model predictions with established medical guidelines.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Machine Learning Model](#machine-learning-model)
- [ThirdOp Decision Support System](#thirdop-decision-support-system)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Usage Guide](#usage-guide)

---

## 🎯 Overview

Nephrofind is a three-tier application designed to assist healthcare professionals in diagnosing and managing IgA Nephropathy (IgAN), a common form of kidney disease. The system provides:

1. **ML-Powered Predictions**: XGBoost model trained on clinical lab data to predict IgA Nephropathy
2. **Clinical Decision Support**: ThirdOp system that combines ML predictions with clinical rules
3. **Report Management**: Upload, store, and analyze medical lab reports
4. **Doctor Management**: Find and book appointments with nephrologists
5. **User Dashboard**: Track reports, predictions, and appointments

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19.1.0
- **UI Library**: Material-UI (MUI) v7.0.1
- **Routing**: React Router DOM v7.4.1
- **State Management**: React Context API
- **HTTP Client**: Axios v1.8.4
- **Charts**: Chart.js v4.4.8 + react-chartjs-2 v5.3.0
- **Date Handling**: Day.js v1.11.13
- **Authentication**: JWT (jsonwebtoken)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js v4.21.2
- **Database**: MongoDB with Mongoose v8.13.1
- **Authentication**: JWT (jsonwebtoken v9.0.2), bcryptjs v3.0.2
- **File Upload**: Multer v1.4.5
- **CORS**: cors v2.8.5
- **Environment**: dotenv v16.4.7

### Machine Learning
- **Language**: Python 3.8+
- **Framework**: Flask v3.0.2 (optional, model runs via subprocess)
- **ML Library**: XGBoost v2.0.3
- **Data Processing**: 
  - pandas v2.1.4
  - numpy v1.26.4
  - scikit-learn v1.3.2
- **Model Persistence**: joblib v1.3.2
- **Explainability**: SHAP v0.44.1
- **Visualization**: matplotlib v3.8.3, seaborn v0.13.2
- **Data Import**: openpyxl v3.1.2

### Infrastructure
- **Database**: MongoDB (local, port 27017)
- **Ports**:
  - Frontend: 3000
  - Backend: 5009
  - ML Service: 5000 (optional Flask server)

---

## 🏗 Architecture

```
┌─────────────────┐
│   React Frontend │  (Port 3000)
│   Material-UI    │
└────────┬─────────┘
         │ HTTP/REST
         │
┌────────▼─────────┐
│  Express Backend │  (Port 5009)
│  Node.js/Express │
│  - Auth Routes   │
│  - Report Routes │
│  - ML Routes     │
│  - ThirdOp Routes│
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────────┐
│MongoDB│ │ Python ML   │
│       │ │ Subprocess  │
│Models │ │ (model.py)  │
└───────┘ └─────────────┘
```

### Data Flow

1. **User Uploads Report** → Backend stores in MongoDB
2. **User Requests ML Prediction** → Backend spawns Python subprocess → XGBoost model predicts → Results stored
3. **User Requests ThirdOp Analysis** → Backend combines ML prediction + clinical rules → Returns decision support
4. **Frontend Displays** → Risk tier, decision, differentials, clinical indicators

---

## ✨ Features

### Core Features

1. **User Authentication & Authorization**
   - JWT-based authentication
   - Protected routes
   - User profiles

2. **Report Management**
   - Upload PDF lab reports
   - Extract clinical values (creatinine, urea, albumin, eGFR, ACR, uric acid)
   - Store reports in MongoDB
   - View report history

3. **Machine Learning Predictions**
   - XGBoost model for IgA Nephropathy prediction
   - Probability scores (0-1)
   - Binary classification (0 = negative, 1 = positive)

4. **ThirdOp Decision Support**
   - Hybrid ML + clinical rules engine
   - Risk tier assessment (low/medium/high)
   - Decision recommendations (monitor/request_tests/escalate)
   - Human escalation flags
   - Ranked differential diagnoses
   - Confidence scoring

5. **Doctor Management**
   - Browse nephrologists
   - View doctor profiles
   - Book appointments

6. **Dashboard**
   - Report statistics
   - Recent reports
   - Quick actions
   - Visualizations

---

## 🤖 Machine Learning Model

### Model Details

- **Algorithm**: XGBoost Classifier
- **Task**: Binary Classification (IgA Nephropathy: Yes/No)
- **Input Features** (6 clinical parameters):
  1. CREATININE (mg/dL)
  2. UREA (mg/dL)
  3. ALBUMIN (g/dL)
  4. URIC ACID (mg/dL)
  5. eGFR (estimated Glomerular Filtration Rate)
  6. ACR (Albumin-to-Creatinine Ratio)

### Model Training

- **Location**: `final/src/train.py`
- **Preprocessing**: StandardScaler normalization
- **Model Persistence**: Saved as `final/models/igan_xgboost.pkl`
- **Scaler**: Saved as `final/models/scaler.pkl`

### Prediction Pipeline

1. **Input**: JSON object with 6 clinical parameters
2. **Preprocessing**: 
   - Convert to pandas DataFrame
   - Reorder columns to match training data
   - Apply StandardScaler transformation
3. **Prediction**:
   - XGBoost predicts class (0 or 1)
   - Model outputs probabilities [P(negative), P(positive)]
4. **Output**: 
   ```json
   {
     "prediction": 0 or 1,
     "probabilities": [0.3, 0.7],
     "status": "success"
   }
   ```

### Model Integration

- **Backend Route**: `POST /api/ml/predict`
- **Execution**: Backend spawns Python subprocess running `final/model.py`
- **Communication**: JSON via command-line arguments and stdout

---

## 🧠 ThirdOp Decision Support System

ThirdOp is a sophisticated decision support engine that combines ML predictions with clinical rule-based analysis.

### Architecture

**Location**: `backend/services/thirdopEngine.js` (730 lines)

### Components

#### 1. Clinical Risk Assessment

Evaluates clinical parameters against medical guidelines:

- **Creatinine**: Normal (0.6-1.2 mg/dL), Critical (>2.5 mg/dL)
- **Urea**: Normal (7-20 mg/dL), Critical (>50 mg/dL)
- **Albumin**: Normal (3.5-5.0 g/dL), Critical (<2.5 g/dL)
- **eGFR**: 
  - Normal: ≥60
  - Stage 3a CKD: 45-59
  - Stage 3b CKD: 30-44
  - Stage 4 CKD: 15-29
  - Stage 5 CKD: <15
- **ACR** (Albumin-to-Creatinine Ratio):
  - Normal: <30
  - Microalbuminuria: 30-300
  - Macroalbuminuria: >300

**Output**: Clinical risk tier (low/medium/high) based on abnormal/critical counts

#### 2. ML Signal Assessment

Categorizes ML prediction strength:

- **strong_high**: Prediction=1, Probability≥0.8
- **moderate**: Prediction=1, Probability 0.6-0.8
- **weak**: Prediction=1, Probability<0.6
- **strong_negative**: Prediction=0, Probability≥0.8
- **uncertain_negative**: Prediction=0, Probability<0.8

**Output**: ML risk tier (low/medium/high)

#### 3. Risk Tier Determination

Combines ML signal + clinical risk using decision matrix:

| ML Signal | Clinical Risk | Combined Risk Tier |
|-----------|---------------|-------------------|
| strong_high | high | high |
| strong_high | medium | high |
| strong_high | low | medium |
| moderate | high | high |
| moderate | medium | medium |
| moderate | low | medium |
| weak | high | medium |
| weak | medium | low |
| weak | low | low |
| strong_negative | any | low |
| uncertain_negative | high | medium |
| uncertain_negative | medium/low | low |

#### 4. Exception Rules

Overrides risk tier for critical conditions:

- **eGFR < 30** → Always `high` risk
- **ACR > 300** → Always `high` risk
- **Creatinine > 3.0 AND eGFR < 45** → Always `high` risk

#### 5. Decision Mapping

- **low** risk → `monitor`
- **medium** risk → `request_additional_tests`
- **high** risk → `escalate`

#### 6. Human Escalation Logic

Triggers escalation flag when:
- High risk + escalate decision
- eGFR < 30 (Stage 4/5 CKD)
- ACR > 300 (severe proteinuria)
- ML probability > 0.9 for positive diagnosis
- ≥2 critical clinical flags

#### 7. Confidence Calculation

- **Base**: ML probability
- **Agreement Bonus**: +0.1 if ML and clinical agree with final risk tier
- **Partial Agreement**: +0.05 if one agrees
- **Conflict Penalty**: -0.2 if ML and clinical disagree
- **Critical Bonus**: +0.05 per critical flag (max +0.1)
- **Range**: 0.4 to 1.0

#### 8. Ranked Differential Diagnoses

Non-diagnostic decision support considerations:

1. **IgA Nephropathy** (anchored by ML probability)
2. **Diabetic Nephropathy** (proteinuria + reduced eGFR pattern)
3. **Hypertensive Nephrosclerosis** (eGFR reduction, lower proteinuria)
4. **Minimal Change Disease** (heavy proteinuria + low albumin)
5. **Other Glomerulopathy** (catch-all)

Each differential includes:
- **Condition name**
- **Confidence score** (0-1)
- **Rationale** explaining the consideration

### API Endpoint

**POST** `/api/thirdop/analyze`

**Request Body**:
```json
{
  "reportId": "string",
  "reportData": {
    "CREATININE (mg/dL)": number,
    "UREA (mg/dL)": number,
    "ALBUMIN (g/dL)": number,
    "URIC ACID (mg/dL)": number,
    "eGFR": number,
    "ACR": number
  },
  "mlPrediction": {
    "prediction": 0 or 1,
    "probabilities": [number, number],
    "status": "success"
  },
  "reportMetadata": {
    "reportType": "string",
    "uploadDate": "ISO string"
  }
}
```

**Response**:
```json
{
  "riskTier": "low" | "medium" | "high",
  "decision": "monitor" | "request_additional_tests" | "escalate",
  "humanEscalation": boolean,
  "confidence": number (0.4-1.0),
  "clinicalIndicators": {
    "abnormalValues": ["string"],
    "criticalFlags": ["string"]
  },
  "rankedDifferentials": [
    {
      "condition": "string",
      "confidence": number,
      "rationale": "string"
    }
  ],
  "explanation": "string",
  "explanationSource": "rules",
  "recommendedActions": [],
  "timestamp": "ISO string"
}
```

### Frontend Integration

**Page**: `frontend/src/pages/ThirdOp.js`

- Auto-runs analysis on page load
- Fetches ML prediction if missing
- Displays risk summary, confidence, clinical indicators, differentials
- Color-coded UI (red/yellow/green for risk tiers)

---

## 📁 Project Structure

```
Nephrofind/
├── backend/                    # Node.js/Express Backend
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/                # MongoDB Mongoose models
│   │   ├── user.model.js
│   │   ├── report.model.js
│   │   ├── doctor.model.js
│   │   └── appointment.model.js
│   ├── routes/                # API routes
│   │   ├── auth.routes.js
│   │   ├── report.routes.js
│   │   ├── doctor.routes.js
│   │   ├── mlRoutes.js        # ML prediction endpoint
│   │   ├── prediction.routes.js
│   │   └── thirdop.routes.js  # ThirdOp decision support
│   ├── services/
│   │   └── thirdopEngine.js   # ThirdOp decision engine (730 lines)
│   ├── seed/
│   │   └── seedDoctors.js     # Doctor seed data
│   ├── uploads/               # Uploaded PDF reports
│   ├── server.js              # Express server entry point
│   └── package.json
│
├── frontend/                   # React Frontend
│   ├── public/
│   │   └── images/            # Static images
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Navbar.js
│   │   │   ├── Footer.js
│   │   │   ├── PrivateRoute.js
│   │   │   ├── ReportCard.js
│   │   │   └── ReportsModal.js
│   │   ├── context/
│   │   │   └── AuthContext.js # Authentication context
│   │   ├── pages/             # Page components
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── UploadReport.js
│   │   │   ├── ReportDetail.js
│   │   │   ├── ThirdOp.js     # ThirdOp decision support page
│   │   │   ├── Doctors.js
│   │   │   ├── Appointments.js
│   │   │   └── Profile.js
│   │   ├── App.js             # Main app component with routing
│   │   └── index.js           # React entry point
│   └── package.json
│
├── final/                      # Python ML Service
│   ├── data/
│   │   ├── raw/
│   │   │   └── medical_lab_data.xlsx  # Training data
│   │   └── processed/
│   │       └── processed_data.csv
│   ├── models/                 # Trained models
│   │   ├── igan_xgboost.pkl   # XGBoost model
│   │   └── scaler.pkl          # StandardScaler
│   ├── notebooks/              # Jupyter notebooks
│   │   ├── exploratory_analysis.ipynb
│   │   └── model_comparison.ipynb
│   ├── src/                    # ML source code
│   │   ├── preprocess.py       # Data preprocessing
│   │   ├── train.py            # Model training
│   │   ├── predict.py          # Prediction logic
│   │   └── evaluate.py         # Model evaluation
│   ├── model.py                # Standalone prediction script
│   ├── app.py                  # Flask server (optional)
│   ├── config.py               # Configuration
│   ├── requirements.txt        # Python dependencies
│   └── venv/                   # Python virtual environment
│
└── README.md                   # This file
```

---

## 🚀 Setup Instructions

### Prerequisites

- **Node.js** v14+ and npm
- **Python** 3.8+ and pip
- **MongoDB** (running on port 27017)

### Step 1: Install MongoDB

**macOS (Homebrew)**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux**:
```bash
# Follow MongoDB installation guide for your distribution
# https://www.mongodb.com/docs/manual/installation/
```

**Windows**:
- Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- Start MongoDB service

Verify MongoDB is running:
```bash
mongosh
```

### Step 2: Setup Backend

```bash
cd backend
npm install
node server.js
```

Backend runs on `http://localhost:5009`

### Step 3: Setup Python ML Service

```bash
cd final
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Note**: The ML model runs as a subprocess from the backend. You don't need to run a separate Flask server unless you want to use `app.py` for standalone testing.

### Step 4: Setup Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

### Running All Services

You need **3 terminal windows**:

**Terminal 1 - Backend**:
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm start
```

**Terminal 3 - MongoDB** (if not running as service):
```bash
mongod
```

---

## 📡 API Documentation

### Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Auth Routes (`/api/auth`)

- **POST** `/register` - Register new user
- **POST** `/login` - Login user, returns JWT token

#### Report Routes (`/api/reports`)

- **GET** `/` - Get all reports for authenticated user
- **POST** `/` - Upload new report
- **GET** `/:id` - Get report by ID
- **DELETE** `/:id` - Delete report

#### ML Routes (`/api/ml`)

- **POST** `/predict` - Run ML prediction on report data
  ```json
  {
    "reportId": "string",
    "reportData": {
      "CREATININE (mg/dL)": number,
      "UREA (mg/dL)": number,
      "ALBUMIN (g/dL)": number,
      "URIC ACID (mg/dL)": number,
      "eGFR": number,
      "ACR": number
    }
  }
  ```

#### ThirdOp Routes (`/api/thirdop`)

- **POST** `/analyze` - Run ThirdOp decision support analysis
  - See [ThirdOp API Endpoint](#api-endpoint) section above

#### Doctor Routes (`/api/doctors`)

- **GET** `/` - Get all doctors
- **GET** `/:id` - Get doctor by ID

#### Appointment Routes (`/api/appointments`)

- **GET** `/` - Get all appointments for user
- **POST** `/` - Book new appointment
- **PUT** `/:id` - Update appointment
- **DELETE** `/:id` - Cancel appointment

---

## 📖 Usage Guide

### 1. Register/Login

- Navigate to `http://localhost:3000/register`
- Create an account
- Login at `http://localhost:3000/login`

### 2. Upload Report

- Go to Dashboard → Upload Report
- Upload PDF lab report
- System extracts clinical values (creatinine, urea, albumin, eGFR, ACR, uric acid)

### 3. Run ML Prediction

- Open report detail page
- Click "Run ML Prediction"
- View prediction result (0 or 1) and probabilities

### 4. Run ThirdOp Analysis

- From report detail page, click "Run ThirdOp Analysis"
- Or navigate to Dashboard → Click "ThirdOp" button on report card
- System automatically:
  - Fetches ML prediction (runs if missing)
  - Combines ML + clinical rules
  - Returns risk tier, decision, differentials

### 5. View Results

ThirdOp page displays:
- **Risk Summary**: Color-coded risk tier (low/medium/high)
- **Decision**: Monitor / Request Additional Tests / Escalate
- **Confidence Score**: 0.4-1.0 with visual progress bar
- **Clinical Indicators**: Abnormal values and critical flags
- **Ranked Differentials**: Top 5 differential diagnoses with confidence
- **Human Escalation Warning**: If specialist review recommended

### 6. Book Appointment

- Navigate to Doctors page
- Browse nephrologists
- Book appointment
- View appointments in Appointments page

---

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- CORS configuration
- File upload validation

---

## 🧪 Model Training (Optional)

To retrain the ML model:

```bash
cd final
source venv/bin/activate
python src/train.py
```

This will:
1. Load and preprocess training data
2. Train XGBoost model
3. Save model and scaler to `models/` directory

---

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `brew services list` (macOS)
- Check connection: `mongosh`

### Port Already in Use
- Backend (5009): Change PORT in `backend/server.js`
- Frontend (3000): React will prompt for alternative port
- ML Service (5000): Change in `final/app.py` if using Flask

### Python Dependencies Error
- Ensure Python 3.8+: `python3 --version`
- Reinstall: `pip install -r requirements.txt --upgrade`

### ML Prediction Fails
- Verify model files exist: `final/models/igan_xgboost.pkl`
- Check Python path in backend: `backend/routes/mlRoutes.js`

### ThirdOp Analysis Fails
- Ensure ML prediction exists first
- Check clinical values are present (creatinine, urea, albumin)
- Verify ML prediction status is "success"

---

## 📝 Notes

- **ThirdOp is non-diagnostic**: The ranked differentials are for decision support only, not medical diagnosis
- **Model requires all 6 features**: CREATININE, UREA, ALBUMIN, URIC ACID, eGFR, ACR
- **Backward compatibility**: ThirdOp handles multiple field name formats (e.g., `creatinine`, `creatinineLevel`, `CREATININE (mg/dL)`)
- **Human escalation**: Always recommended for high-risk cases or critical clinical values

---

## 🚧 Future Enhancements

- [ ] LLM-based explanation generation for ThirdOp
- [ ] Additional clinical parameters support
- [ ] Model retraining pipeline
- [ ] Real-time notifications
- [ ] Export reports to PDF
- [ ] Multi-language support
- [ ] Mobile app version

---

## 📄 License

This project is for educational/research purposes.

---

## 👥 Contributors

Developed for IgA Nephropathy diagnosis and decision support.

---

**For questions or issues, please check the console logs in each terminal for debugging information.**
