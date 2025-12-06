const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Function to get environment with MinGW paths
function getEnvWithMinGW() {
    const env = { ...process.env };
    const mingwPaths = [
        'C:\\msys64\\mingw64\\bin',
        'C:\\msys64\\usr\\bin',
        'C:\\MinGW\\bin',
        process.env.PATH
    ].filter(Boolean);

    env.PATH = mingwPaths.join(';');
    return env;
}

// Route to handle code analysis
app.post('/analyze', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ error: 'No code provided' });
        }

        console.log('Analyzing code...');
        
        // Path to dead.exe (assuming it's in the root directory)
        const deadExePath = path.join(__dirname, '../dead.exe');
        
        // Check if dead.exe exists
        try {
            await fs.access(deadExePath);
            console.log('dead.exe found at:', deadExePath);
        } catch (error) {
            console.error('dead.exe not found at:', deadExePath);
            return res.status(500).json({ 
                error: 'Configuration error', 
                details: 'dead.exe not found' 
            });
        }

        // Get environment with MinGW paths
        const env = getEnvWithMinGW();
        console.log('Using PATH:', env.PATH);

        // Execute dead.exe in its directory with MinGW environment
        const deadProcess = spawn(deadExePath, [], {
            cwd: path.dirname(deadExePath),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
            env: env
        });

        let output = '';
        let errorOutput = '';

        // Handle stdout data
        deadProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Received output:', data.toString());
        });

        // Handle stderr data
        deadProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error('Error output:', data.toString());
        });

        // Write the input code to stdin
        deadProcess.stdin.write(code);
        deadProcess.stdin.end();

        // Handle process completion
        deadProcess.on('close', (code) => {
            console.log('Process exited with code:', code);
            
            if (code !== 0 && !output) {
                console.error('Analysis failed with code:', code);
                console.error('Error output:', errorOutput);
                return res.status(500).json({ 
                    error: 'Analysis failed', 
                    details: errorOutput || `Process exited with code ${code}`
                });
            }

            if (!output.trim()) {
                return res.status(500).json({ 
                    error: 'No output',
                    details: 'The analyzer did not generate any output'
                });
            }

            console.log('Analysis successful');
            res.json({ 
                optimizedCode: output,
                message: 'Code analysis completed successfully'
            });
        });

        // Handle process error
        deadProcess.on('error', (error) => {
            console.error('Process error:', error);
            res.status(500).json({ 
                error: 'Process error', 
                details: error.message 
            });
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Server error', 
            details: error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log('Environment PATH:', process.env.PATH);
}); 