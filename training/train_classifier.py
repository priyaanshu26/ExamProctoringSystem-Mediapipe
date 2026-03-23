import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import os

def train_proctoring_model(csv_path='proctoring_dataset.csv', model_name='behavior_model.pkl'):
    """
    Trains a Random Forest classifier on MediaPipe FaceMesh landmarks.
    
    The CSV should have 'label' as the first column, followed by 1404 columns 
    (468 landmarks * 3 coordinates x,y,z).
    """
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found. Please collect data first using the frontend.")
        return

    print(f"--- Loading Dataset: {csv_path} ---")
    df = pd.read_csv(csv_path)
    
    X = df.drop('label', axis=1)
    y = df['label']

    print(f"Dataset shape: {df.shape}")
    print(f"Classes: {y.unique()}")

    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("--- Training RandomForest Classifier ---")
    classifier = RandomForestClassifier(n_estimators=100, max_depth=20, random_state=42)
    classifier.fit(X_train, y_train)

    # Evaluation
    y_pred = classifier.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("\n--- Evaluation Results ---")
    print(f"Overall Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Save the model
    joblib.dump(classifier, model_name)
    print(f"\nModel saved successfully as: {model_name}")

if __name__ == "__main__":
    train_proctoring_model()
