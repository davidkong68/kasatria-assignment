
const CLIENT_ID = "1085807389406-sdv1qgkcsfhtq0e55vs2kmqgq77tmlk5.apps.googleusercontent.com";
const SPREADSHEET_ID = "1p7yylGF1zL6f7f79PX0Y9Ny5oJWNpkW3y8B8L4juGo0";
const SHEET_NAME = "sheet1";
const SCOPES = "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly";


const loginStatus = document.getElementById("loginStatus");
let tokenClient;

function initGoogle() {
    if (!window.google) {
        loginStatus.textContent = "Google library failed to load.";
        return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: onToken,
        error_callback: (err) => {
            loginStatus.textContent = "Sign-in error: " + err.type;
        }
    });

    // login and sheet permission happen in one click
    document.getElementById("googleSignInBtn").addEventListener("click", () => {
        loginStatus.textContent = "Signing in...";
        tokenClient.requestAccessToken();
    });
}

function onToken(response) {
    if (response.error || !response.access_token) {
        loginStatus.textContent = "Google Sheets authorization failed.";
        return;
    }

    loginStatus.textContent = "Loading data...";
    loadSheet(response.access_token);
}

async function loadSheet(token) {
    const range = encodeURIComponent(SHEET_NAME + "!A:F");
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;

    try {
        const res = await fetch(url, {
            headers: { Authorization: "Bearer " + token }
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error?.message || "Failed to load data");
        }

        const rows = data.values || [];
        if (rows.length < 2) {
            loginStatus.textContent = "The sheet has no data.";
            return;
        }

        const headers = rows[0].map(h => h.trim());

        const records = rows.slice(1)
            .filter(row => row.some(cell => cell !== ""))
            .map(row => {
                const record = {};
                headers.forEach((h, i) => {
                    record[h] = row[i] ?? "";
                });
                return record;
            });

        document.getElementById("loginSection").hidden = true;
        window.dispatchEvent(new CustomEvent("sheetDataLoaded", { detail: records }));
    } catch (err) {
        loginStatus.textContent = "Error: " + err.message;
    }
}

window.addEventListener("load", initGoogle);