document.addEventListener('DOMContentLoaded', function() {
    // ====== DOM ELEMENTS ======
    const predictionForm = document.getElementById('predictionForm');
    const mrnaSequence = document.getElementById('mrnaSequence');
    const targetGeneSelect = document.getElementById('targetGene');
    const cutPositionInput = document.getElementById('cutPosition');
    const lengthIndicator = document.querySelector('.length-indicator');
    const validationMessage = document.querySelector('.validation-message');
    const resultsContainer = document.querySelector('.results-container');
    const resultsContent = document.querySelector('.results-content');
    const submitBtn = document.querySelector('.submit-btn');
  
    // ====== INITIALIZATION ======
    loadTargetGenes(); // Load genes on startup
  
    // ====== EVENT LISTENERS ======
    // mRNA Sequence Validation (original code preserved)
    mrnaSequence.addEventListener('input', function() {
      const sequence = this.value.toUpperCase();
      this.value = sequence;
      lengthIndicator.textContent = `${sequence.length}/30`;
      
      if (sequence.length > 30) {
        validationMessage.textContent = 'Sequence must not exceed 30 nucleotides';
        validationMessage.style.color = '#ef4444';
      } else if (sequence.length < 30 && sequence.length > 0) {
        validationMessage.textContent = 'Sequence must be exactly 30 nucleotides';
        validationMessage.style.color = '#f59e0b';
      } else if (!/^[ATCG]*$/.test(sequence) && sequence.length > 0) {
        validationMessage.textContent = 'Invalid nucleotides. Use only A, T, C, G';
        validationMessage.style.color = '#ef4444';
      } else if (sequence.length === 30) {
        validationMessage.textContent = 'Valid sequence!';
        validationMessage.style.color = '#22c55e';
      } else {
        validationMessage.textContent = '';
      }
    });
  
    // Form Submission (modified for API)
    predictionForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Validate inputs
      if (mrnaSequence.value.length !== 30) {
        validationMessage.textContent = 'Please enter a valid 30-nucleotide sequence';
        validationMessage.style.color = '#ef4444';
        return;
      }
  
      // Show loading state
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      submitBtn.disabled = true;
  
      try {
        // Prepare API request
        const requestData = {
          mrnaSequence: mrnaSequence.value,
          targetGene: targetGeneSelect.value,
          cutPosition: cutPositionInput.value
        };
  
        // Call Python API
        const response = await fetch('http://localhost:5000/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Prediction failed');
        }
  
        const result = await response.json();
        displayResults(result);
        
      } catch (error) {
        console.error('Prediction error:', error);
        resultsContent.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${error.message || 'Prediction failed'}</p>
          </div>
        `;
      } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  
    // ====== FUNCTIONS ======
    async function loadTargetGenes() {
      try {
        const response = await fetch('http://localhost:5000/api/genes');
        const data = await response.json();
        
        targetGeneSelect.innerHTML = '';
        data.genes.forEach(gene => {
          const option = document.createElement('option');
          option.value = gene.id;
          option.textContent = gene.name;
          targetGeneSelect.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load genes:', error);
        validationMessage.textContent = '';
        validationMessage.style.color = '#ef4444';
      }
    }
  
    function displayResults(result) {
      if (result.type === 'single') {
        // Single position result
        resultsContainer.innerHTML = `
          <div class="single-result">
            <h3>Prediction Results</h3>
            <div class="main-score">
              <p>Efficiency at position ${result.position}:</p>
              <div class="score-value">${result.efficiency.toFixed(4)}</div>
            </div>
            ${getEfficiencyInterpretation(result.efficiency)}
            <h4>Nearby Positions:</h4>
            <div class="nearby-positions">
              ${result.nearby.map(pos => `
                <div class="position ${pos.position === result.position ? 'highlight' : ''}">
                  <span>Position ${pos.position}:</span>
                  <span>${pos.efficiency.toFixed(4)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        document.querySelector('.score-value').textContent = result.efficiency.toFixed(4);

      } else {
        // Multiple positions result
        const optimal = result.optimal_position;
        resultsContent.innerHTML = `
          <div class="multiple-results">
            <h3>Prediction Results</h3>
            <div class="optimal-result">
              <p>Optimal cut position: <strong>${optimal.position}</strong></p>
              <p>Efficiency: <strong>${optimal.efficiency.toFixed(6)}</strong></p>
              ${getEfficiencyInterpretation(optimal.efficiency)}
            </div>
            <h4>All Positions:</h4>
            <div class="all-positions">
              <div class="position-header">
                <span>Position</span>
                <span>Efficiency</span>
              </div>
              ${result.predictions.map(pos => `
                <div class="position ${pos.position === optimal.position ? 'highlight' : ''}">
                  <span>${pos.position}</span>
                  <span>${pos.efficiency.toFixed(6)}</span>
                  ${pos.position === optimal.position ? '<i class="fas fa-star"></i>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      animateScoreValues();
    }
  
    function getEfficiencyInterpretation(efficiency) {
      if (efficiency > 0.75) {
        return '<p class="high-efficiency">High efficiency expected</p>';
      } else if (efficiency > 0.5) {
        return '<p class="medium-efficiency">Moderate efficiency expected</p>';
      } else {
        return '<p class="low-efficiency">Low efficiency expected</p>';
      }
    }
  
    function animateScoreValues() {
      const scoreElements = document.querySelectorAll('.score-value');
      scoreElements.forEach(element => {
        const targetScore = parseFloat(element.textContent);
        let currentScore = 0;
        const increment = targetScore / 20;
        
        const interval = setInterval(() => {
          if (currentScore >= targetScore) {
            element.textContent = targetScore.toFixed(4);
            clearInterval(interval);
          } else {
            currentScore += increment;
            element.textContent = currentScore.toFixed(4);
          }
        }, 50);
      });
    }
  });