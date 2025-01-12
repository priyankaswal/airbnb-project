require('dotenv').config();

// code module
const path = require("path");
const fs = require('fs');

// external module
const express = require("express");
const bodyParser = require("body-parser");
const rootDir = require("./util/path-util");
const mongoose = require("mongoose");
const { authRouter } = require("./routers/authRouter");
const session = require("express-session");
const { hostRouter } = require("./routers/hostRouter");
const storeRouter = require("./routers/storeRouter");
const errorController = require("./controllers/errorController");
const mongodb_session = require("connect-mongodb-session");
const multer = require("multer");
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const MongoDBStore = mongodb_session(session);
const MONGO_DB_URL =process.env.MONGO_DB_URL;

const sessionStore = new MongoDBStore({
  uri: MONGO_DB_URL,
  collection: "sessions",
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "_") + "-" + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  const isValidFile = ["image/png", "image/jpeg", "image/jpg"].includes(
    file.mimetype
  );

  cb(null, isValidFile);
};

const loggingPath = path.join(rootDir, 'access.log');
const loggingStream = fs.createWriteStream(loggingPath, { flags: "a" });


const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream : loggingStream}));

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.static(path.join(rootDir, "public")));
app.use("/uploads",express.static(path.join(rootDir, "uploads")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({ storage, fileFilter }).single("photo"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallbackSecret",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
  })
);

app.use(storeRouter);
app.use("/host", (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  next();
});

app.use("/host", hostRouter);
app.use(authRouter);
app.use(errorController.get404);

const PORT = process.env.PORT || 3000;

mongoose.connect(MONGO_DB_URL).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});
