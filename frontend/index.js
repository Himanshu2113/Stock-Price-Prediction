// async function runPrediction() {
//     const stockSymbolInput = document.getElementById("stockSymbol");
//     const stockSymbol = stockSymbolInput.value.trim();

//     if (!stockSymbol) {
//         alert("Please enter a stock symbol.");
//         return;
//     }

//     console.log("Running prediction for:", stockSymbol);

//     // Create or update the result display
//     let resultContainer = document.getElementById("predictionResult");
//     if (!resultContainer) {
//         resultContainer = document.createElement("div");
//         resultContainer.id = "predictionResult";
//         resultContainer.style.marginTop = "10px";
//         document.querySelector(".quick-actions").appendChild(resultContainer);
//     }

//     // Show loading state
//     resultContainer.innerHTML = `<p>🔄 Predicting for ${stockSymbol}...</p>`;

//     try {
//         const response = await fetch("http://127.0.0.1:8000/predict", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ stock_symbol: stockSymbol })
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const result = await response.json();
//         console.log("Prediction result:", result);


//         const stockPriceDiv = document.querySelector(".stock-price");
//         if (stockPriceDiv) {
//             stockPriceDiv.innerHTML = `$${result.predicted_price} <span class="up">+1.2%</span>`; 
//             // Replace +1.2% with the actual change if available in your response
//         }

//          // Update confidence level, time series model, and news sentiment
//         document.querySelector("#confidenceLevel strong").textContent = result.accuracy;
//         // document.querySelector("#timeSeriesModel strong").textContent = result.time_series_model;
//         document.querySelector("#newsSentiment strong").textContent = result.sentiment;


//         // Update News List
//         const newsContainer = document.querySelector(".news-list");
//         newsContainer.innerHTML = ""; // Clear previous news

//         if (result.news && result.news.length > 0) {
//             result.news.forEach((newsItem) => {
//                 const newsElement = document.createElement("div");
//                 newsElement.classList.add("news-item");

//                 // Set a character limit for the summary
//                 const maxSummaryLength = 200; // Adjust as needed
//                 const fullSummary = newsItem.summary;
//                 let displayedSummary = fullSummary;

//                 let readMoreHTML = "";
//                 if (fullSummary.length > maxSummaryLength) {
//                     displayedSummary = fullSummary.substring(0, maxSummaryLength) + "...";
//                     readMoreHTML = `<span class="read-more" style="color: blue; cursor: pointer;">Read More</span>`;
//                 }

//                 newsElement.innerHTML = `
//                     <div class="news-title">
//                         <a href="${newsItem.link}" target="_blank">${newsItem.title}</a>
//                     </div>
//                     <div class="news-summary">
//                         <span class="short-summary">${displayedSummary}</span>
//                         <span class="full-summary" style="display: none;">${fullSummary}</span>
//                         ${readMoreHTML}
//                     </div>
//                 `;

//                 // Add click event for "Read More"
//                 const readMoreBtn = newsElement.querySelector(".read-more");
//                 if (readMoreBtn) {
//                     readMoreBtn.addEventListener("click", function () {
//                         const shortSummary = newsElement.querySelector(".short-summary");
//                         const fullSummaryElement = newsElement.querySelector(".full-summary");

//                         shortSummary.style.display = "none";
//                         fullSummaryElement.style.display = "inline";
//                         readMoreBtn.style.display = "none"; // Hide "Read More" after clicking
//                     });
//                 }

//                 newsContainer.appendChild(newsElement);
//             });
//         } else {
//             newsContainer.innerHTML = "<p>No news available.</p>";
//         }

//         // Call function to plot chart
//         plotPredictionChart(result.y_test_actual);




// async function runPrediction() {
//     const stockSymbolInput = document.getElementById("stockSymbol");
//     const stockSymbol = stockSymbolInput.value.trim();

//     if (!stockSymbol) {
//         alert("Please enter a stock symbol.");
//         return;
//     }

//     console.log("Running prediction for:", stockSymbol);

//     // Create or update the result display
//     let resultContainer = document.getElementById("predictionResult");
//     if (!resultContainer) {
//         resultContainer = document.createElement("div");
//         resultContainer.id = "predictionResult";
//         resultContainer.style.marginTop = "10px";
//         document.querySelector(".quick-actions").appendChild(resultContainer);
//     }

