const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
app.use(cors());

const LOGIN_URL = "https://kmce-api.teleuniv.in/auth/login";
const ATTENDANCE_URL = "https://kmce-api.teleuniv.in/sanjaya/getAttendance";
const SUBJECT_URL = "https://kmce-api.teleuniv.in/sanjaya/getSubjectAttendance";

app.get("/attendance", async (req, res) => {
  const { username, password } = req.query;

  if (!username) return res.status(400).json({ error: "Username required" });

  const finalPassword = password && password.trim() !== "" ? password : "Kmce123$";

  try {
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

    const [profileRes, attendanceRes, subjectRes] = await Promise.all([
      axios.get(`https://kmce-api.teleuniv.in/studentmaster/studentprofile/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get(ATTENDANCE_URL, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(SUBJECT_URL, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    res.json({
      profile: profileRes.data?.payload?.student,
      overall: attendanceRes.data,
      subjects: subjectRes.data?.payload,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the app for Vercel
module.exports = app;
