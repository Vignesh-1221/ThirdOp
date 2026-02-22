from flask import Flask, request, jsonify
import joblib
import numpy as np
import pandas as pd
import traceback
import os

app = Flask(__name__)

# Load model and scaler
model = joblib.load("models/igan_xgboost.pkl")
scaler = joblib.load("models/scaler.pkl")

# Define expected input features
expected_features = [
    "CREATININE (mg/dL)",
    "UREA (mg/dL)",
    "ALBUMIN (g/dL)",
    "URIC ACID (mg/dL)",
    "eGFR",
    "ACR"
]

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        # Convert to DataFrame
        input_df = pd.DataFrame([data])

        # Check if all expected features are present
        missing = [feat for feat in expected_features if feat not in input_df.columns]
        if missing:
            return jsonify({"error": f"Missing features: {missing}"}), 400

        # Reorder and scale
        input_df = input_df[expected_features]
        input_scaled = scaler.transform(input_df)

        # Predict
        prediction = model.predict(input_scaled)[0]
        probability = model.predict_proba(input_scaled)[0].tolist()

        return jsonify({
            "prediction": int(prediction),
            "probabilities": probability
        })

    except Exception as e:
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
