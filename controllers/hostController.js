const { deleteFile } = require("../util/file");
const Home = require("./../models/Home");

exports.getAddHome = (req, res, next) => {
  res.render("host/edit-home", {
    editing: false,
    pageTitle: "Host Your Home",
    isLoggedIn: req.session.isLoggedIn,
    user: req.session.user,
  });
};

exports.getEditHome = (req, res, next) => {
  const homeId = req.params.homeId;
  const editing = req.query.editing === "true";
  if (!editing) {
    console.log("Editing flag not set properly");
    return res.redirect("/host/host-homes");
  }

  Home.findById(homeId).then((home) => {
    if (!home) {
      console.log("Home not found for editing");
      return res.redirect("/host/host-homes");
    }
    res.render("host/edit-home", {
      home: home,
      editing: editing,
      pageTitle: "Edit Your Home",
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user,
    });
  });
};

exports.postAddHome = (req, res, next) => {
  const { houseName, price, location, rating, description } = req.body;

  console.log("Req body: ", req.body);
  console.log("Req File: ", req.file);
  if (!req.file) {
    return res.status(400).send("No Valid image provided.");
  }

  const photoUrl = "/" + req.file.path;

  const newHome = new Home({
    houseName,
    price,
    location,
    rating,
    photoUrl,
    description,
    host: req.session.user._id,
  });

  newHome.save().then(() => res.redirect("/host/host-homes"));
};

exports.postEditHome = (req, res, next) => {
  const { id, houseName, price, location, rating, description } = req.body;

  console.log("Req body: ", req.body);
  console.log("House photo: ", req.file);

  Home.findById(id)
    .then((existingHome) => {
      if (!existingHome) {
        console.log("Home not found for editing");
        return res.redirect("/host/host-homes");
      }
      existingHome.houseName = houseName;
      existingHome.price = price;
      existingHome.location = location;
      existingHome.rating = rating;
      if (req.file) {
        deleteFile(existingHome.photoUrl.substring(1));
        existingHome.photoUrl = "/" + req.file.path;
      }
      existingHome.description = description;
      return existingHome.save();
    })
    .finally(() => {
      return res.redirect("/host/host-homes");
    });
};

exports.postDeleteHome = (req, res, next) => {
  const homeId = req.params.homeId;
  console.log(homeId);

  Home.findById(homeId).then((existingHome) => {
    if (!existingHome) {
      return res.status(404).send("Home not found");
    }
    Home.deleteOne({ _id: homeId })
      .then(() => {
        deleteFile(existingHome.photoUrl.substring(1));
        res.redirect("/host/host-homes");
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Failed to delete home from the database");
      });
  });
};

exports.getHostHomes = (req, res, next) => {
  Home.find({ host: req.session.user._id }).then((registeredHomes) => {
    res.render("host/host-homes", {
      homes: registeredHomes,
      pageTitle: "Host Homes",
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user,
    });
  });
};
