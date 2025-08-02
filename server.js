// 📁 server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

// 🔗 External APIs
const LOGIN_URL = "https://kmce-api.teleuniv.in/auth/login";
const ATTENDANCE_URL = "https://kmce-api.teleuniv.in/sanjaya/getAttendance";
const SUBJECT_URL = "https://kmce-api.teleuniv.in/sanjaya/getSubjectAttendance";

app.get("/attendance", async (req, res) => {
  const { username, password } = req.query;

  if (!username) {
    return res.status(400).json({ error: "📞 Phone number (username) is required" });
  }

  const finalPassword = password && password.trim() !== "" ? password : "Kmce123$";

  try {
    // 🔐 Login
    const loginRes = await axios.post(LOGIN_URL, {
      username,
      password: finalPassword,
      application: "netra"
    });

    const token = loginRes.data?.access_token;
    if (!token) throw new Error("No token found in login response");

    // 🧠 Decode Token
    const decoded = jwt.decode(token);
    const studentId = decoded?.sub;
    if (!studentId) throw new Error("Student ID not found in token");

    console.log("✅ Student ID from token:", studentId);

    // 📡 Fetch All Data in Parallel
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

    if (!profileData) throw new Error("Student profile not found");

    // 🚀 Return Combined Response
    res.json({
      profile: profileData,
      overall: attendanceData,
      subjects: subjectData
    });

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

