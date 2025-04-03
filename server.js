// express app setup
const express = require('express')
const path = require('path')

// app initiated
const app = express()
const PORT = 3000;

// routes navigation
const scormRoutes = require('./routes/scormRoutes')

// app using the modules for the funcitional purpose
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(scormRoutes);

// port for app to run
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})