//     // Show loading state
//     resultContainer.innerHTML = `<p>🔄 Predicting for ${stockSymbol}...</p>`;

//     try {
//         const response = await fetch("http://127.0.0.1:8000/predict", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ stock_symbol: stockSymbol })
//         });

//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }

//         const result = await response.json();
//         console.log("Prediction result:", result);

//         // Store the prediction result in local storage with a timestamp
//         const timestamp = new Date().toISOString();
//         const storageKey = `prediction_${stockSymbol}_${timestamp}`;
        
//         // Create storage object with all relevant data
//         const storageData = {
//             timestamp: timestamp,
//             stockSymbol: stockSymbol,
//             predictedPrice: result.predicted_price,
//             accuracy: result.accuracy,
//             sentiment: result.sentiment,
//             news: result.news,
//             yTestActual: result.y_test_actual,
//             // Add any other fields you want to store
//         };
        
//         // Save to local storage
//         localStorage.setItem(storageKey, JSON.stringify(storageData));
        
//         // Also store a list of all predictions for easy retrieval
//         let predictionHistory = JSON.parse(localStorage.getItem('prediction_history') || '[]');
//         predictionHistory.push({
//             key: storageKey,
//             stockSymbol: stockSymbol,
//             timestamp: timestamp
//         });
//         localStorage.setItem('prediction_history', JSON.stringify(predictionHistory));

//         const stockPriceDiv = document.querySelector(".stock-price");
//         if (stockPriceDiv) {
//             stockPriceDiv.innerHTML = `$${result.predicted_price} <span class="up">+1.2%</span>`; 
//             // Replace +1.2% with the actual change if available in your response
//         }

//         // Update confidence level, time series model, and news sentiment
//         document.querySelector("#confidenceLevel strong").textContent = result.accuracy;
//         // document.querySelector("#timeSeriesModel strong").textContent = result.time_series_model;
//         document.querySelector("#newsSentiment strong").textContent = result.sentiment;

//         // Update News List
//         const newsContainer = document.querySelector(".news-list");
//         newsContainer.innerHTML = ""; // Clear previous news

//         if (result.news && result.news.length > 0) {
//             result.news.forEach((newsItem) => {
//                 const newsElement = document.createElement("div");
//                 newsElement.classList.add("news-item");

//                 // Set a character limit for the summary
//                 const maxSummaryLength = 200; // Adjust as needed
//                 const fullSummary = newsItem.summary;
//                 let displayedSummary = fullSummary;

//                 let readMoreHTML = "";
//                 if (fullSummary.length > maxSummaryLength) {
//                     displayedSummary = fullSummary.substring(0, maxSummaryLength) + "...";
//                     readMoreHTML = `<span class="read-more" style="color: blue; cursor: pointer;">Read More</span>`;
//                 }

//                 newsElement.innerHTML = `
//                     <div class="news-title">
//                         <a href="${newsItem.link}" target="_blank">${newsItem.title}</a>
//                     </div>
//                     <div class="news-summary">
//                         <span class="short-summary">${displayedSummary}</span>
//                         <span class="full-summary" style="display: none;">${fullSummary}</span>
//                         ${readMoreHTML}
//                     </div>
//                 `;

//                 // Add click event for "Read More"
//                 const readMoreBtn = newsElement.querySelector(".read-more");
//                 if (readMoreBtn) {
//                     readMoreBtn.addEventListener("click", function () {
//                         const shortSummary = newsElement.querySelector(".short-summary");
//                         const fullSummaryElement = newsElement.querySelector(".full-summary");

//                         shortSummary.style.display = "none";
//                         fullSummaryElement.style.display = "inline";
//                         readMoreBtn.style.display = "none"; // Hide "Read More" after clicking
//                     });
//                 }

//                 newsContainer.appendChild(newsElement);
//             });
//         } else {
//             newsContainer.innerHTML = "<p>No news available.</p>";
//         }

//         // Call function to plot chart
//         plotPredictionChart(result.y_test_actual);
//         console.log(result.deep_insight)

//         // for current page insights
//         // const deepInsightElement = document.querySelector("#deepInsight");
//         // if (deepInsightElement && result.deep_insight) {
//         //     deepInsightElement.innerHTML = `<strong>${result.deep_insight}</strong>`;
//         // } else {
//         //     console.error("Deep insight element not found or no data available");
//         // }


