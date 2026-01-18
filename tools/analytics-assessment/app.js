document.addEventListener('DOMContentLoaded', function() {
    // ===========================================
    // GOOGLE SHEETS INTEGRATION
    // Paste your Google Apps Script Web App URL below after deploying
    // ===========================================
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzYFyuHLYP3pKO1UlO5zyMum4opUIOLXj0VC9xvcoHWp8XpVfWSLZGy6eQrmtDTrTsXww/exec';

    // Submit data to Google Sheets (runs in background, doesn't block UI)
    function submitToGoogleSheets(formData) {
        if (!GOOGLE_SCRIPT_URL) {
            console.log('Google Sheets integration not configured. Set GOOGLE_SCRIPT_URL to enable.');
            return;
        }

        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(formData)
        })
        .then(() => {
            console.log('Data submitted to Google Sheets');
        })
        .catch(error => {
            console.error('Error submitting to Google Sheets:', error);
        });
    }

    // Skill definitions for each category
    const skillDefinitions = {
        bdk: [
            { id: 'bdk_kpis', name: "Knowing the company's KPIs" },
            { id: 'bdk_competitors', name: 'Competitor performance' },
            { id: 'bdk_levers', name: 'Performance improvement levers' },
            { id: 'bdk_analytics', name: 'Analytics levers' },
            { id: 'bdk_legal', name: 'Legal and compliance constraints' },
            { id: 'bdk_strategy', name: 'Data and analytics strategy' }
        ],
        sa: [
            { id: 'sa_descriptive', name: 'Descriptive analytics' },
            { id: 'sa_predictive', name: 'Predictive analytics' },
            { id: 'sa_critical', name: "Critical thinking of others' analyses" },
            { id: 'sa_visualization', name: 'Data visualization' },
            { id: 'sa_rct', name: 'Randomized controlled trials' },
            { id: 'sa_aiml', name: 'AI and ML' }
        ],
        dm: [
            { id: 'dm_internal', name: 'Internal data sources' },
            { id: 'dm_external', name: 'External and open data sources' },
            { id: 'dm_joining', name: 'How to move and join data' },
            { id: 'dm_pipeline', name: 'Setting up a data pipeline' },
            { id: 'dm_dashboards', name: 'Developing BI dashboards' },
            { id: 'dm_factory', name: 'Running data factory' }
        ]
    };

    // Initialize sliders
    const sliders = document.querySelectorAll('.slider');
    sliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + '_val');

        // Update display on input
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
        });
    });

    // Section references
    const introSection = document.getElementById('intro-section');
    const surveySection = document.getElementById('survey-section');
    const resultsSection = document.getElementById('results-section');
    const form = document.getElementById('assessment-form');

    // Start button - go from intro to survey
    document.getElementById('start-btn').addEventListener('click', function() {
        introSection.classList.add('hidden');
        surveySection.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // Back to intro button
    document.getElementById('back-to-intro-btn').addEventListener('click', function() {
        surveySection.classList.add('hidden');
        introSection.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Gather form data
        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            industry: document.getElementById('industry').value,
            aspirations: document.getElementById('aspirations').value,
            scores: {}
        };

        // Gather all skill scores
        sliders.forEach(slider => {
            formData.scores[slider.name] = parseInt(slider.value);
        });

        // Calculate category averages
        formData.averages = calculateAverages(formData.scores);

        // Submit to Google Sheets (background, non-blocking)
        submitToGoogleSheets(formData);

        // Display results
        displayResults(formData);

        // Generate prompts
        generatePrompts(formData);

        // Switch to results view
        surveySection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // Back button
    document.getElementById('back-btn').addEventListener('click', function() {
        resultsSection.classList.add('hidden');
        surveySection.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // Copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const promptNum = this.getAttribute('data-prompt');
            const promptContent = document.getElementById('prompt-' + promptNum).textContent;

            navigator.clipboard.writeText(promptContent).then(() => {
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.classList.add('copied');

                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);
            });
        });
    });

    function calculateAverages(scores) {
        const bdkScores = Object.keys(scores)
            .filter(k => k.startsWith('bdk_'))
            .map(k => scores[k]);

        const saScores = Object.keys(scores)
            .filter(k => k.startsWith('sa_'))
            .map(k => scores[k]);

        const dmScores = Object.keys(scores)
            .filter(k => k.startsWith('dm_'))
            .map(k => scores[k]);

        const bdkAvg = bdkScores.reduce((a, b) => a + b, 0) / bdkScores.length;
        const saAvg = saScores.reduce((a, b) => a + b, 0) / saScores.length;
        const dmAvg = dmScores.reduce((a, b) => a + b, 0) / dmScores.length;
        const overallAvg = (bdkAvg + saAvg + dmAvg) / 3;

        return {
            bdk: bdkAvg,
            sa: saAvg,
            dm: dmAvg,
            overall: overallAvg
        };
    }

    function getScoreClass(score) {
        if (score <= 3) return 'low';
        if (score <= 6) return 'medium';
        return 'high';
    }

    function displayResults(formData) {
        // Header
        document.getElementById('result-name').textContent = formData.name;
        document.getElementById('result-industry').textContent = formData.industry;

        // Averages
        document.getElementById('bdk-avg').textContent = formData.averages.bdk.toFixed(1);
        document.getElementById('sa-avg').textContent = formData.averages.sa.toFixed(1);
        document.getElementById('dm-avg').textContent = formData.averages.dm.toFixed(1);
        document.getElementById('overall-avg').textContent = formData.averages.overall.toFixed(1);

        // Skills grids
        displaySkillsGrid('bdk-skills', skillDefinitions.bdk, formData.scores);
        displaySkillsGrid('sa-skills', skillDefinitions.sa, formData.scores);
        displaySkillsGrid('dm-skills', skillDefinitions.dm, formData.scores);

        // Aspirations
        document.getElementById('result-aspirations').textContent = formData.aspirations;
    }

    function displaySkillsGrid(containerId, skills, scores) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        skills.forEach(skill => {
            const score = scores[skill.id];
            const div = document.createElement('div');
            div.className = 'skill-item ' + getScoreClass(score);
            div.innerHTML = `
                <span class="skill-name">${skill.name}</span>
                <span class="skill-score">${score}</span>
            `;
            container.appendChild(div);
        });
    }

    function generatePrompts(formData) {
        const scores = formData.scores;

        // Prompt 1: Introduction
        const prompt1 = `My name is ${formData.name}. I work in ${formData.industry}. I took a diagnostic where I assessed my own skills regarding business analytics on a 0-10 scale. I will give you all the scores by category and skill area, and I'd like to ask you some questions about how to interpret the results.`;

        // Prompt 2: Professional Goals
        const prompt2 = `Before we get into the details, my professional aspiration for the next two years is ${formData.aspirations}. Next I will provide my scores.`;

        // Prompt 3: Scores and Target Setting
        const prompt3 = `My scores within the category of Business Domain Knowledge are: Knowing the company's KPIs: ${scores.bdk_kpis}; Competitor performance: ${scores.bdk_competitors}; Performance improvement levers: ${scores.bdk_levers}; Analytics levers: ${scores.bdk_analytics}; Legal and compliance constraints: ${scores.bdk_legal}; Data and analytics strategy: ${scores.bdk_strategy}; My scores within the category of Statistical Acumen are: Descriptive analytics: ${scores.sa_descriptive}; Predictive analytics: ${scores.sa_predictive}; Critical thinking of others' analyses: ${scores.sa_critical}; Data visualization: ${scores.sa_visualization}; Randomized controlled trials: ${scores.sa_rct}; AI and ML: ${scores.sa_aiml}; My scores within the category of Data Management are: Internal data sources: ${scores.dm_internal}; External and open data sources: ${scores.dm_external}; Setting up a data pipeline: ${scores.dm_pipeline}; Developing BI dashboards: ${scores.dm_dashboards}; Running data factory: ${scores.dm_factory}; How to move and join data: ${scores.dm_joining}. Looking at my average scores in Business Domain Knowledge, Statistical Acumen, and Data Management, what is a reasonable target for improving my capabilities within each category that is both achievable in 2 years and relevant for my professional goals?`;

        // Prompt 4: Prioritized Skills List
        const prompt4 = `Please give me a prioritized list of the top 5 to 7 specific skills that I should work on in order to move my average scores in Business Domain Knowledge, Statistical Acumen, and Data Management by the desired amounts.`;

        // Prompt 5: Action Plan
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const prompt5 = `The current date is ${dateStr}. Please give me a list of practical steps I can take for free, by calendar quarter, for the next two years in order to improve these skills. It can include using open source tools and downloading free datasets, taking online courses, doing special projects, or other. Be mindful of very heavy time commitments as I am busy. Give links to specific websites where possible.`;

        // Display prompts
        document.getElementById('prompt-1').textContent = prompt1;
        document.getElementById('prompt-2').textContent = prompt2;
        document.getElementById('prompt-3').textContent = prompt3;
        document.getElementById('prompt-4').textContent = prompt4;
        document.getElementById('prompt-5').textContent = prompt5;
    }
});
