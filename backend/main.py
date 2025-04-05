from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
import numpy as np
import os
import pandas as pd
from datetime import datetime, timedelta
from textblob import TextBlob
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import requests
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    LSTM, Bidirectional, Dense, Dropout, Conv1D, MaxPooling1D,
    Flatten, Input, LayerNormalization,BatchNormalization, MultiHeadAttention, SpatialDropout1D
)
from tensorflow.keras.optimizers.schedules import ExponentialDecay
from tensorflow.keras.optimizers import Adam,RMSprop
from tensorflow.keras.losses import Huber
from tensorflow.keras.models import Model
from sklearn.metrics import r2_score, mean_absolute_percentage_error
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import json
from fredapi import Fred


# Load API keys
load_dotenv()

app = FastAPI()

fred = Fred(api_key=os.getenv('API_KEY'))

# Enable CORS to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", api_version="v1", temperature=0.7)

class StockRequest(BaseModel):
    stock_symbol: str

# def fetch_stock_data(stock_symbol):
#     """Fetch historical stock data."""
#     start = (datetime.today() - timedelta(days=365)).strftime('%Y-%m-%d')
#     end = datetime.today().strftime('%Y-%m-%d')
#     stock = yf.download(stock_symbol, start=start, end=end)
#     if stock.empty:
#         return None, None
#     return stock[['Open', 'High', 'Low', 'Close', 'Volume']], stock

# def fetch_stock_data(stock_symbol, start="2023-01-01", end=None):
#     stock_data = yf.download(stock_symbol, start=start, end=end)
#     stock_data = stock_data[['Close']].dropna()
#     stock_data['Close'] = stock_data['Close'].astype("float64")
#     return stock_data

def fetch_stock_data(stock_symbol):
    try:
        # Make sure stock_symbol is a string
        stock_symbol = str(stock_symbol).strip().upper()
        
        # Download data
        data = yf.download(stock_symbol, period="1y")
        
        # Check if data is empty
        if data.empty:
            print(f"No data found for {stock_symbol}")
            return None
            
        return data
    except Exception as e:
        print(f"Error fetching data for {stock_symbol}: {e}")
        return None

def fetch_stock_news(stock_name):
    """Fetches stock-related news using NewsAPI."""
    # Get environment variables
    NEWSAPI_KEY = os.getenv('NEWSAPI_KEY')
    NEWSAPI_URL = os.getenv('NEWSAPI_URL')
    
    # Verify that the environment variables are loaded
    if not NEWSAPI_KEY or not NEWSAPI_URL:
        print("Error: API key or URL not found in environment variables")
        return []
    params = {'q': f"{stock_name} stock market", 'apiKey': NEWSAPI_KEY, 'pageSize': 5}
    response = requests.get(NEWSAPI_URL, params=params)
    
    if response.status_code != 200:
        return []
    
    news_results = response.json().get("articles", [])
    return [{"title": a.get("title", "No Title"), "link": a.get("url", "#"), "summary": a.get("description", "No summary.")[:500]} for a in news_results]



def analyze_sentiment(news_articles):
    """Improved sentiment analysis of news articles using VADER & TextBlob."""
    
    if not news_articles:
        return "No news available"

    analyzer = SentimentIntensityAnalyzer()
    sentiments = []

    for article in news_articles:
        summary = article.get("summary", "")

        # VADER Sentiment Analysis
        vader_score = analyzer.polarity_scores(summary)['compound']
        
        # TextBlob Sentiment Analysis
        textblob_score = TextBlob(summary).sentiment.polarity
        
        # Weighted Sentiment (70% VADER, 30% TextBlob)
        final_score = (0.7 * vader_score) + (0.3 * textblob_score)
        sentiments.append(final_score)

    avg_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0

    # Adjusted thresholds for financial sentiment
    if avg_sentiment > 0.05:
        return "Positive - Buy"
    elif avg_sentiment < -0.05:
        return "Negative - Sell"
    else:
        return "Neutral - Hold"



def analyze_news_with_ai(stock_name, news_articles):
    """AI agent analyzes news deeply including macroeconomic factors."""
    if not news_articles:
        return "No news available for analysis."
    
    prompt = f"""
    As an expert market research analyst, analyze the impact of the following news articles on {stock_name} stock price:
    {json.dumps(news_articles[:3], indent=2)}
    Additionally, consider macroeconomic indicators such as interest rates, inflation, and GDP growth trends.
    Provide a deep insight and investment strategy (BUY, HOLD, SELL) based on these insights.
    """
    return llm.invoke(prompt).content.strip()


