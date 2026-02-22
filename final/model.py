#!/usr/bin/env python3
import sys
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

def predict_igan(input_data):
    """
    Make a prediction using the trained XGBoost model
    """
    try:
        # Load model and scaler
        model_path = Path(__file__).parent / "models" / "igan_xgboost.pkl"
        scaler_path = Path(__file__).parent / "models" / "scaler.pkl"
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        
        # Expected features
        expected_features = [
            "CREATININE (mg/dL)",
            "UREA (mg/dL)",
            "ALBUMIN (g/dL)",
            "URIC ACID (mg/dL)",
            "eGFR",
            "ACR"
        ]
        
        # Create DataFrame from input
        input_df = pd.DataFrame([input_data])
        
        # Check for missing features
        missing = [feat for feat in expected_features if feat not in input_df.columns]
        if missing:
            return {
                "error": f"Missing features: {missing}",
                "status": "error"
            }
        
        # Reorder columns to match training data
        input_df = input_df[expected_features]
        
        # Scale the input data
        input_scaled = scaler.transform(input_df)
        
        # Make prediction
        prediction = int(model.predict(input_scaled)[0])
        probabilities = model.predict_proba(input_scaled)[0].tolist()
        
        return {
            "prediction": prediction,
            "probabilities": probabilities,
            "status": "success"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "status": "error"
        }

if __name__ == "__main__":
    # Get input data from command line argument
    if len(sys.argv) > 1:
        try:
            input_data = json.loads(sys.argv[1])
            result = predict_igan(input_data)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e), "status": "error"}))
    else:
        print(json.dumps({"error": "No input data provided", "status": "error"}))