//         // for next page insights
//         // This stores the insight data when it's received
//         if (result.deep_insight) {
//             localStorage.setItem("stockInsightData", result.deep_insight);
//             localStorage.setItem("stockInsightSymbol", stockSymbol);
//         }



//         const deepInsightElement = document.querySelector("#deepInsight");
//         if (deepInsightElement && result.deep_insight) {
//             // deepInsightElement.innerHTML = `<strong>${result.deep_insight}</strong>`;
            
//             // Store the insight data for the details page
//             localStorage.setItem("stockInsightData", result.deep_insight);
//             localStorage.setItem("stockInsightSymbol", stockSymbol);
//         }

//         // Update UI with the prediction result
//         resultContainer.innerHTML = `
//             <p><strong>Results</strong></p>`;

//     } catch (error) {
//         console.error("Error running prediction:", error);
//         resultContainer.innerHTML = `<p style="color: red;">❌ Failed to fetch prediction. Please try again.</p>`;

//          // Store the error in local storage too
//         const timestamp = new Date().toISOString();
//         localStorage.setItem(`prediction_error_${stockSymbol}_${timestamp}`, JSON.stringify({
//             timestamp: timestamp,
//             stockSymbol: stockSymbol,
//             error: error.message
//         }));
//     }
// }
async function runPrediction() {
    const stockSymbolInput = document.getElementById("stockSymbol");
    const stockSymbol = stockSymbolInput.value.trim();

    if (!stockSymbol) {
        alert("Please enter a stock symbol.");
        return;
    }

    console.log("Running prediction for:", stockSymbol);

    // Create or update the result display
    let resultContainer = document.getElementById("predictionResult");
    if (!resultContainer) {
        resultContainer = document.createElement("div");
        resultContainer.id = "predictionResult";
        resultContainer.style.marginTop = "10px";
        document.querySelector(".quick-actions").appendChild(resultContainer);
    }

    // Show loading state
    resultContainer.innerHTML = `<p>🔄 Predicting for ${stockSymbol}...</p>`;

    try {
        const response = await fetch("http://127.0.0.1:8000/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ stock_symbol: stockSymbol })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Prediction result:", result);

        // Store the prediction result in local storage with a timestamp
        const timestamp = new Date().toISOString();
        const storageKey = `prediction_${stockSymbol}_${timestamp}`;
        
        // Create storage object with all relevant data
        const storageData = {
            timestamp: timestamp,
            stockSymbol: stockSymbol,
            predictedPrice: result.predicted_price,
            accuracy: result.accuracy,
            sentiment: result.sentiment,
            news: result.news,
            yTestActual: result.y_test_actual,
            deepInsight: result.deep_insight // Store deep insight in the main prediction data
        };
        
        // Save to local storage
        localStorage.setItem(storageKey, JSON.stringify(storageData));
        
        // Also store a list of all predictions for easy retrieval
        let predictionHistory = JSON.parse(localStorage.getItem('prediction_history') || '[]');
        predictionHistory.push({
            key: storageKey,
            stockSymbol: stockSymbol,
            timestamp: timestamp
        });
        localStorage.setItem('prediction_history', JSON.stringify(predictionHistory));

        // IMPORTANT: Store the deep insight data separately and immediately
        // This ensures it's available even when navigating away
        if (result.deep_insight) {
            localStorage.setItem("stockInsightData", result.deep_insight);
            localStorage.setItem("stockInsightSymbol", stockSymbol);
            
            // Also store the current price if available for display on the insight page
            if (result.predicted_price) {
                localStorage.setItem("stockPrice", `$${result.predicted_price}`);
            }
        }

        const stockPriceDiv = document.querySelector(".stock-price");
        if (stockPriceDiv) {
            stockPriceDiv.innerHTML = `$${result.predicted_price} <span class="up">+1.2%</span>`; 
            // Replace +1.2% with the actual change if available in your response
        }

        // Update confidence level, time series model, and news sentiment
        document.querySelector("#confidenceLevel strong").textContent = result.accuracy;
        // document.querySelector("#timeSeriesModel strong").textContent = result.time_series_model;
        document.querySelector("#newsSentiment strong").textContent = result.sentiment;

        // Update News List
        const newsContainer = document.querySelector(".news-list");
        newsContainer.innerHTML = ""; // Clear previous news

        if (result.news && result.news.length > 0) {
            result.news.forEach((newsItem) => {
                const newsElement = document.createElement("div");
                newsElement.classList.add("news-item");

                // Set a character limit for the summary
                const maxSummaryLength = 200; // Adjust as needed
                const fullSummary = newsItem.summary;
                let displayedSummary = fullSummary;

                let readMoreHTML = "";
                if (fullSummary.length > maxSummaryLength) {
                    displayedSummary = fullSummary.substring(0, maxSummaryLength) + "...";
                    readMoreHTML = `<span class="read-more" style="color: blue; cursor: pointer;">Read More</span>`;
                }

                newsElement.innerHTML = `
                    <div class="news-title">
                        <a href="${newsItem.link}" target="_blank">${newsItem.title}</a>
                    </div>
                    <div class="news-summary">
                        <span class="short-summary">${displayedSummary}</span>
                        <span class="full-summary" style="display: none;">${fullSummary}</span>
                        ${readMoreHTML}
                    </div>
                `;

                // Add click event for "Read More"
                const readMoreBtn = newsElement.querySelector(".read-more");
                if (readMoreBtn) {
                    readMoreBtn.addEventListener("click", function () {
                        const shortSummary = newsElement.querySelector(".short-summary");
                        const fullSummaryElement = newsElement.querySelector(".full-summary");

                        shortSummary.style.display = "none";
                        fullSummaryElement.style.display = "inline";
                        readMoreBtn.style.display = "none"; // Hide "Read More" after clicking
                    });
                }

                newsContainer.appendChild(newsElement);
            });
        } else {
            newsContainer.innerHTML = "<p>No news available.</p>";
        }

        // Call function to plot chart
        plotPredictionChart(result.y_test_actual);
        console.log(result.deep_insight);

        // Update the deepInsight element on the current page if it exists
        const deepInsightElement = document.getElementById("deepInsight");
        if (deepInsightElement && result.deep_insight) {
            // Just show a preview on the current page
            const previewText = result.deep_insight.substring(0, 150) + "...";
            deepInsightElement.innerHTML = `<strong>${previewText}</strong>`;
        }

        // Update UI with the prediction result
        resultContainer.innerHTML = `
            <p><strong>Results</strong></p>`;

    } catch (error) {
        console.error("Error running prediction:", error);
        resultContainer.innerHTML = `<p style="color: red;">❌ Failed to fetch prediction. Please try again.</p>`;

        // Store the error in local storage too
        const timestamp = new Date().toISOString();
        localStorage.setItem(`prediction_error_${stockSymbol}_${timestamp}`, JSON.stringify({
            timestamp: timestamp,
            stockSymbol: stockSymbol,
            error: error.message
        }));
    }
}