# 2️⃣ Determine 'd' using Augmented Dickey-Fuller Test
def get_optimal_d(series):
    result = adfuller(series)
    return 0 if result[1] < 0.05 else 1

# 3️⃣ Select best p, q using AIC
def select_best_arima_order(series, max_p=5, max_q=5, d=1):
    best_aic = float("inf")
    best_order = (0, d, 0)

    for p in range(max_p + 1):
        for q in range(max_q + 1):
            try:
                model = ARIMA(series, order=(p, d, q))
                model_fit = model.fit()
                aic = model_fit.aic
                if aic < best_aic:
                    best_aic = aic
                    best_order = (p, d, q)
            except:
                continue
    print(f"\n✅ Best ARIMA order: {best_order} (AIC = {best_aic:.2f})")
    return best_order


def preprocess_data(df, sequence_length=5):
    """Create sequences for LSTM without scaling."""
    data = df['Close'].values
    X, y = [], []
    for i in range(len(data) - sequence_length):
        X.append(data[i:i+sequence_length])
        y.append(data[i+sequence_length])
    return np.array(X).reshape(-1, sequence_length, 1), np.array(y)


# from tensorflow.keras.models import Model
# from tensorflow.keras.layers import (
#     LSTM, Bidirectional, Dense, Dropout, Conv1D, MaxPooling1D,
#     Flatten, Input, LayerNormalization, MultiHeadAttention, SpatialDropout1D
# )
# from tensorflow.keras.optimizers.schedules import ExponentialDecay
# from tensorflow.keras.optimizers import Adam
# from tensorflow.keras.losses import Huber

# def build_lstm_model(input_shape):
#     """Ultra-Optimized Hybrid Stock Prediction Model with CNN + BiLSTM + Transformer"""
    
#     inputs = Input(shape=input_shape)

#     # 1️⃣ CNN for Feature Extraction (Short-Term Trends)
#     x = Conv1D(filters=64, kernel_size=3, activation='relu', padding='same')(inputs)
#     x = MaxPooling1D(pool_size=2)(x)

#     # 2️⃣ BiLSTM for Sequence Learning (Long-Term Dependencies)
#     x = Bidirectional(LSTM(128, return_sequences=True))(x)
#     x = SpatialDropout1D(0.05)(x)

#     # 3️⃣ Transformer Encoder (Self-Attention Mechanism)
#     attn_layer = MultiHeadAttention(num_heads=4, key_dim=64)(x, x)
#     x = LayerNormalization()(x + attn_layer)  # Add & Norm

#     # 4️⃣ Final BiLSTM Layer
#     x = Bidirectional(LSTM(64, return_sequences=False))(x)
#     x = Dropout(0.05)(x)

#     # 5️⃣ Fully Connected Layers with Swish Activation
#     x = Dense(64, activation='swish')(x)
#     x = Dense(32, activation='swish')(x)
#     output = Dense(1)(x)  # Output Layer (Predicting Next-Day Price)

#     # Compile the model
#     model = Model(inputs, output)

#     # Using Exponential Decay for Learning Rate
#     lr_schedule = ExponentialDecay(initial_learning_rate=0.001, decay_steps=1000, decay_rate=0.9)
#     optimizer = Adam(learning_rate=lr_schedule)

#     model.compile(optimizer=optimizer, loss=Huber(delta=1.0))

#     return model


# def build_lstm_model(stock_symbol):
#     data = fetch_stock_data(stock_symbol)
#     train_data = data[:-30]
#     test_data = data[-30:]

#     train_series = train_data['Close'].values.astype("float64")
#     test_series = test_data['Close'].values.astype("float64")

#     d = get_optimal_d(train_series)
#     order = select_best_arima_order(train_series, max_p=5, max_q=5, d=d)

#     # print(f"\n📈 Training ARIMA{order} on {stock_symbol}...")

#     # Rolling forecast
#     history = list(train_series)
#     predictions = []

#     for t in range(len(test_series)):
#         model = ARIMA(history, order=order)
#         model_fit = model.fit()
#         yhat = model_fit.forecast()[0]
#         predictions.append(yhat)
#         history.append(test_series[t])

