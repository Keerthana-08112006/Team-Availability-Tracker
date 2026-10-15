const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database(
  process.env.DB_PATH || path.join(__dirname, "team.db")
);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available'
        CHECK(status IN ('Available', 'Busy', 'Away')),
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.get("SELECT COUNT(*) AS count FROM team_members", (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return;
    }

    if (row.count === 0) {
      const insert = db.prepare(
        "INSERT INTO team_members (name, role, status) VALUES (?, ?, ?)"
      );

      [
        ["Keerthi", "Project Lead", "Available"],
        ["Arun", "Frontend Developer", "Busy"],
        ["Priya", "Backend Developer", "Available"],
        ["Rahul", "UI/UX Designer", "Away"],
        ["Sneha", "Tester", "Available"]
      ].forEach((member) => insert.run(member));

      insert.finalize();
    }
  });
});

app.get("/api/team", (req, res) => {
  db.all(
    "SELECT * FROM team_members ORDER BY id",
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Unable to load team" });
      res.json(rows);
    }
  );
});

app.patch("/api/team/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowedStatuses = ["Available", "Busy", "Away"];

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid team member ID" });
  }

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid availability status" });
  }

  db.run(
    `UPDATE team_members
     SET status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Unable to update status" });
      if (this.changes === 0) {
        return res.status(404).json({ error: "Team member not found" });
      }

      res.json({ message: "Status updated successfully", id, status });
    }
  );
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Team Availability Tracker running at http://localhost:${PORT}`);
});