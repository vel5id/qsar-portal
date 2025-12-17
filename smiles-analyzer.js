// SMILES Analyzer - Advanced Features
// PubChem API, Chart.js Radar, 3Dmol.js Visualization

(function () {
    'use strict';

    // Sample molecule library - chemistry-accurate SMILES
    const SAMPLE_MOLECULES = {
        'Аспирин': { smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', mw: 180.16, formula: 'C9H8O4' },
        'Кофеин': { smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', mw: 194.19, formula: 'C8H10N4O2' },
        'Ибупрофен': { smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', mw: 206.29, formula: 'C13H18O2' },
        'Парацетамол': { smiles: 'CC(=O)NC1=CC=C(C=C1)O', mw: 151.16, formula: 'C8H9NO2' },
        'Нафталин': { smiles: 'C1=CC=C2C(=C1)C=CC=C2', mw: 128.17, formula: 'C10H8' }
    };

    // DOM Elements
    const smilesInput = document.getElementById('smilesInput');
    const checkBtn = document.getElementById('checkBtn');
    const resultsSection = document.getElementById('resultsSection');
    const moleculeDetails = document.getElementById('moleculeDetails');
    const errorBox = document.getElementById('errorBox');
    const radarChartCanvas = document.getElementById('radarChart');
    const viewer3d = document.getElementById('viewer3d');
    const viewerPlaceholder = document.getElementById('viewerPlaceholder');

    // External links
    const linkSwissADME = document.getElementById('linkSwissADME');
    const linkPubChem = document.getElementById('linkPubChem');
    const linkPASS = document.getElementById('linkPASS');

    let radarChart = null;
    let glviewer = null;

    // Initialize sample buttons
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const smiles = btn.dataset.smiles;
            const name = btn.dataset.name;
            smilesInput.value = smiles;

            // Highlight active button
            document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Main analyze button
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const smiles = smilesInput.value.trim();
            if (!smiles) {
                showError('Пожалуйста, введите SMILES строку!');
                return;
            }
            analyzeMolecule(smiles);
        });
    }

    // Enter key support
    if (smilesInput) {
        smilesInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkBtn.click();
            }
        });
    }

    // Main analysis function
    async function analyzeMolecule(smiles) {
        // Basic validation
        const invalidChars = /[^A-Za-z0-9@\.\+\-\[\]\(\)\\=#\$%\/]/;
        if (invalidChars.test(smiles)) {
            showError('Ошибка: Обнаружены недопустимые символы в SMILES.');
            return;
        }

        // Check balanced parentheses
        let balance = 0;
        for (let char of smiles) {
            if (char === '(') balance++;
            if (char === ')') balance--;
            if (balance < 0) break;
        }
        if (balance !== 0) {
            showError('Ошибка: Несбалансированные скобки в SMILES.');
            return;
        }

        // Hide error, show results
        errorBox.style.display = 'none';
        resultsSection.style.display = 'block';

        // Update external links
        linkSwissADME.href = `http://www.swissadme.ch/index.php?smiles=${encodeURIComponent(smiles)}`;
        linkPubChem.href = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(smiles)}`;
        linkPASS.href = `http://www.way2drug.com/passonline/`;

        // Check if it's a known sample
        let moleculeData = null;
        for (let name in SAMPLE_MOLECULES) {
            if (SAMPLE_MOLECULES[name].smiles === smiles) {
                moleculeData = { name, ...SAMPLE_MOLECULES[name] };
                break;
            }
        }

        // Fetch from PubChem API if not a known sample
        if (!moleculeData) {
            moleculeData = await fetchPubChemData(smiles);
        }

        // Display molecule info
        displayMoleculeInfo(moleculeData, smiles);

        // Render radar chart
        renderRadarChart(moleculeData);

        // Render 3D structure
        render3DStructure(smiles);

        // Calculate Lipinski Rule of 5
        calculateLipinski(smiles, moleculeData.mw);
    }

    // Fetch data from PubChem API
    async function fetchPubChemData(smiles) {
        try {
            moleculeDetails.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Загрузка данных из PubChem...</p>';

            // PubChem REST API - get CID from SMILES
            const searchUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`;

            const response = await fetch(searchUrl);

            if (!response.ok) {
                console.log('PubChem search failed, using estimated values');
                return estimateProperties(smiles);
            }

            const data = await response.json();
            const props = data.PropertyTable.Properties[0];

            return {
                name: props.IUPACName || 'Неизвестно',
                smiles: smiles,
                mw: props.MolecularWeight,
                formula: props.MolecularFormula,
                cid: props.CID || null,
                source: 'PubChem'
            };
        } catch (error) {
            console.error('PubChem API error:', error);
            return estimateProperties(smiles);
        }
    }

    // Estimate properties when API fails
    function estimateProperties(smiles) {
        // Simple estimation based on atom counts
        const atomCounts = {
            C: (smiles.match(/C/gi) || []).length,
            O: (smiles.match(/O/gi) || []).length,
            N: (smiles.match(/N/gi) || []).length,
            S: (smiles.match(/S/gi) || []).length
        };

        // Rough MW estimation
        const estimatedMW = atomCounts.C * 12 + atomCounts.O * 16 + atomCounts.N * 14 + atomCounts.S * 32 + smiles.length * 1.5;

        return {
            name: 'Пользовательская молекула',
            smiles: smiles,
            mw: estimatedMW.toFixed(2),
            formula: `Приблизительно: C${atomCounts.C}...`,
            source: 'Estimated'
        };
    }

    // Display molecule info card
    function displayMoleculeInfo(data, smiles) {
        const sourceTag = data.source === 'PubChem'
            ? '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em;">PubChem</span>'
            : '<span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8em;">Оценка</span>';

        moleculeDetails.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <strong>Название:</strong><br>
                    ${data.name} ${sourceTag}
                </div>
                <div>
                    <strong>Формула:</strong><br>
                    <span style="font-family: monospace;">${data.formula}</span>
                </div>
                <div>
                    <strong>Молекулярная масса:</strong><br>
                    ${data.mw} г/моль
                </div>
                <div>
                    <strong>SMILES:</strong><br>
                    <code style="font-size: 0.85em; word-break: break-all;">${smiles}</code>
                </div>
            </div>
        `;
    }

    // Render Chart.js Radar (Bioavailability)
    function renderRadarChart(data) {
        // Simulated drug-likeness properties (in real app would come from calculations)
        const mw = parseFloat(data.mw) || 200;

        // Normalize to 0-1 scale for radar
        const lipophilicity = Math.min(Math.max((mw / 500) * 0.8, 0), 1);  // Based on MW approximation
        const size = Math.min(mw / 500, 1);
        const polarity = Math.random() * 0.3 + 0.4; // Simulated
        const solubility = 1 - lipophilicity;
        const saturation = Math.random() * 0.4 + 0.5; // Simulated
        const flexibility = Math.random() * 0.3 + 0.3; // Simulated

        const chartData = {
            labels: ['Липофильность', 'Размер', 'Полярность', 'Растворимость', 'Насыщенность', 'Гибкость'],
            datasets: [{
                label: 'Свойства молекулы',
                data: [lipophilicity, size, polarity, solubility, saturation, flexibility],
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(0, 123, 255, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(0, 123, 255, 1)'
            }, {
                label: 'Оптимальный диапазон',
                data: [0.5, 0.5, 0.5, 0.6, 0.5, 0.5],
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                borderColor: 'rgba(40, 167, 69, 0.5)',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0
            }]
        };

        // Destroy previous chart if exists
        if (radarChart) {
            radarChart.destroy();
        }

        radarChart = new Chart(radarChartCanvas, {
            type: 'radar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            stepSize: 0.2,
                            display: false
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12
                        }
                    }
                }
            }
        });
    }

    // Render 3D structure using 3Dmol.js
    async function render3DStructure(smiles) {
        try {
            viewerPlaceholder.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 2em;"></i><br>Загрузка 3D модели...';

            // Fetch 3D structure from PubChem
            const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('3D structure not available');
            }

            const sdfData = await response.text();

            // Clear placeholder
            viewerPlaceholder.style.display = 'none';

            // Initialize 3Dmol viewer
            if (glviewer) {
                glviewer.clear();
            } else {
                glviewer = $3Dmol.createViewer(viewer3d, {
                    backgroundColor: '#1a1a2e'
                });
            }

            // Add molecule
            glviewer.addModel(sdfData, 'sdf');
            glviewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
            glviewer.zoomTo();
            glviewer.render();

        } catch (error) {
            console.error('3D rendering error:', error);
            viewerPlaceholder.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 2em; color: #ffc107;"></i><br>
                3D структура недоступна<br>
                <small>Попробуйте другую молекулу</small>
            `;
            viewerPlaceholder.style.display = 'block';
        }
    }

    // Show error message
    function showError(message) {
        resultsSection.style.display = 'none';
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }

    // ============================================
    // LIPINSKI RULE OF 5 CALCULATOR
    // ============================================

    function calculateLipinski(smiles, mw) {
        const lipinskiResults = document.getElementById('lipinskiResults');
        const lipinskiVerdict = document.getElementById('lipinskiVerdict');

        if (!lipinskiResults) return;

        // Estimate properties from SMILES
        const molecularWeight = parseFloat(mw) || estimateMW(smiles);
        const logP = estimateLogP(smiles);
        const hbd = countHBD(smiles);  // Hydrogen Bond Donors
        const hba = countHBA(smiles);  // Hydrogen Bond Acceptors

        // Rule of 5 thresholds
        const rules = [
            { name: 'Молекулярная масса', value: molecularWeight.toFixed(1), unit: 'г/моль', threshold: 500, operator: '≤', pass: molecularWeight <= 500 },
            { name: 'LogP (липофильность)', value: logP.toFixed(2), unit: '', threshold: 5, operator: '≤', pass: logP <= 5 },
            { name: 'HBD (доноры H-связей)', value: hbd, unit: '', threshold: 5, operator: '≤', pass: hbd <= 5 },
            { name: 'HBA (акцепторы H-связей)', value: hba, unit: '', threshold: 10, operator: '≤', pass: hba <= 10 }
        ];

        let passCount = 0;
        let html = '';

        rules.forEach(rule => {
            const statusIcon = rule.pass ? '✓' : '✗';
            const statusColor = rule.pass ? '#28a745' : '#dc3545';
            const bgColor = rule.pass ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';

            if (rule.pass) passCount++;

            html += `
                <div style="background: ${bgColor}; padding: 15px; border-radius: 8px; border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600;">${rule.name}</span>
                        <span style="color: ${statusColor}; font-size: 1.3em; font-weight: bold;">${statusIcon}</span>
                    </div>
                    <div style="margin-top: 8px; font-size: 0.95em;">
                        <span style="font-weight: 500;">${rule.value}</span> ${rule.unit}
                        <span style="color: var(--text-secondary);"> (${rule.operator} ${rule.threshold})</span>
                    </div>
                </div>
            `;
        });

        lipinskiResults.innerHTML = html;

        // Verdict
        const isDrugLike = passCount >= 3;
        lipinskiVerdict.innerHTML = isDrugLike
            ? `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Drug-like: ${passCount}/4 правил соблюдено</span>`
            : `<span style="color: #dc3545;"><i class="fas fa-times-circle"></i> Не drug-like: ${passCount}/4 правил соблюдено</span>`;
        lipinskiVerdict.style.background = isDrugLike ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)';
    }

    // Helper functions for Lipinski
    function estimateMW(smiles) {
        const atoms = { C: 12, N: 14, O: 16, S: 32, Cl: 35.5, Br: 80, F: 19, I: 127, P: 31 };
        let mw = 0;
        mw += (smiles.match(/C/gi) || []).length * 12;
        mw += (smiles.match(/N/gi) || []).length * 14;
        mw += (smiles.match(/O/gi) || []).length * 16;
        mw += (smiles.match(/S/gi) || []).length * 32;
        mw += (smiles.match(/Cl/gi) || []).length * 35.5;
        mw += (smiles.match(/Br/gi) || []).length * 80;
        mw += (smiles.match(/F/gi) || []).length * 19;
        // Add hydrogens estimate
        mw += smiles.length * 1.5;
        return mw;
    }

    function estimateLogP(smiles) {
        // Wildman-Crippen LogP estimation (simplified)
        let logP = 0;
        logP += (smiles.match(/C/gi) || []).length * 0.25;  // Carbon is hydrophobic
        logP -= (smiles.match(/O/gi) || []).length * 0.5;   // Oxygen is hydrophilic
        logP -= (smiles.match(/N/gi) || []).length * 0.5;   // Nitrogen is hydrophilic
        logP += (smiles.match(/Cl/gi) || []).length * 0.6;  // Halogen is hydrophobic
        logP += (smiles.match(/Br/gi) || []).length * 0.8;
        logP += (smiles.match(/F/gi) || []).length * 0.3;
        logP -= (smiles.match(/\[O-\]/gi) || []).length * 1.0; // Charged oxygen
        return Math.max(-3, Math.min(7, logP)); // Clamp to realistic range
    }

    function countHBD(smiles) {
        // HBD: OH, NH, NH2
        let count = 0;
        count += (smiles.match(/O(?=[^=]|$)/gi) || []).length; // O not in C=O
        count += (smiles.match(/N(?!#)/gi) || []).length;       // N not in triple bond
        return Math.max(0, count - (smiles.match(/\(/g) || []).length / 2); // Adjust for ring closures
    }

    function countHBA(smiles) {
        // HBA: O, N
        let count = 0;
        count += (smiles.match(/O/gi) || []).length;
        count += (smiles.match(/N/gi) || []).length;
        return count;
    }

    // Expose to global for integration
    window.calculateLipinski = calculateLipinski;

})();
