import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import PROCESSED_DATA_PATH, FEATURES, TARGET

def preprocess_data():
    # Load data
    df = pd.read_csv(PROCESSED_DATA_PATH)

    # Feature engineering: Add eGFR and ACR
    df['eGFR'] = 141 * np.minimum(df['CREATININE (mg/dL)']/0.9, 1)**-0.411
    df['ACR'] = df['ALBUMIN (g/dL)'] / df['CREATININE (mg/dL)']

    # Select features and target
    X = df[FEATURES]
    y = df[TARGET]

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, stratify=y, random_state=42
    )

    return X_train, X_test, y_train, y_test, scaler