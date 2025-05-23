// backend/controllers/userController.js
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- Helper function to generate JWT ---
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in .env file');
    throw new Error('Server configuration error: JWT secret missing.');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '3h',
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  // Destructure only the necessary fields: username, email, password
  const { username, email, password } = req.body;

  // --- Basic Validation ---
  // Check only for the required fields
  if (!username || !email || !password) {
    res.status(400);
    throw new Error('Please provide username, email, and password');
  }
  // Schema handles password length validation

  // --- Check if user already exists ---
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // --- Create user ---
  // Create user with only the essential fields. 'bio' will get its default value.
  const user = await User.create({
    username,
    email,
    password,
  });

  // --- Respond with user data and token ---
  if (user) {
    // Respond with only the essential non-sensitive fields and token
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      // bio removed from response
      // profilePicture removed from response
      token: generateToken(user._id),
      createdAt: user.createdAt, // Timestamps might still be useful
      updatedAt: user.updatedAt,
    });
  } else {
    res.status(500);
    throw new Error('User registration failed');
  }
});

// @desc    Authenticate a user (login)
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // --- Basic Validation ---
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // --- Find user by email ---
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Check if account is locked
  if (user.isLocked()) {
    const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000); // Convert to minutes
    res.status(401);
    throw new Error(`Account is locked. Please try again in ${lockTime} minutes.`);
  }

  // --- Check if password matches ---
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Increment login attempts
    await user.incrementLoginAttempts();

    // Check if account should be locked after this attempt
    if (user.loginAttempts >= 5) {
      res.status(401);
      throw new Error('Too many failed attempts. Account is locked for 5 minutes.');
    }

    res.status(401);
    throw new Error('Invalid email or password');
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // --- Respond with user data and token ---
  res.status(200).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
