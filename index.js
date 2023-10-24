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
const port = process.env.PORT || 8080; // you can use any port number here; i chose to use 3001

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

//login route

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    //logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});


app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      // At this point, `info` contains the user data decoded from the JWT.
      res.json(info);
    }
  });
});



app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) throw err;
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
  });
  

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summery, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
     res.json({ isAuthor, postDoc, info });

    if(!isAuthor){
      return res.status(400).json('you are not the author')
    }
    await Post.updateOne(
      { _id: id, author: info.id },
      {
        $set: {
          title,
          summery,
          content,
          cover: newPath? newPath : postDoc.cover,
        },
      }
    );
  });
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
  console.log("server started on port  8080");
});