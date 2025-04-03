// required functions
const express = require('express');
const multer = require('multer');
const path = require('path');
const unzipper = require('unzipper');
const fs = require('fs');

const router = express.Router();
const logFilePath = path.join(__dirname, 'scormLogs.json');

// Ensure SCORM log file exists with default structure
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, JSON.stringify({}, null, 2), 'utf8');
}

// Read SCORM logs safely
let scormLogs = {};
try {
    const data = fs.readFileSync(logFilePath, 'utf8');
    scormLogs = data ? JSON.parse(data) : {};
} catch (err) {
    console.error("Error reading SCORM logs, resetting:", err);
    scormLogs = {};
    fs.writeFileSync(logFilePath, JSON.stringify(scormLogs, null, 2), 'utf8');
}

const readLogs = () => {
    try {
        const data = fs.readFileSync(logsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {}; // Return empty if file doesn't exist
    }
};

// Function to write SCORM data
const writeLogs = (logs) => {
    fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));
};

// Storage configuration for file uploads
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 400 * 1024 * 1024 } // 200MB limit
}).single('scormPackage');

// Upload and extract SCORM package
router.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).send('File upload failed');
        }

        const uploadedFilePath = path.join(__dirname, '../uploads', req.file.filename);
        const extractDir = path.join(__dirname, '../uploads', Date.now().toString());

        fs.createReadStream(uploadedFilePath)
            .pipe(unzipper.Extract({ path: extractDir }))
            .on('close', () => {
                const launchFileUrl = `/uploads/${path.basename(extractDir)}/scormcontent/index.html`;

                const userId = "SST123"; 
                scormLogs[userId] = { message: "SCORM Data Initialized", launchFileUrl };

                console.log(`SCORM Uploaded. Accessible at: ${launchFileUrl}`);

                res.redirect(`/public/scorm-launcher.html?launchUrl=${encodeURIComponent(launchFileUrl)}&userId=${userId}`);
            });
    });
});

// Fetch SCORM log for a specific user
router.get('/:userId/get-log', (req, res) => {
    const userId = req.params.userId;
    console.log(`Fetching SCORM log for user: ${userId}`);

    if (!scormLogs[userId]) {
        return res.status(404).json({ error: "SCORM data not found" });
    }

    res.json({ message: "SCORM Data Fetched", data: scormLogs[userId] });
});

// Set or update SCORM log for a specific user
router.post('/:userId/set-log', (req, res) => {
    const userId = req.params.userId;
    const logData = req.body;

    console.log(`Received SCORM log for user: ${userId}`, logData);

    if (!scormLogs[userId]) {
        scormLogs[userId] = {};
    }

    scormLogs[userId].log = logData;

    // Write updated logs to file
    fs.writeFile(logFilePath, JSON.stringify(scormLogs, null, 2), 'utf8', (err) => {
        if (err) {
            console.error("Error writing SCORM logs:", err);
            return res.status(500).json({ error: "Failed to save SCORM log" });
        }
        res.json({ message: "SCORM Log Saved", data: logData });
    });
});

// Commit SCORM Data
router.post('/commitData', (req, res) => {
    const { studentId, lessonLocation, lessonStatus, score, timeSpent } = req.body;

    if (!studentId) {
        return res.status(400).json({ message: 'studentId is required' });
    }

    const logs = readLogs();

    // Update the student’s progress
    logs[studentId] = {
        lessonLocation: lessonLocation || logs[studentId]?.lessonLocation || '',
        lessonStatus: lessonStatus || logs[studentId]?.lessonStatus || 'not attempted',
        score: score || logs[studentId]?.score || '',
        timeSpent: timeSpent || logs[studentId]?.timeSpent || '0',
    };

    writeLogs(logs);

    res.json({ message: 'SCORM data committed successfully', data: logs[studentId] });
});

// Set Score
router.post('/set-score', (req, res) => {
    const { userId, score } = req.body;
    console.log(`Setting score for User ${userId}: ${score}`);

    if (!scormLogs[userId]) {
        scormLogs[userId] = {};
    }
    scormLogs[userId].score = score;

    fs.writeFileSync(logFilePath, JSON.stringify(scormLogs, null, 2), 'utf8');

    res.json({ message: `Score ${score} recorded` });
});

// Set Passed
router.post('/set-passed', (req, res) => {
    const { userId } = req.body;
    console.log(`User ${userId} passed the course!`);

    if (!scormLogs[userId]) {
        scormLogs[userId] = {};
    }
    scormLogs[userId].status = "passed";

    fs.writeFileSync(logFilePath, JSON.stringify(scormLogs, null, 2), 'utf8');

    res.json({ message: "Course Passed" });
});

// Set Failed
router.post('/set-failed', (req, res) => {
    const { userId } = req.body;
    console.log(`User ${userId} failed the course.`);

    if (!scormLogs[userId]) {
        scormLogs[userId] = {};
    }
    scormLogs[userId].status = "failed";

    fs.writeFileSync(logFilePath, JSON.stringify(scormLogs, null, 2), 'utf8');

    res.json({ message: "Course Failed" });
});

// Set Bookmark
router.post('/set-bookmark', (req, res) => {
    const { userId, bookmark } = req.body;
    console.log(`User ${userId} set bookmark: ${bookmark}`);

    if (!scormLogs[userId]) {
        scormLogs[userId] = {};
    }
    scormLogs[userId].bookmark = bookmark;

    fs.writeFileSync(logFilePath, JSON.stringify(scormLogs, null, 2), 'utf8');

    res.json({ message: "Bookmark Saved" });
});

// Get Bookmark
router.get('/:userId/get-bookmark', (req, res) => {
    const userId = req.params.userId;
    console.log(`Fetching bookmark for user: ${userId}`);

    if (!scormLogs[userId] || !scormLogs[userId].bookmark) {
        return res.status(404).json({ error: "No bookmark found" });
    }

    res.json({ bookmark: scormLogs[userId].bookmark });
});

module.exports = router;
