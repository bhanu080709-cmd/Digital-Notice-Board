require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { supabase } = require("./supabase");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS configuration."));
  }
}));
app.use(express.json({ limit: "100kb" }));

const CATEGORIES = ["Events", "Academic", "Examination", "Clubs", "General"];
const FIELDS = ["title", "category", "author", "description", "event_date", "contact"];

function validateNotice(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Request body must be a JSON object.";
  for (const field of FIELDS) {
    if (partial && !(field in body)) continue;
    const value = body[field];
    if (["event_date", "contact"].includes(field) && (value === null || value === "")) continue;
    if (field === "event_date" && value !== undefined) {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return "event_date must be a valid date in YYYY-MM-DD format or null.";
      continue;
    }
    if (typeof value !== "string") return `${field} must be a string${["event_date", "contact"].includes(field) ? " or null" : ""}.`;
    if (!value.trim() && !["contact"].includes(field)) return `${field} is required.`;
    const max = { title: 120, category: 30, author: 80, description: 2000, contact: 120 }[field];
    if (max && value.length > max) return `${field} must be ${max} characters or fewer.`;
  }
  if ((!partial || "category" in body) && !CATEGORIES.includes(body.category)) return `category must be one of: ${CATEGORIES.join(", ")}.`;
  return null;
}
function cleanNotice(body) {
  const result = {};
  for (const field of FIELDS) {
    if (!(field in body)) continue;
    const value = body[field];
    result[field] = typeof value === "string" ? (field === "contact" ? value.trim() || null : value.trim()) : value;
  }
  if (result.event_date === "") result.event_date = null;
  if (result.contact === "") result.contact = null;
  return result;
}
function ensureDatabase(req, res, next) {
  if (!supabase) return res.status(503).json({ error: "Database is not configured. Copy backend/.env.example to backend/.env and add your Supabase credentials." });
  next();
}
function dbError(res, error) {
  console.error("Supabase request failed:", error.message);
  if (error.code === "PGRST116") return res.status(404).json({ error: "Notice not found." });
  return res.status(500).json({ error: "Database operation failed. Check the schema and backend logs." });
}

app.get("/api/health", (req, res) => res.json({
  status: "ok",
  databaseConfigured: Boolean(supabase),
  timestamp: new Date().toISOString()
}));

app.get("/api/notices", ensureDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
    if (error) return dbError(res, error);
    res.json({ data });
  } catch (error) { dbError(res, error); }
});

app.get("/api/notices/:id", ensureDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase.from("notices").select("*").eq("id", req.params.id).maybeSingle();
    if (error) return dbError(res, error);
    if (!data) return res.status(404).json({ error: "Notice not found." });
    res.json({ data });
  } catch (error) { dbError(res, error); }
});

app.post("/api/notices", ensureDatabase, async (req, res) => {
  const validationError = validateNotice(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { data, error } = await supabase.from("notices").insert(cleanNotice(req.body)).select("*").single();
    if (error) return dbError(res, error);
    res.status(201).json({ data });
  } catch (error) { dbError(res, error); }
});

app.put("/api/notices/:id", ensureDatabase, async (req, res) => {
  const validationError = validateNotice(req.body);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { data, error } = await supabase.from("notices").update(cleanNotice(req.body)).eq("id", req.params.id).select("*").maybeSingle();
    if (error) return dbError(res, error);
    if (!data) return res.status(404).json({ error: "Notice not found." });
    res.json({ data });
  } catch (error) { dbError(res, error); }
});

app.delete("/api/notices/:id", ensureDatabase, async (req, res) => {
  try {
    const { data, error } = await supabase.from("notices").delete().eq("id", req.params.id).select("id").maybeSingle();
    if (error) return dbError(res, error);
    if (!data) return res.status(404).json({ error: "Notice not found." });
    res.json({ message: "Notice deleted successfully.", id: data.id });
  } catch (error) { dbError(res, error); }
});

app.use((req, res) => res.status(404).json({ error: "API route not found." }));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "Invalid JSON request body." });
  if (error.message && error.message.includes("CORS")) return res.status(403).json({ error: error.message });
  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => console.log(`CampusBoard API running at http://localhost:${PORT}`));
