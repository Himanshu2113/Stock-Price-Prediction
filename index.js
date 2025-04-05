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
    resultContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-text">Predicting for ${stockSymbol}</div>
            <div class="loading-spinner">
            <div class="spinner-circle"></div>
            </div>
        </div>
        `;
    // resultContainer.innerHTML = `<p>🔄 Predicting for ${stockSymbol}...</p>`;

    try {
        const response = await fetch("http://206.189.135.225:8000/predict", {
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

        const stock_logo = document.querySelector(".stock-logo");
        stock_logo.innerHTML = stockSymbol;


        // const stock_ticker = document.querySelector(".stock-ticker");
        // stock_ticker.innerHTML = stockSymbol;


        const stockPriceDiv = document.querySelector(".stock-price");
        if (stockPriceDiv) {
            stockPriceDiv.innerHTML = `$${result.predicted_price}`; 
            // Replace +1.2% with the actual change if available in your response
        }

        // Update confidence level, time series model, and news sentiment
        const confidenceLevelElement = document.querySelector("#confidenceLevel strong");
        confidenceLevelElement.textContent = result.accuracy;
        confidenceLevelElement.style.color = "green";
        // document.querySelector("#confidenceLevel strong").textContent = result.accuracy;
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
        plotPredictionChart(result.y_test_actual,result.y_pred_actual);
        console.log(result.deep_insight);

        populatePredictionTable(result.next5_days, result.percent, result.direction);

        updateEconomicIndicators(result.indicators);

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




function plotPredictionChart(actualPrices, predictedPrices) {
    console.log("Actual Prices:", actualPrices);
    console.log("Predicted Prices:", predictedPrices);

    const chartContainer = document.querySelector(".prediction-chart");
    chartContainer.innerHTML = `<canvas id="actualPriceChart" style="height: 600px;"></canvas>`;

    const ctx = document.getElementById("actualPriceChart").getContext("2d");

    const last30Days = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);

    // Make sure data is numeric
    const validActualPrices = actualPrices.map(price => parseFloat(price));
    const validPredictedPrices = predictedPrices.map(price => parseFloat(price));

    // Find min and max for better scaling (considering both datasets)
    const allPrices = [...validActualPrices, ...validPredictedPrices];
    const minPrice = Math.min(...allPrices) * 0.95; // 5% buffer below min
    const maxPrice = Math.max(...allPrices) * 1.05; // 5% buffer above max

    new Chart(ctx, {
        type: "line",
        data: {
            labels: last30Days.slice(0, validActualPrices.length), // Match labels to data length
            datasets: [
                {
                    label: "Actual Price",
                    data: validActualPrices,
                    borderColor: "blue",
                    borderWidth: 3,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: "blue",
                    tension: 0.2
                },
                {
                    label: "Predicted Price",
                    data: validPredictedPrices,
                    borderColor: "red",
                    borderWidth: 3,
                    fill: false,
                    pointRadius: 4,
                    pointBackgroundColor: "red",
                    tension: 0.2,
                    borderDash: [5, 5] // Add dashed line for predicted values
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y.toFixed(2);
                            return `${datasetLabel}: $${value}`;
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
                        // display: true // Show Y grid lines
                    },
                    min: minPrice,
                    max: maxPrice
                }
            }
        }
    });
}


  const actualPrices = [
  145, 146, 147, 146, 144, 145, 148, 150, 151, 149,
  150, 152, 151, 153, 155, 156, 157, 158, 157, 159,
  160, 161, 160, 159, 158
]; // 25 days

const predictedPrices = [
  159, 161, 162, 161, 163
]; // Next 5 days

const labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
const allPrices = [...actualPrices, ...predictedPrices];
const minPrice = Math.min(...allPrices) * 0.95;
const maxPrice = Math.max(...allPrices) * 1.05;

const ctx = document.getElementById('predictionChart').getContext('2d');

const predictionChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: labels,
    datasets: [
      {
        label: 'Actual Price',
        data: [...actualPrices, ...Array(5).fill(null)], // fill null to offset
        borderColor: 'blue',
        backgroundColor: 'rgba(0, 0, 255, 0.1)',
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: 'blue',
        borderWidth: 2
      },
      {
        label: 'Predicted Price',
        data: [...Array(25).fill(null), ...predictedPrices], // align after actuals
        borderColor: 'red',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: 'red',
        borderWidth: 2,
        borderDash: [5, 5]
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y !== null ? context.parsed.y.toFixed(2) : 'N/A';
            return `${datasetLabel}: $${value}`;
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
        min: minPrice,
        max: maxPrice,
        title: {
          display: true,
          text: "Stock Price ($)"
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)"
        }
      }
    }
  }
});

// Function to update market indicators with backend data
function updateEconomicIndicators(data) {
  // Get the container element
  const marketIndicatorsContainer = document.querySelector('.market-indicators');
  
  // Clear existing indicators if needed
  // Uncomment if you want to replace existing indicators instead of adding to them
  // marketIndicatorsContainer.innerHTML = '';
  
  // Process each indicator from the backend
  data.indicators.forEach(indicator => {
    // Create new indicator elements
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'indicator';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'indicator-label';
    labelDiv.textContent = indicator.name;
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'indicator-value';
    
    // Determine if value is up or down based on interpretation
    if (indicator.interpretation.includes('Positive')) {
      valueDiv.classList.add('up');
    } else {
      valueDiv.classList.add('down');
    }
    
    // Format the value based on unit
    let formattedValue;
    if (indicator.unit.includes('Billions')) {
      formattedValue = `$${indicator.latest_value.toLocaleString()} B`;
    } else if (indicator.unit.includes('Millions')) {
      formattedValue = `$${(indicator.latest_value/1000).toLocaleString()} B`;
    } else if (indicator.unit.includes('Percent')) {
      formattedValue = `${indicator.latest_value.toFixed(2)}%`;
    } else if (indicator.unit.includes('Index')) {
      formattedValue = indicator.latest_value.toFixed(2);
    } else {
      formattedValue = indicator.latest_value.toLocaleString();
    }
    
    // Create the percentage change element
    const smallElement = document.createElement('small');
    const changePrefix = indicator.change_percent > 0 ? '+' : '';
    smallElement.textContent = `${changePrefix}${indicator.change_percent.toFixed(2)}%`;
    
    // Set the value text and append the small element
    valueDiv.textContent = formattedValue + ' ';
    valueDiv.appendChild(smallElement);
    
    // Assemble the indicator
    indicatorDiv.appendChild(labelDiv);
    indicatorDiv.appendChild(valueDiv);
    
    // Add to the container
    marketIndicatorsContainer.appendChild(indicatorDiv);
  });
  
  // Handle suggestion if present
  if (data.suggestion) {
    // Create a div for the suggestion
    const suggestionDiv = document.createElement('div');
    suggestionDiv.className = 'market-suggestion';
    
    // Check if suggestion starts with emoji and format accordingly
    if (data.suggestion.startsWith('✅') || data.suggestion.startsWith('⚠️') || data.suggestion.startsWith('❌')) {
      const suggestionParts = data.suggestion.split(' ');
      const emoji = suggestionParts[0];
      const text = suggestionParts.slice(1).join(' ');
      
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'suggestion-emoji';
      emojiSpan.textContent = emoji + ' ';
      
      const textSpan = document.createElement('span');
      textSpan.className = 'suggestion-text';
      textSpan.textContent = text;
      
      suggestionDiv.appendChild(emojiSpan);
      suggestionDiv.appendChild(textSpan);
    } else {
      suggestionDiv.textContent = data.suggestion;
    }
    
    // Add suggestion after the market indicators or to a specific container
    // Option 1: Add directly after market indicators
    marketIndicatorsContainer.parentNode.insertBefore(suggestionDiv, marketIndicatorsContainer.nextSibling);
    
    // Option 2: Add to a specific suggestion container if it exists
    // const suggestionContainer = document.querySelector('.suggestion-container');
    // if (suggestionContainer) {
    //   suggestionContainer.innerHTML = '';
    //   suggestionContainer.appendChild(suggestionDiv);
    // }
  }
}


function populatePredictionTable(next5Days, percentChanges, directions) {
    const tableBody = document.getElementById('predictionTableBody');
    tableBody.innerHTML = ''; // Clear existing content
    
    // Loop through predictions and create table rows
    for (let i = 0; i < next5Days.length; i++) {
      // Calculate future day number
      const futureDate = i + 1;
      
      // Create table row
      const row = document.createElement('tr');
      
      // Create and append table cells
      const dateCell = document.createElement('td');
      dateCell.style.padding = '12px';
      dateCell.style.border = '1px solid #ddd';
      dateCell.textContent = 'Day' + futureDate;
      
      const priceCell = document.createElement('td');
      priceCell.style.padding = '12px';
      priceCell.style.border = '1px solid #ddd';
      priceCell.textContent = '$' + next5Days[i].toFixed(2);
      
      const percentCell = document.createElement('td');
      percentCell.style.padding = '12px';
      percentCell.style.border = '1px solid #ddd';
      const percentValue = percentChanges[i].toFixed(2);
      
      // Add direction arrow based on the direction variable
      if (directions[i] === 'Increase') {
        percentCell.innerHTML = percentValue + '% <span style="color: green;">↑</span>';
        percentCell.style.color = 'green';
      } else if (directions[i] === 'Decrease') {
        percentCell.innerHTML = percentValue + '% <span style="color: red;">↓</span>';
        percentCell.style.color = 'red';
      } else {
        // No change
        percentCell.textContent = percentValue + '%';
      }
      
      // Append cells to row
      row.appendChild(dateCell);
      row.appendChild(priceCell);
      row.appendChild(percentCell);
      
      // Append row to table body
      tableBody.appendChild(row);
    }
}

// function populatePredictionTable(next5Days, percentChanges) {
//     const tableBody = document.getElementById('predictionTableBody');
//     tableBody.innerHTML = ''; // Clear existing content
    
//     // Get the current date to calculate future dates
//     const today = new Date();
    
//     // Loop through predictions and create table rows
//     for (let i = 0; i < next5Days.length; i++) {
//       // Calculate the date (current date + i+1 days)
//     //   const futureDate = new Date(today);
//     //   futureDate.setDate(today.getDate() + i + 1);
//       futureDate=i+1;
//     //   const dateString = futureDate.toLocaleDateString('en-US');
      
//       // Create table row
//       const row = document.createElement('tr');
      
//       // Create and append table cells
//       const dateCell = document.createElement('td');
//       dateCell.style.padding = '12px';
//       dateCell.style.border = '1px solid #ddd';
//       dateCell.textContent = 'Day' + futureDate;
      
//       const priceCell = document.createElement('td');
//       priceCell.style.padding = '12px';
//       priceCell.style.border = '1px solid #ddd';
//       priceCell.textContent = '$' + next5Days[i].toFixed(2);
      
//       const percentCell = document.createElement('td');
//       percentCell.style.padding = '12px';
//       percentCell.style.border = '1px solid #ddd';
//       const percentValue = percentChanges[i].toFixed(2);
//       percentCell.textContent = percentValue + '%';
      
//       // Color the percent change based on value
//       if (percentChanges[i] > 0) {
//         percentCell.style.color = 'green';
//       } else if (percentChanges[i] < 0) {
//         percentCell.style.color = 'red';
//       }
      
//       // Append cells to row
//       row.appendChild(dateCell);
//       row.appendChild(priceCell);
//       row.appendChild(percentCell);
      
//       // Append row to table body
//       tableBody.appendChild(row);
//     }
//   }
// function updateEconomicIndicators(data) {
//   // Get the container element
//   const marketIndicatorsContainer = document.querySelector('.market-indicators');
  
//   // Process each indicator from the backend
//   data.indicators.forEach(indicator => {
//     // Create new indicator elements
//     const indicatorDiv = document.createElement('div');
//     indicatorDiv.className = 'indicator';
    
//     const labelDiv = document.createElement('div');
//     labelDiv.className = 'indicator-label';
//     labelDiv.textContent = indicator.name;
    
//     const valueDiv = document.createElement('div');
//     valueDiv.className = 'indicator-value';
    
//     // Determine if value is up or down based on interpretation
//     if (indicator.interpretation.includes('Positive')) {
//       valueDiv.classList.add('up');
//     } else {
//       valueDiv.classList.add('down');
//     }
    
//     // Format the value based on unit
//     let formattedValue;
//     if (indicator.unit.includes('Billions')) {
//       formattedValue = `$${indicator.latest_value.toLocaleString()} B`;
//     } else if (indicator.unit.includes('Millions')) {
//       formattedValue = `$${(indicator.latest_value/1000).toLocaleString()} B`;
//     } else {
//       formattedValue = indicator.latest_value.toLocaleString();
//     }
    
//     // Create the percentage change element
//     const smallElement = document.createElement('small');
//     const changePrefix = indicator.change_percent > 0 ? '+' : '';
//     smallElement.textContent = `${changePrefix}${indicator.change_percent.toFixed(2)}%`;
    
//     // Set the value text and append the small element
//     valueDiv.textContent = formattedValue + ' ';
//     valueDiv.appendChild(smallElement);
    
//     // Assemble the indicator
//     indicatorDiv.appendChild(labelDiv);
//     indicatorDiv.appendChild(valueDiv);
    
//     // Add to the container
//     marketIndicatorsContainer.appendChild(indicatorDiv);
//   });
// }

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