#     # Predict next day
#     next_model = ARIMA(history, order=order).fit()
#     # next_day_forecast = next_model.forecast()[0]
    
#     return next_model

# def predict_next_day(model, X_last_sequence):
#     """Predict next day's stock price without scaling."""
#     pred = model.predict(np.array([X_last_sequence]))
#     return pred[0][0]


# @app.post("/predict")
# def predict_stock(request: StockRequest):
#     print("1")
#     df = fetch_stock_data(request.stock_symbol)
#     if isinstance(df, tuple):  # Unpack if necessary
#         df = df[0]  
#     print("2")
#     if df is None:
#         return {"error": "Invalid stock symbol or no data available"}
    
#     news_articles = fetch_stock_news(request.stock_symbol)
#     sentiment = analyze_sentiment(news_articles)
#     deep_insight = analyze_news_with_ai(request.stock_symbol, news_articles)
    
#     X, y = preprocess_data(df)
#     if X is None or len(X) < 30:
#         return {"error": "Not enough data for prediction"}
    
#     train_size = len(X) - 30
#     # model = build_lstm_model((X.shape[1], X.shape[2]))
#     model = build_lstm_model(request.stock_symbol)
#     model.fit(X[:train_size], y[:train_size], epochs=50, batch_size=4, verbose=0)
    
#     y_pred = model.predict(X[train_size:])
#     y_test_actual = y[train_size:]
#     y_pred_actual = y_pred.flatten()

#     r2 = r2_score(y_test_actual, y_pred_actual)
#     mape = mean_absolute_percentage_error(y_test_actual, y_pred_actual) * 100
#     next_day_price = predict_next_day(model, X[-1])
    
    
#     print("Success")
#     return {
#         "predicted_price": float(np.round(next_day_price, 2)),  # Convert to float
#         "sentiment": sentiment,
#         "deep_insight": deep_insight,
#         "accuracy": float(np.round(100 - mape, 2)),  # Convert to float
#         "r2_score": float(np.round(r2, 4)),  # Convert to float
#         "news": news_articles,
#         "y_test_actual": y_test_actual.tolist(),  # Convert ndarray to list
#         "y_pred_actual": y_pred_actual.tolist()   # Convert ndarray to list
#     }
    
   
def build_arima_model(stock_symbol):
    data = fetch_stock_data(stock_symbol)
    train_data = data[:-30]
    test_data = data[-30:]

    train_series = train_data['Close'].values.astype("float64")
    test_series = test_data['Close'].values.astype("float64")

    d = get_optimal_d(train_series)
    order = select_best_arima_order(train_series, max_p=5, max_q=5, d=d)

    # Train the final model on all available data
    full_history = list(train_series) + list(test_series)
    final_model = ARIMA(full_history, order=order)
    final_model_fit = final_model.fit()
    next5_days=final_model_fit.forecast(steps=5)
    last_actual = full_history[-1]

    
    for i, val in enumerate(next5_days, start=1):
        percent = ((float(val) - float(last_actual)) / float(last_actual)) * 100
    
    return final_model_fit, order,next5_days

def predict_next_day(model, order):
    """Predict next day's stock price using ARIMA."""
    forecast = model.forecast(steps=1)
    return forecast[0]

# Define the FRED® series IDs and units for macroeconomic indicators
INDICATORS = {
    "Consumer Spending": ("PCE", "Billions of USD (SAAR)"),
    "Retail Sales": ("RSAFS", "Millions of USD (SA)"),
    "Interest Rates": ("FEDFUNDS", "Percent (%)"),
    "Inflation": ("CPIAUCSL", "Index (1982-1984=100)"),
    "Unemployment Rate": ("UNRATE", "Percent (%)")
}

# Fetch the latest and previous month's data for a given FRED series
def fetch_indicator_data(series_id):
    end_date = datetime.today()
    start_date = end_date - timedelta(days=90)
    data = fred.get_series(series_id, start_date, end_date)

    if data.empty:
        return None, None

    data = data.dropna()
    latest_date = data.index.max()
    latest_value = data.loc[latest_date]

    prev_target_date = latest_date - pd.DateOffset(months=1)
    prev_date = data.index.asof(prev_target_date)

    if pd.isna(prev_date) or prev_date == latest_date:
        return latest_value, None

    prev_value = data.loc[prev_date]
    return latest_value, prev_value

