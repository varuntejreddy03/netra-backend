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

app.get("/attendance", async (req, res) => {
  const { username, password } = req.query;

  if (!username) return res.status(400).json({ error: "Username required" });

  const finalPassword = password && password.trim() !== "" ? password : "Kmce123$";

  try {
    // Step 1: Login
    const loginRes = await axios.post(LOGIN_URL, {
      username,
      password: finalPassword,
      application: "netra",
    });

    const token = loginRes.data?.access_token;
    if (!token) throw new Error("No token found");

    const decoded = jwt.decode(token);
    const studentId = decoded?.sub;
    if (!studentId) throw new Error("Student ID not found");

    // Step 2: Parallel API calls
    const [profileRes, attendanceRes, subjectRes, timetableRes] = await Promise.all([
      axios.get(`https://kmce-api.teleuniv.in/studentmaster/studentprofile/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(ATTENDANCE_URL, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(SUBJECT_URL, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(TIMETABLE_URL, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    // Step 3: Return everything
    res.json({
      profile: profileRes.data?.payload?.student,
      overall: attendanceRes.data,
      subjects: subjectRes.data?.payload,
      timetable: timetableRes.data?.payload,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for serverless (e.g., Vercel)
module.exports = app;
