const ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({
  path: `.env.${ENV}`
});

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
const MONGO_DB_URL =
  `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@airbnb.346l3.mongodb.net/${process.env.MONGO_DB_DATABASE}?retryWrites=true&w=majority&appName=Airbnb`;

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
  // const isValidFile = file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg';

  const isValidFile = ["image/png", "image/jpeg", "image/jpg"].includes(
    file.mimetype
  );

  cb(null, isValidFile);
};

const loggingPath = path.join(rootDir, 'access.log');
const loggingStream = fs.createWriteStream(loggingPath, {file: "a"});

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
    secret: "MERN_LIVE_BATCH",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
  })
);

// app.use((req, res, next) => {
//   req.isLoggedIn = req.get("Cookie").split("=")[1] === "true";
//   next();
// });

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
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
