import os

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
RAW_DATA_PATH = os.path.join(DATA_DIR, "raw", "medical_lab_data_with_correlations.xlsx")
PROCESSED_DATA_PATH = os.path.join(DATA_DIR, "processed", "processed_data.csv")

# Model parameters
MODEL_PARAMS = {
    "n_estimators": 100,
    "max_depth": 5,
    "scale_pos_weight": 10,  # For class imbalance
    "random_state": 42
}

# Feature columns (adjust based on your data)
FEATURES = [
    "CREATININE (mg/dL)", "UREA (mg/dL)", "ALBUMIN (g/dL)", 
    "URIC ACID (mg/dL)", "eGFR", "ACR"
]
TARGET = "IgAN_Status"