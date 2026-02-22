import pandas as pd
import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    precision_recall_curve,
    average_precision_score,
    precision_score,
    recall_score,
    f1_score,
    accuracy_score,
    r2_score,
    mean_squared_error
)
from sklearn.model_selection import cross_validate
import matplotlib.pyplot as plt
import seaborn as sns
import shap
import joblib
import argparse
from pathlib import Path

def load_data(feature_args):
    """Map simplified names to actual column names"""
    df = pd.read_csv(Path('data')/'processed'/'processed_data.csv')
    
    # Create mapping between simple names and actual columns
    feature_map = {
        'CREATININE': 'CREATININE (mg/dL)',
        'UREA': 'UREA (mg/dL)',
        'ALBUMIN': 'ALBUMIN (g/dL)',
        'URIC_ACID': 'URIC ACID (mg/dL)',  # Added
        'eGFR': 'eGFR',
        'ACR': 'ACR'  # Added
    }
    
    # Convert input features to actual column names
    features = [feature_map.get(f, f) for f in feature_args]
    
    # Verify all features exist
    missing = [f for f in features if f not in df.columns]
    if missing:
        raise KeyError(f"Features not found: {missing}\n"
                     f"Available columns: {list(df.columns)}")
    
    return df[features], df['IgAN_Status']

def evaluate_model(model, X, y, feature_names):
    """Enhanced evaluation with clinical insights"""
    
    # Cross-validation
    cv_results = cross_validate(model, X, y, cv=5,
                              scoring=['accuracy', 'precision', 'recall', 'f1', 'roc_auc'])
    
    # Final evaluation
    y_pred = model.predict(X)
    y_proba = model.predict_proba(X)[:, 1]
    
    # Metrics
    report = classification_report(y, y_pred, target_names=['Healthy', 'IgAN'])
    cm = confusion_matrix(y, y_pred)
    roc_auc = roc_auc_score(y, y_proba)
    pr_auc = average_precision_score(y, y_proba)
    
    # Feature importance
    if hasattr(model, 'feature_importances_'):
        importance = model.feature_importances_
    else:
        importance = np.abs(model.coef_[0])
    
    return {
        'cv_mean_accuracy': np.mean(cv_results['test_accuracy']),
        'cv_std_accuracy': np.std(cv_results['test_accuracy']),
        'precision': precision_score(y, y_pred),
        'recall': recall_score(y, y_pred),
        'roc_auc': roc_auc,
        'pr_auc': pr_auc,
        'report': report,
        'confusion_matrix': cm,
        'feature_importance': dict(zip(feature_names, importance))
    }

def generate_clinical_report(results, feature_names):
    """Create clinician-friendly outputs"""
    
    # 1. Performance Summary
    print("\n=== CLINICAL PERFORMANCE REPORT ===")
    print(f"Cross-Validated Accuracy: {results['cv_mean_accuracy']:.1%} (±{results['cv_std_accuracy']:.1%})")
    print(f"Sensitivity (Recall): {results['recall']:.1%}")
    print(f"Specificity: {results['confusion_matrix'][0,0]/sum(results['confusion_matrix'][0]):.1%}")
    print(f"ROC AUC: {results['roc_auc']:.3f}")
    print(f"PR AUC: {results['pr_auc']:.3f}\n")
    
    # 2. Confusion Matrix Visualization
    plt.figure(figsize=(6,6))
    sns.heatmap(results['confusion_matrix'], annot=True, fmt='d', cmap='Blues',
               xticklabels=['Predicted Healthy', 'Predicted IgAN'],
               yticklabels=['Actual Healthy', 'Actual IgAN'])
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig('clinical_confusion_matrix.png')
    
    # 3. Feature Importance
    importance_df = pd.DataFrame({
        'Feature': feature_names,
        'Importance': results['feature_importance'].values()
    }).sort_values('Importance', ascending=False)
    
    plt.figure(figsize=(10,6))
    sns.barplot(x='Importance', y='Feature', data=importance_df, palette='viridis')
    plt.title('Clinical Feature Importance')
    plt.tight_layout()
    plt.savefig('clinical_feature_importance.png')
    
    # 4. SHAP Explanations (for single patient)
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    
    plt.figure()
    shap.summary_plot(shap_values, X, feature_names=feature_names, show=False)
    plt.tight_layout()
    plt.savefig('clinical_shap_summary.png')
    
    return {
        'performance_metrics': {
            'accuracy': results['cv_mean_accuracy'],
            'sensitivity': results['recall'],
            'specificity': results['confusion_matrix'][0,0]/sum(results['confusion_matrix'][0]),
            'roc_auc': results['roc_auc']
        },
        'saved_plots': [
            'clinical_confusion_matrix.png',
            'clinical_feature_importance.png',
            'clinical_shap_summary.png'
        ]
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--features', nargs='+', required=True,
                      help='List of features to evaluate')
    parser.add_argument('--clinical_report', action='store_true',
                      help='Generate clinician-friendly outputs')
    args = parser.parse_args()
    
    # Load model and data
    model = joblib.load(Path('models')/'igan_xgboost.pkl')
    X, y = load_data(args.features)
    
    # Standard scaling
    scaler = joblib.load(Path('models')/'scaler.pkl')
    X_scaled = scaler.transform(X)
    
    # Evaluations
    results = evaluate_model(model, X_scaled, y, args.features)
    
    print("=== Detailed Classification Report ===")
    print(results['report'])
    
    if args.clinical_report:
        clinical_output = generate_clinical_report(results, args.features)
        print("\nClinical report generated with:")
        print(f"- Performance metrics")
        print(f"- Visualizations saved to: {clinical_output['saved_plots']}")