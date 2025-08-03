const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());

const LOGIN_URL = "https://kmce-api.teleuniv.in/auth/login";
const ATTENDANCE_URL = "https://kmce-api.teleuniv.in/sanjaya/getAttendance";
const SUBJECT_URL = "https://kmce-api.teleuniv.in/sanjaya/getSubjectAttendance";
const TIMETABLE_URL = "https://kmce-api.teleuniv.in/sanjaya/getTimeTablebyStudent";

// 🧠 Authenticate user and extract JWT + studentId
async function authenticate(username, password) {
  const finalPassword = password && password.trim() !== "" ? password : "Kmce123$";
  const loginRes = await axios.post(LOGIN_URL, {
    username,
    password: finalPassword,
    application: "netra"
  });

  const token = loginRes.data?.access_token;
  if (!token) throw new Error("No token found");

  const decoded = jwt.decode(token);
  const studentId = decoded?.sub;
  if (!studentId) throw new Error("Student ID not found");

  return { token, studentId };
}

// ✅ GET /profile?username=xxx&password=yyy
// Returns { student: {...}, token: "..." }
app.get("/profile", async (req, res) => {
  const { username, password } = req.query;
  if (!username) return res.status(400).json({ error: "Username required" });

  try {
    const { token, studentId } = await authenticate(username, password);
    const profileRes = await axios.get(
      `https://kmce-api.teleuniv.in/studentmaster/studentprofile/${studentId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const student = profileRes.data?.payload?.student;
    res.json({ student, token }); // ⬅️ include token in response
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ All other routes accept token via Authorization header
app.get("/overall", async (req, res) => {
  const { token } = req.headers;
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const attendanceRes = await axios.get(ATTENDANCE_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(attendanceRes.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/subjects", async (req, res) => {
  const { token } = req.headers;
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const subjectRes = await axios.get(SUBJECT_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(subjectRes.data?.payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/timetable", async (req, res) => {
  const { token } = req.headers;
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const timetableRes = await axios.get(TIMETABLE_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(timetableRes.data?.payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