# Interpret the economic signal for each indicator
def interpret_indicator_change(name, change):
    if name in ["Consumer Spending", "Retail Sales"]:
        return "Positive (rising demand)" if change > 0 else "Negative (falling demand)"
    elif name == "Interest Rates":
        return "Negative (higher borrowing cost)" if change > 0 else "Positive (lower borrowing cost)"
    elif name == "Inflation":
        return "Negative (reduces purchasing power)" if change > 0 else "Positive (improves purchasing power)"
    elif name == "Unemployment Rate":
        return "Negative (fewer people employed)" if change > 0 else "Positive (more people employed)"
    return "Neutral"

# Analyze all macroeconomic indicators and return insights + investment suggestion
def analyze_indicators():
    result = {
        "analysis_date": datetime.today().strftime('%Y-%m-%d'),
        "indicators": [],
        "suggestion": ""
    }

    positive_signals = 0
    negative_signals = 0

    for name, (series_id, unit) in INDICATORS.items():
        latest_value, prev_value = fetch_indicator_data(series_id)

        if latest_value is None or prev_value is None:
            result["indicators"].append({
                "name": name,
                "unit": unit,
                "status": "Not enough recent data for analysis."
            })
            continue

        change = latest_value - prev_value
        change_percent = (change / prev_value) * 100
        interpretation = interpret_indicator_change(name, change)

        result["indicators"].append({
            "name": name,
            "unit": unit,
            "latest_value": round(latest_value, 2),
            "previous_value": round(prev_value, 2),
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "interpretation": interpretation
        })

        if "Positive" in interpretation:
            positive_signals += 1
        elif "Negative" in interpretation:
            negative_signals += 1

    # Overall investment suggestion
    if positive_signals > negative_signals:
        result["suggestion"] = "✅ Majority of indicators are favorable. It might be a good time to consider buying the stock."
    elif positive_signals == negative_signals:
        result["suggestion"] = "➖ Indicators are mixed. Consider further company-specific analysis before investing."
    else:
        result["suggestion"] = "❌ Majority of indicators are unfavorable. It might be better to wait before investing."

    return result


@app.post("/predict")
def predict_stock(request: StockRequest):
    print("1")
    df = fetch_stock_data(request.stock_symbol)
    if isinstance(df, tuple):  # Unpack if necessary
        df = df[0]  
    print("2")
    if df is None:
        return {"error": "Invalid stock symbol or no data available"}
    
    news_articles = fetch_stock_news(request.stock_symbol)
    sentiment = analyze_sentiment(news_articles)
    deep_insight = analyze_news_with_ai(request.stock_symbol, news_articles)
    
    # For evaluation purposes
    full_series = df['Close'].values.astype("float64")
    train_size = len(full_series) - 30
    train_series = full_series[:train_size]
    test_series = full_series[train_size:]
    
    # Build ARIMA model - returns the fitted model and its order
    model, order,next5_days = build_arima_model(request.stock_symbol)
    
    
        # direction = "📈 Increase" if percent > 0 else "📉 Decrease" if percent < 0 else "➖ No Change"

    
    # Generate predictions for test data
    predictions = []
    history = list(train_series)
    
    for t in range(len(test_series)):
        temp_model = ARIMA(history, order=order)
        temp_model_fit = temp_model.fit()
        yhat = temp_model_fit.forecast(steps=1)[0]
        predictions.append(yhat)
        history.append(test_series[t])
    
    # Calculate metrics
    y_test_actual = test_series
    y_pred_actual = np.array(predictions)
    
    r2 = r2_score(y_test_actual, y_pred_actual)
    mape = mean_absolute_percentage_error(y_test_actual, y_pred_actual) * 100
    
    # Predict next day price using the full model
    next_day_price = predict_next_day(model, order)
    
    indicators = analyze_indicators()
    print(indicators)
    print("5 days forecast",next5_days)
    print("Success")
    return {
        "predicted_price": float(np.round(next_day_price, 2)),
        "sentiment": sentiment,
        "deep_insight": deep_insight,
        "accuracy": float(np.round(100 - mape, 2)),
        "r2_score": float(np.round(r2, 4)),
        "news": news_articles,
        "y_test_actual": y_test_actual.tolist(),
        "y_pred_actual": y_pred_actual.tolist(),
        "indicators": indicators,
        "next5_days": next5_days
    }