document.addEventListener('DOMContentLoaded', () => {
    addTask();
    addResource();
    setupThemeToggle();
});

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }

    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });
}

document.getElementById('allocationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('status');
    status.textContent = 'Processing...';
    status.className = 'status';

    try {
        const data = collectFormData();
        const response = await fetch('/allocate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Server error: ${response.status}`);
        if (result.error) throw new Error(result.error);

        displayReport(result.report);
        status.textContent = 'Report generated successfully!';
        status.className = 'status success';
    } catch (error) {
        console.error('Error:', error);
        status.textContent = `Error: ${error.message}`;
        status.className = 'status error';
    }
});

document.getElementById('addTask').addEventListener('click', addTask);
document.getElementById('addResource').addEventListener('click', addResource);
document.getElementById('clearBtn').addEventListener('click', clearForm);
document.getElementById('sendChat').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

function addTask() {
    const container = document.getElementById('tasksContainer');
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';
    taskDiv.innerHTML = `
        <input type="text" class="task-name" placeholder="Task Name" required>
        <input type="number" class="task-labor" placeholder="Labor (h)" min="0" step="0.1" required>
        <input type="number" class="task-priority" placeholder="Priority" min="1" max="10" required>
        <div class="materials"></div>
        <button type="button" class="add-material">Add Material</button>
    `;
    container.appendChild(taskDiv);
    taskDiv.querySelector('.add-material').addEventListener('click', () => addMaterial(taskDiv));
    addMaterial(taskDiv);
}

function addMaterial(taskDiv) {
    const materialsDiv = taskDiv.querySelector('.materials');
    const materialDiv = document.createElement('div');
    materialDiv.className = 'material';
    materialDiv.innerHTML = `
        <input type="text" class="material-name" placeholder="Material" required>
        <input type="number" class="material-quantity" placeholder="Quantity" min="0" step="0.1" required>
        <input type="number" class="material-cost" placeholder="Cost" min="0" step="0.01" required>
    `;
    materialsDiv.appendChild(materialDiv);
}

function addResource() {
    const container = document.getElementById('resourcesContainer');
    const resourceDiv = document.createElement('div');
    resourceDiv.className = 'resource';
    resourceDiv.innerHTML = `
        <input type="text" class="resource-name" placeholder="Resource" required>
        <input type="number" class="resource-quantity" placeholder="Quantity" min="0" step="0.1" required>
        <input type="number" class="resource-cost" placeholder="Cost" min="0" step="0.01" required>
    `;
    container.appendChild(resourceDiv);
}

function collectFormData() {
    const tasks = [];
    document.querySelectorAll('.task').forEach(taskDiv => {
        const materials = [];
        taskDiv.querySelectorAll('.material').forEach(materialDiv => {
            const name = materialDiv.querySelector('.material-name').value.trim();
            const quantity = parseFloat(materialDiv.querySelector('.material-quantity').value) || 0;
            const cost = parseFloat(materialDiv.querySelector('.material-cost').value) || 0;
            if (name && quantity >= 0 && cost >= 0) {
                materials.push({ name, quantity, unit_cost: cost });
            }
        });
        const name = taskDiv.querySelector('.task-name').value.trim();
        const labor = parseFloat(taskDiv.querySelector('.task-labor').value) || 0;
        const priority = parseInt(taskDiv.querySelector('.task-priority').value) || 0;
        if (name && labor >= 0 && priority >= 1 && priority <= 10 && materials.length > 0) {
            tasks.push({ name, required_materials: materials, required_labor: labor, priority });
        }
    });

    const available_resources = [];
    document.querySelectorAll('.resource').forEach(resourceDiv => {
        const name = resourceDiv.querySelector('.resource-name').value.trim();
        const quantity = parseFloat(resourceDiv.querySelector('.resource-quantity').value) || 0;
        const cost = parseFloat(resourceDiv.querySelector('.resource-cost').value) || 0;
        if (name && quantity >= 0 && cost >= 0) {
            available_resources.push({ name, quantity, unit_cost: cost });
        }
    });

    if (tasks.length === 0 || available_resources.length === 0) {
        throw new Error('At least one valid task with materials and one resource are required.');
    }
    return { tasks, available_resources };
}

