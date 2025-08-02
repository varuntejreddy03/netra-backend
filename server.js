// 📁 server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // ✅ Use standard JWT decoder

const app = express();
app.use(cors());

const LOGIN_URL = "https://kmce-api.teleuniv.in/auth/login";
const ATTENDANCE_URL = "https://kmce-api.teleuniv.in/sanjaya/getAttendance";
const SUBJECT_URL = "https://kmce-api.teleuniv.in/sanjaya/getSubjectAttendance";

app.get("/attendance", async (req, res) => {
  const { username, password } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Phone number (username) is required" });
  }

  const finalPassword = password && password.trim() !== "" ? password : "Kmce123$";

  try {
    // 🔐 Step 1: Login
    const loginRes = await axios.post(LOGIN_URL, {
      username,
      password: finalPassword,
      application: "netra"
    });

    const token = loginRes.data?.access_token;
    if (!token) throw new Error("No token found in login response");

    // ✅ Step 2: Decode token to extract student ID
    const decoded = jwt.decode(token);
    const studentId = decoded?.sub;
    if (!studentId) throw new Error("Student ID (sub) not found in token");

    console.log("✅ Access Token decoded. Student ID:", studentId);

    // 📦 Step 3: Fetch data from all APIs
    const [profileRes, attendanceRes, subjectRes] = await Promise.all([
      axios.get(`https://kmce-api.teleuniv.in/studentmaster/studentprofile/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(ATTENDANCE_URL, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(SUBJECT_URL, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const profileData = profileRes.data?.payload?.student;
    const attendanceData = attendanceRes.data;
    const subjectData = subjectRes.data?.payload;

    if (!profileData) {
      throw new Error("Profile data missing or malformed");
    }

    // ✅ Step 4: Send JSON to frontend
    res.json({
      profile: profileData,
      overall: attendanceData,
      subjects: subjectData
    });

  } catch (err) {
    console.error("❌ Backend error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("🚀 Server running at http://localhost:3001");
});