// Function to plot the chart
function plotPredictionChart(actualPrices) {
    console.log("Actual Prices:", actualPrices);

    const chartContainer = document.querySelector(".prediction-chart");
    chartContainer.innerHTML = `<canvas id="actualPriceChart" style="height: 300px;"></canvas>`; // Add height

    const ctx = document.getElementById("actualPriceChart").getContext("2d");

    const last30Days = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);

    // Make sure data is numeric
    const validPrices = actualPrices.map(price => parseFloat(price));

    // Find min and max for better scaling
    const minPrice = Math.min(...validPrices) * 0.95; // 5% buffer below min
    const maxPrice = Math.max(...validPrices) * 1.05; // 5% buffer above max

    new Chart(ctx, {
        type: "line",
        data: {
            labels: last30Days.slice(0, validPrices.length), // Match labels to data length
            datasets: [
                {
                    label: "Actual Price",
                    data: validPrices,
                    borderColor: "blue",
                    borderWidth: 3,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: "blue",
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Days"
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Stock Price ($)"
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.1)", // Light grid lines
                        display: true // Show Y grid lines
                    },
                    min: minPrice,
                    max: maxPrice
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
      const tabs = document.querySelectorAll('.tab');
      const contentSlider = document.querySelector('.content-slider');
      
      tabs.forEach(tab => {
        tab.addEventListener('click', function() {
          // Update active tab
          document.querySelector('.tab.active').classList.remove('active');
          this.classList.add('active');
          
          // Slide content
          const index = this.getAttribute('data-index');
          contentSlider.style.transform = `translateX(-${index * 100}%)`;
        });
      });
    });


// function navigateToPredictions() {
//     window.location.href = "http://127.0.0.1:5500/insight-details.html"; // Change to your actual predictions page URL
// }