function displayReport(report) {
    const reportDiv = document.getElementById('report');
    // Ensure resource_usage is an array, convert object to array if needed
    const resourceUsage = Array.isArray(report.resource_usage)
        ? report.resource_usage
        : (typeof report.resource_usage === 'object' && report.resource_usage !== null
            ? Object.entries(report.resource_usage).map(([resource, data]) => ({
                resource,
                initial: data.initial || 0,
                used: data.used || 0,
                remaining: data.remaining || 0
            }))
            : []);

    reportDiv.innerHTML = `
        <div class="report-header">
            <h3>Allocation Report</h3>
            <button id="downloadPdf" class="download-btn">Download as PDF</button>
        </div>
        <div id="reportContent">
            <h4>Summary</h4>
            <p>Total Tasks: ${report.summary.total_tasks}</p>
            <p>Allocated Tasks: ${report.summary.allocated_tasks}</p>
            <p>Total Cost: $${report.summary.total_cost.toFixed(2)}</p>
            <h4>Allocations</h4>
            <table>
                <tr><th>Task</th><th>Labor (h)</th><th>Resources</th><th>Feasible</th><th>Reason</th></tr>
                ${report.allocations.map(a => `
                    <tr>
                        <td>${a.task}</td>
                        <td>${a.labor}</td>
                        <td>${Object.entries(a.resources).map(([k, v]) => `${k}: ${v}`).join(', ')}</td>
                        <td>${a.feasible ? 'Yes' : 'No'}</td>
                        <td>${a.reason || '—'}</td>
                    </tr>
                `).join('')}
            </table>
            <h4>Resource Usage</h4>
            ${resourceUsage.length > 0 ? `
                <table>
                    <tr><th>Resource</th><th>Initial</th><th>Used</th><th>Remaining</th></tr>
                    ${resourceUsage.map(r => `
                        <tr>
                            <td>${r.resource}</td>
                            <td>${r.initial}</td>
                            <td>${r.used}</td>
                            <td>${r.remaining}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : '<p>No resource usage data available.</p>'}
        </div>
    `;

    document.getElementById('downloadPdf').addEventListener('click', () => {
        const doc = new jsPDF();
        doc.html(document.getElementById('reportContent'), {
            callback: function (doc) {
                doc.save('allocation_report.pdf');
            },
            x: 10,
            y: 10,
            width: 190,
            windowWidth: 650
        });
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const history = document.getElementById('chatHistory');
    history.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
    input.value = '';
    history.scrollTop = history.scrollHeight;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Chat error: ${response.status}`);
        }

        const result = await response.json();

        // Format the response to handle lists and improve readability
        const formattedResponse = formatBotResponse(result.response);

        history.innerHTML += `<div class="bot-message"><strong>Bot:</strong> ${formattedResponse}</div>`;
        history.scrollTop = history.scrollHeight;
    } catch (error) {
        history.innerHTML += `<p class="error-message">Error: ${error.message}</p>`;
        history.scrollTop = history.scrollHeight;
    }
}

// Function to format bot responses
function formatBotResponse(text) {
    // Check if response has list items (starting with numbers, dashes, asterisks)
    const hasListItems = /(^|\n)[\d*\-•]+[\.\)]*\s+\w+/m.test(text);

    if (hasListItems) {
        // Process text to format list items
        return text
            // Convert numbered lists (1. Item, 2. Item)
            .replace(/(^|\n)(\d+[\.\)]+)\s+([^\n]+)/gm, '$1<div class="list-item"><span class="list-number">$2</span> $3</div>')
            // Convert bullet lists (- Item, * Item, • Item)
            .replace(/(^|\n)[\-\*•]\s+([^\n]+)/gm, '$1<div class="list-item"><span class="list-bullet">•</span> $2</div>')
            // Add spacing between paragraphs
            .replace(/\n\n/g, '<div class="paragraph-break"></div>')
            // Convert single newlines to <br>
            .replace(/\n/g, '<br>');
    } else {
        // Just add paragraph spacing for regular text
        return text
            .replace(/\n\n/g, '<div class="paragraph-break"></div>')
            .replace(/\n/g, '<br>');
    }
}

function clearForm() {
    document.getElementById('tasksContainer').innerHTML = '';
    document.getElementById('resourcesContainer').innerHTML = '';
    document.getElementById('status').textContent = '';
    document.getElementById('report').innerHTML = '';
    addTask();
    addResource();
}