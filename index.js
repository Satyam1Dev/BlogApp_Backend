const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./model/User");
const Post = require("./model/post");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const salt = bcrypt.genSaltSync(10);
const secret = "asdfe45we45w345wegw345werjktjwertkj";
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });

const fs = require("fs");
const port = process.env.PORT || 8080; // you can use any port number here; I chose to use 8080

const app = express();
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(
  "mongodb+srv://SATYA_PRAKASH:SATYA_PRAKASH@cluster0.pceyq7j.mongodb.net/Blog(MERN)"
);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // Logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("Wrong credentials");
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  console.log('Received token:', token);
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      console.error('JWT verification error:', err);
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.log('Decoded user info:', info);
      res.json(info);
    }
  });
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  try {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);

    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) {
        console.error('JWT verification error:', err);
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { title, summery, content } = req.body;
      const postDoc = await Post.create({
        title,
        summery,
        content,
        cover: newPath,
        author: info.id,
      });
      res.json(postDoc);
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json({ postDoc });
});

app.listen(8080, () => {
  console.log("Server started on port 8080");
});
