import xgboost as xgb
import joblib
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import MODEL_PARAMS
from preprocess import preprocess_data

def train_model():
    # Get preprocessed data
    X_train, _, y_train, _, scaler = preprocess_data()

    # Train model
    model = xgb.XGBClassifier(**MODEL_PARAMS)
    model.fit(X_train, y_train)

    # Save model and scaler
    joblib.dump(model, "models/igan_xgboost.pkl")
    joblib.dump(scaler, "models/scaler.pkl")
    print("Model trained and saved.")

if __name__ == "__main__":
    train_model()

