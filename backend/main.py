from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import random
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load demo environment variables
load_dotenv()

app = FastAPI()

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "PROCTOR AI Backend is Live",
        "version": "2.0.0-demo"
    }

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Question(BaseModel):
    id: int
    text: str
    options: List[str]
    correct_option: int
    description: str

class LoginRequest(BaseModel):
    student_id: str

class LogEventRequest(BaseModel):
    student_id: str
    event_type: str
    timestamp: str
    confidence: Optional[float] = None

class CollectDataRequest(BaseModel):
    label: str
    csv_row: str # Comma-separated landmark coordinates

QUESTIONS = [
    Question(id=1, text="What is the primary purpose of an activation function in a neural network?", options=["To introduce non-linearity", "To normalize data", "To speed up training", "To initialize weights"], correct_option=0, description="Activation functions allow neural networks to learn complex patterns by introducing non-linear transformations."),
    Question(id=2, text="Which optimization algorithm is a variant of Stochastic Gradient Descent that uses adaptive learning rates?", options=["RMSprop", "Adam", "Adagrad", "All of the above"], correct_option=3, description="Adam, RMSprop, and Adagrad are all adaptive learning rate optimization algorithms."),
    Question(id=3, text="In a Convolutional Neural Network (CNN), what does 'Padding' help with?", options=["Reducing the filter size", "Controlling the spatial size of output volumes", "Increasing dropout rate", "Flattening the image"], correct_option=1, description="Padding ensures that the spatial dimensions of the input and output volumes can be controlled, often to keep them the same."),
    Question(id=4, text="What is the vanishing gradient problem primarily associated with?", options=["Relu activation", "Deep networks with sigmoid or tanh", "Small batch sizes", "Overfitting"], correct_option=1, description="As gradients propagate back through many layers using sigmoid/tanh, they can become very small, preventing weights from updating."),
    Question(id=5, text="Which layer is typically used to reduce the dimensionality of feature maps in a CNN?", options=["Pooling Layer", "Dense Layer", "Dropout Layer", "Input Layer"], correct_option=0, description="Pooling layers (like MaxPool) reduce the height and width of feature maps, reducing parameters and computation."),
    Question(id=6, text="What is the main advantage of using ReLU over Sigmoid?", options=["It is more computationally efficient", "It avoids vanishing gradients (for positive values)", "Both A and B", "Neither"], correct_option=2, description="ReLU is simple to compute and doesn't saturate in the positive direction, which helps training speed."),
    Question(id=7, text="What does 'Batch Normalization' do?", options=["Normalizes inputs to each layer", "Reduces internal covariate shift", "Allows higher learning rates", "All of the above"], correct_option=3, description="Batch Normalization regularizes the model and speeds up training by normalizing layer inputs."),
    Question(id=8, text="In NLP, what does LSTM stand for?", options=["Line Segment Time Memory", "Long Short-Term Memory", "Large Scale Text Modeling", "Logical Sequential Transformer Module"], correct_option=1, description="LSTMs are a type of RNN capable of learning long-term dependencies."),
    Question(id=9, text="What is 'Dropout' used for?", options=["Speeding up training", "Preventing overfitting", "Initialising weights", "Reducing input size"], correct_option=1, description="Dropout randomly deactivates neurons during training to prevent the network from relying too much on specific paths, thus reducing overfitting."),
    Question(id=10, text="Which loss function is commonly used for binary classification?", options=["Mean Squared Error", "Categorical Cross-entropy", "Binary Cross-entropy", "Hinge Loss"], correct_option=2, description="Binary Cross-entropy is the standard loss function for tasks with two classes."),
    Question(id=11, text="What is the purpose of the Softmax function in the output layer?", options=["To turn logits into probabilities", "To act as a regularizer", "To perform dimensionality reduction", "To increase training speed"], correct_option=0, description="Softmax squashes the output into a probability distribution where all values sum to 1."),
    Question(id=12, text="What is 'Transfer Learning'?", options=["Moving data to another server", "Using a pre-trained model on a new task", "Transferring weights between different architectures", "None of the above"], correct_option=1, description="Transfer learning involves taking a model trained on a large dataset and fine-tuning it for a specific, smaller task."),
    Question(id=13, text="Which of the following is NOT a common activation function?", options=["Sigmoid", "Tanh", "ReLU", "Linear Regression"], correct_option=3, description="Linear Regression is a statistical method/model, not an activation function."),
    Question(id=14, text="What is an Epoch?", options=["One pass through one batch", "One full pass through the entire dataset", "The total number of iterations", "A fixed time interval"], correct_option=1, description="An epoch represents one complete cycle through the entire training dataset."),
    Question(id=15, text="Hyperparameters are...", options=["Weights and biases", "Parameters set before training", "Optimized during backpropagation", "Input data values"], correct_option=1, description="Hyperparameters (like learning rate, batch size) are external to the model and set by the user."),
    Question(id=16, text="A 'Deep' Neural Network usually refers to having...", options=["More neurons per layer", "Multiple hidden layers", "Large input features", "High GPU usage"], correct_option=1, description="The 'depth' refers to the number of layers in the network."),
    Question(id=17, text="GANs consist of which two networks?", options=["Input and Output", "Encoder and Decoder", "Generator and Discriminator", "CNN and RNN"], correct_option=2, description="Generative Adversarial Networks use a Generator and a Discriminator competing against each other."),
    Question(id=18, text="What is backpropagation?", options=["Forward pass of data", "Algorithm for calculating gradients", "Weight initialization technique", "A type of dataset"], correct_option=1, description="Backpropagation is the central mechanism for training neural networks by calculating how much to change weights to reduce error."),
    Question(id=19, text="The 'Learning Rate' determines...", options=["The number of layers", "The step size towards the minimum loss", "The activation threshold", "The batch size"], correct_option=1, description="The learning rate controls how much we adjust the weights of our network with respect to the loss gradient."),
    Question(id=20, text="Which architecture introduced 'Attention' mechanisms prominently?", options=["ResNet", "VGG", "Transformer", "LeNet"], correct_option=2, description="Transformers, introduced in 'Attention Is All You Need', revolutionized NLP using self-attention."),
    Question(id=21, text="Overfitting occurs when...", options=["Training error is high", "Validation error is much higher than training error", "Training error is zero", "Validation error is zero"], correct_option=1, description="Overfitting means the model has learned the training noise rather than general patterns, performing poorly on new data."),
]

