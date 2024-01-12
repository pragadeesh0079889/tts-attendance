const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const db = new sqlite3.Database('attendance.db');

db.run('CREATE TABLE IF NOT EXISTS attendees (barcode TEXT, numberOfMembers INTEGER)');

app.get('/', (req, res) => {
    db.all('SELECT * FROM attendees', (err, rows) => {
        if (err) {
            console.error('Error retrieving data from the database', err);
            res.send('Error retrieving data from the database');
        } else {
            res.render('index', { attendees: rows });
        }
    });
});

app.get('/attendance', (req, res) => {
    res.render('attendance');
});

app.post('/attendance', (req, res) => {
    const { barcode, numberOfMembers } = req.body;

    db.get('SELECT * FROM attendees WHERE barcode = ?', [barcode], (err, existingRow) => {
        if (err) {
            console.error('Error checking for existing record in the database', err);
            res.send('Error checking for existing record in the database');
        } else if (existingRow) {
            res.send('<script>alert("Record with this admission number already exists."); window.location="/attendance";</script>');
        } else {
            db.run('INSERT INTO attendees (barcode, numberOfMembers) VALUES (?, ?)', [barcode, numberOfMembers], (err) => {
                if (err) {
                    console.error('Error inserting data into the database', err);
                    res.redirect('/attendance');
                } else {
                    res.redirect('/attendance');
                }
            });
        }
    });
});


app.post('/delete', (req, res) => {
    const { barcode } = req.body;

    db.run('DELETE FROM attendees WHERE barcode = ?', [barcode], (err) => {
        if (err) {
            console.error('Error deleting data from the database', err);
            res.redirect('/dashboard');
        } else {
            res.redirect('/dashboard');
        }
    });
});

app.get('/download', (req, res) => {
    const filePath = path.join(__dirname, 'attendees.csv');

    db.all('SELECT barcode as admissionNumber, numberOfMembers FROM attendees', (err, rows) => {
        if (err) {
            console.error('Error retrieving data from the database', err);
            res.send('Error retrieving data from the database');
        } else {
            const csvData = rows.map(row => `${row.admissionNumber},,${row.numberOfMembers},,`).join('\n');
            
            fs.writeFileSync(filePath, `Admission Number,,Number of Members,,\n${csvData}`);

            res.setHeader('Content-Disposition', 'attachment; filename=attendees.csv');
            res.setHeader('Content-Type', 'text/csv;charset=utf-8');

            res.sendFile(filePath, () => {
                fs.unlinkSync(filePath);
            });
        }
    });
});
app.get('/dashboard', (req, res) => {
    db.all('SELECT * FROM attendees', (err, rows) => {
        if (err) {
            console.error('Error retrieving data from the database', err);
            res.send('Error retrieving data from the database');
        } else {
            db.get('SELECT COUNT(DISTINCT barcode) AS barcodeCount, SUM(numberOfMembers) AS memberCount FROM attendees', (err, result) => {
                if (err) {
                    console.error('Error retrieving counts from the database', err);
                    res.send('Error retrieving counts from the database');
                } else {
                    db.get('SELECT COUNT(DISTINCT barcode) + SUM(numberOfMembers) AS totalCount FROM attendees', (err, totalResult) => {
                        if (err) {
                            console.error('Error retrieving total count from the database', err);
                            res.send('Error retrieving total count from the database');
                        } else {
                            res.render('dashboard', {
                                attendees: rows,
                                barcodeCount: result.barcodeCount || 0,
                                memberCount: result.memberCount || 0,
                                totalCount: totalResult.totalCount || 0
                            });
                        }
                    });
                }
            });
        }
    });
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
