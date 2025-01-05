const { validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const sendGrid = require("@sendgrid/mail");
const {
  firstNameValidation,
  emailValidation,
  passwordValidation,
  confirmPasswordValidation,
  userTypeValidation,
  termsValidation,
  lastNameValidation,
} = require("./validations");
const SEND_GRID_KEY = process.env.SENDGRID_API_KEY;

sendGrid.setApiKey(SEND_GRID_KEY);
const MILLIS_IN_MINUTE = 60 * 1000;

exports.getLogin = (req, res, next) => {
  res.render("auth/login", { pageTitle: "Login", isLoggedIn: false });
};

exports.getForgotPassword = (req, res, next) => {
  res.render("auth/forgot", {
    pageTitle: "Forgot Password",
    isLoggedIn: false,
  });
};

exports.getResetPassword = (req, res, next) => {
  const email = req.query.email;

  res.render("auth/reset_password", {
    pageTitle: "Reset Password",
    isLoggedIn: false,
    email: email,
  });
};

exports.postResetPassword = [
  passwordValidation,
  confirmPasswordValidation,

  async (req, res, next) => {
    const { email, otp, password, confirm_password } = req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("auth/reset_password", {
        pageTitle: "Reset Password",
        isLoggedIn: false,
        email: email,
        errorMessages: errors.array().map((err) => err.msg),
      });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("User not found.");
      } else if (user.otpExpiry < Date.now()) {
        throw new Error("OTP expired.");
      } else if (user.otp !== otp) {
        throw new Error("OTP does not match.");
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
      user.otp = undefined;
      user.otpExpiry = undefined;

      await user.save();
      res.redirect("/login");
    } catch (err) {
      res.render("auth/reset_password", {
        pageTitle: "Reset Password",
        isLoggedIn: false,
        email: email,
        errorMessages: [err.message],
      });
    }
  },
];

exports.postForgotPassword = async (req, res, next) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 20 * MILLIS_IN_MINUTE;
    await user.save();
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    const forgotEmail = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: "Here is your otp to reset your password.",
      html: `<h1> OTP is: ${otp} </h1>
      <p> Enter this OTP on <a href="${baseUrl}/reset-password?email=${email}.com">Rest Password</a> page. </p>`,
    };

    await sendGrid.send(forgotEmail);
    res.redirect(`/reset-password?email=${email}`);
  } catch (err) {
    res.render("auth/forgot", {
      pageTitle: "Forgot Password",
      isLoggedIn: false,
      errorMessages: [err.message],
    });
  }
};

exports.postLogin = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("User not found.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Password does not match");
    }

    req.session.isLoggedIn = true;
    req.session.user = user;
    await req.session.save();
    res.redirect("/");
  } catch (err) {
    res.render("auth/login", {
      pageTitle: "Login",
      isLoggedIn: false,
      errorMessages: [err.message],
    });
  }
};

exports.postLogout = (req, res, next) => {
  req.session.destroy();
  res.redirect("/login");
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", { pageTitle: "Signup", isLoggedIn: false });
};

exports.postSignup = [
  firstNameValidation,
  lastNameValidation,
  emailValidation,
  passwordValidation,
  confirmPasswordValidation,
  userTypeValidation,
  termsValidation,
  async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("auth/signup", {
        pageTitle: "Signup",
        isLoggedIn: false,
        errorMessages: errors.array().map((err) => err.msg),
        oldInput: req.body,
      });
    }

    const { firstName, lastName, email, password, userType } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        userType,
      });

      await user.save();

      const welcomeEmail = {
        to: email,
        from: process.env.FROM_EMAIL,
        subject: "Welcome to apna airbnb !!!",
        html: `<h1> Welcome  ${firstName} ${lastName}. Please book your first vacation home with us. </h1>`,
      };

      await sendGrid.send(welcomeEmail);
      res.redirect("/login");
    } catch (err) {
      return res.status(422).render("auth/signup", {
        pageTitle: "Signup",
        isLoggedIn: false,
        errorMessages: [err.message],
        oldInput: req.body,
      });
    }
  },
];