@app.post("/login")
async def login(request: LoginRequest):
    if not request.student_id:
        raise HTTPException(status_code=400, detail="Student ID required")
    # DEMO MODE: No database storage
    return {"message": "Demo Login successful", "student_id": request.student_id}

@app.get("/questions", response_model=List[Question])
async def get_questions():
    # Shuffle for randomness
    random_questions = random.sample(QUESTIONS, len(QUESTIONS))
    return random_questions

@app.post("/submit")
async def submit_exam(request: dict):
    student_id = request.get("student_id")
    user_answers = request.get("answers", {})
    is_flagged = request.get("is_flagged", False)
    
    # Calculate results directly without DB
    detailed_results = []
    score = 0
    
    if is_flagged:
        message = "Exam FLAGGED due to proctoring violations. Score forced to 0."
        score = 0
    else:
        message = "Exam submitted successfully"
        for q in QUESTIONS:
            qid_str = str(q.id)
            user_choice = user_answers.get(qid_str)
            is_correct = user_choice == q.correct_option
            if is_correct:
                score += 1

    for q in QUESTIONS:
        qid_str = str(q.id)
        user_choice = user_answers.get(qid_str)
        is_correct = user_choice == q.correct_option if not is_flagged else False
        
        detailed_results.append({
            "id": q.id,
            "text": q.text,
            "options": q.options,
            "user_choice": user_choice,
            "correct_option": q.correct_option,
            "is_correct": is_correct,
            "description": q.description
        })
    
    return {
        "message": message,
        "score": score,
        "total": len(QUESTIONS),
        "detailed_results": detailed_results,
        "is_flagged": is_flagged
    }

@app.post("/log-event")
async def log_event(request: LogEventRequest):
    # DEMO MODE: Just print to terminal instead of saving to DB
    print(f"📡 AI EVENT: {request.event_type} for STU: {request.student_id}")
    return {"status": "success", "message": "Demo Event received"}

@app.post("/collect-data")
async def collect_data(request: CollectDataRequest):
    # Keep CSV collection as it's useful for training even in demo mode
    os.makedirs("training", exist_ok=True)
    filename = "training/proctoring_dataset.csv"
    
    # Write header if file doesn't exist
    if not os.path.exists(filename):
        with open(filename, "w") as f:
            headers = ",".join([f"p{i}_{c}" for i in range(468) for c in ['x', 'y', 'z']]) + ",label\n"
            f.write(headers)
            
    with open(filename, "a") as f:
        f.write(f"{request.csv_row},{request.label}\n")
        
    return {"status": "success", "message": "Data collected for training"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host=host, port=port)
