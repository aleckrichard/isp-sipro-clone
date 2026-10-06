import express from 'express';
import mysql from 'mysql2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ES Modules: reemplazo de __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// =========================
// MySQL connection
// =========================

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }

    console.log('Connected to MySQL database');
});


// =========================
// Página principal
// =========================

app.get('/', (req, res) => {
    res.redirect('/default');
});


app.get('/default', (req, res) => {

    const idHash = req.query.IDHASH || '';

    let html = fs.readFileSync(
        path.join(__dirname, 'public', 'index.html'),
        'utf8'
    );

    const contenido = `
        <p class="lead">
            Ingresar Código Verificación
        </p>

        <form
            class="search-form"
            action="/buscar"
            method="GET">

            <input
                class="search-input"
                type="text"
                name="id_documento"
                maxlength="100"
                value="${idHash}"
                placeholder="Ingrese código de verificación"
                required>

            <br>

            <button
                class="search-button"
                type="submit">
                Buscar
            </button>

        </form>
    `;

    html = html.replace('{{CONTENIDO}}', contenido);

    res.send(html);
});


// =========================
// Buscar documento
// =========================

app.get('/buscar', (req, res) => {

    const idDocumento = req.query.id_documento;

    if (!idDocumento) {
        return res.status(400).send('Código de documento requerido');
    }

    const sql = `
        SELECT id_documento, url_archivo
        FROM documentos
        WHERE id_documento = ?
    `;

    db.query(sql, [idDocumento], (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).send('Error en la base de datos');
        }

        // ==========================================
        // Documento NO encontrado
        // ==========================================

        if (results.length === 0) {

            let html = fs.readFileSync(
                path.join(__dirname, 'public', 'index.html'),
                'utf8'
            );

            const contenido = `
                <p style="margin-top: 55px; font-weight: bold;">
                    Código Verificación -${idDocumento}- no existe o código inválido.
                </p>

                <form
                    action="/default"
                    method="GET"
                    style="margin-top: 40px;">

                    <button
                        class="search-button"
                        type="submit">
                        Nueva búsqueda
                    </button>

                </form>
            `;

            html = html.replace(
                '{{CONTENIDO}}',
                contenido
            );

            return res.status(404).send(html);
        }


        // ==========================================
        // Documento encontrado
        // ==========================================

        const documento = results[0];

        const archivo = path.join(
            __dirname,
            'public',
            documento.url_archivo
        );

        res.download(
            archivo,
            `documento-${documento.id_documento}.pdf`,
            (err) => {

                if (err) {
                    console.error(
                        'Error descargando archivo:',
                        err
                    );
                }

            }
        );

    });

});

// =========================
// Archivos estáticos
// =========================

app.use(express.static(
    path.join(__dirname, 'public')
));


// =========================
// Servidor
// =========================

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});