// Initialize CodeMirror editors
const inputEditor = CodeMirror.fromTextArea(document.getElementById('input-editor'), {
    mode: 'text/x-csrc',
    theme: 'monokai',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    lineWrapping: true,
    foldGutter: true,
    gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
    extraKeys: {
        'Tab': 'indentMore',
        'Shift-Tab': 'indentLess'
    }
});

const outputEditor = CodeMirror.fromTextArea(document.getElementById('output-editor'), {
    mode: 'text/x-csrc',
    theme: 'monokai',
    lineNumbers: true,
    readOnly: true,
    lineWrapping: true
});

// Sample code
const sampleCode = `#include <stdio.h>

void unusedFunction() {
    int x = 10;
    printf("This function is never called\\n");
}

void usedFunction() {
    printf("This function is called from main\\n");
}

int main() {
    int a = 5;        // Used variable
    int b = 10;       // Unused variable
    int c = a + 15;   // Used in printf
    
    usedFunction();
    printf("Value of c is: %d\\n", c);
    return 0;
}`;

// Set initial sample code
inputEditor.setValue(sampleCode);

// Function to calculate optimization statistics
function calculateOptimizationStats(originalCode, optimizedCode) {
    const originalLines = originalCode.split('\n').length;
    const optimizedLines = optimizedCode.split('\n').length;
    const reduction = ((originalLines - optimizedLines) / originalLines * 100).toFixed(1);
    return `${reduction}% reduction`;
}

// Handle analyze button click
document.getElementById('analyze-btn').addEventListener('click', async () => {
    const button = document.getElementById('analyze-btn');
    const code = inputEditor.getValue();
    
    try {
        // Disable button and show loading state
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        button.classList.add('loading');
        
        const response = await analyzeCode(code);
        outputEditor.setValue(response);

        // Update optimization stats
        const stats = calculateOptimizationStats(code, response);
        document.getElementById('optimization-stats').textContent = `Optimization: ${stats}`;
    } catch (error) {
        console.error('Error analyzing code:', error);
        outputEditor.setValue(`/* Error analyzing code:\n${error.message} */`);
        document.getElementById('optimization-stats').textContent = 'Optimization: Failed';
    } finally {
        // Reset button state
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-magic"></i> Analyze Code';
        button.classList.remove('loading');
    }
});

// Handle load sample button click
document.getElementById('load-sample').addEventListener('click', () => {
    inputEditor.setValue(sampleCode);
    outputEditor.setValue('');
    document.getElementById('optimization-stats').textContent = 'Optimization: --';
});

// Handle clear input button click
document.getElementById('clear-input').addEventListener('click', () => {
    inputEditor.setValue('');
    outputEditor.setValue('');
    document.getElementById('optimization-stats').textContent = 'Optimization: --';
});

// Handle copy output button click
document.getElementById('copy-output').addEventListener('click', async () => {
    const code = outputEditor.getValue();
    try {
        await navigator.clipboard.writeText(code);
        const button = document.getElementById('copy-output');
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i> Copy Code';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy code:', err);
        alert('Failed to copy code to clipboard');
    }
});

// Handle download output button click
document.getElementById('download-output').addEventListener('click', () => {
    const code = outputEditor.getValue();
    if (!code.trim()) {
        alert('No optimized code to download');
        return;
    }

    const blob = new Blob([code], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'optimized_code.c';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
});

// Function to send code to backend for analysis
async function analyzeCode(code) {
    try {
        const response = await fetch('http://localhost:3000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.details || data.error || 'Failed to analyze code');
        }

        if (!data.optimizedCode) {
            throw new Error('No optimized code received from server');
        }

        return data.optimizedCode;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
} 