const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const mongoose = require('mongoose');
const { Aptos, AptosConfig, Network } = require('@aptos-labs/ts-sdk');

const app = express();
const PORT = process.env.PORT || 3000;

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptosConfig);

// MongoDB connection
// MongoDB connection
const uri = "mongodb+srv://swayam:Swayam%402303@booksell.bexwk.mongodb.net/";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // tls: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

// Remove these lines as they’re not needed with Mongoose models
// const DATABASE_NAME = mongoose.connection.useDb("Test2");
// const ADS_DATABASE = mongoose.connection.useDb("Books");

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
// Explicitly serve assets from /checkout
app.use('/checkout', express.static(path.join(__dirname, 'public', 'checkout')));



// Configure session middleware
app.use(
  session({
    secret: 'your-secret-key', // Replace with a strong, unique key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set `secure: true` when using HTTPS
  })
);

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Function to connect to MongoDB
// async function connectToDatabase() {
//   await client.connect();
//   return client;
// }
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes for login/signup functionality
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'index.html'));
// });
app.get('/', (req, res) => {
  if (req.session.userId) {
    // If user is logged in, serve index.html with session info
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    // Redirect to login.html if not logged in
    res.redirect('/login.html');
  }
});

app.get('/', (req, res) => {
  if (req.session.userId) {
    // User is logged in
    res.render('index', { loggedIn: true });
  } else {
    // User is not logged in
    res.render('index', { loggedIn: false });
  }
});


app.get('/get-session', (req, res) => {
  if (req.session.userId) {
    res.json({
      loggedIn: true,
      phone_email: req.session.phone_email,
    });
  } else {
    res.json({ loggedIn: false });
  }
});


// Define schemas and models at the top of your file

const authorizationSchema = new mongoose.Schema({
  phone_email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetCode: String,
  resetExpiration: Date,
});

const adSchema = new mongoose.Schema({
  title: String,
  author: String,
  isbn: String,
  price: Number,
  description: String,
  category: String,
  condition: String,
  images: [String],
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
});

const warehouseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true },
  title: { type: String, required: true },
  author: String,
  isbn: String,
  condition: { type: String, enum: ['excellent', 'good', 'fair'], required: true },
  images: [String],
  price: { type: Number, required: true },
  deliveryMethod: { type: String, enum: ['self', 'pickup'], required: true },
  pickupAddress: String,
  commissionRate: { type: Number, enum: [15, 25], required: true },
  status: { type: String, enum: ['pending', 'stored', 'sold'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  name: String,
  phone: String,
  address: String,
  email: String,
  aptosAddress: { type: String, unique: true }, // New field
});


// Define models (no need to specify database names manually)
const Authorization = mongoose.model('Authorization', authorizationSchema);
const Ad = mongoose.model('Ads', adSchema);
const Profile = mongoose.model('profiles', profileSchema);


const notificationSchema = new mongoose.Schema({
  sellerId: { type: String, required: true },
  buyerId: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false },
});

const Notification = mongoose.model('Notification', notificationSchema);

// Add this with your other schemas
const orderSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ads', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/place-order', isAuthenticated, async (req, res) => {
  const {
      name, email, phone, address, city, state, zipcode, paymentMethod, bookId, txHash
  } = req.body;
  const buyerId = req.session.userId;

  try {
      if (paymentMethod === 'aptos') {
          const book = await Ad.findById(bookId);
          if (!book) {
              return res.status(404).json({ success: false, message: 'Book not found' });
          }

          // Use your fixed wallet address as the expected recipient
          const expectedRecipient = "0x5a7b460fe18b1fdef5f80c06a2538deca1d53e9c8b42a47b0da09c51919c9361"; // Replace with your actual address

          // Calculate expected amount in octas (1 APT = 100 INR, 1 APT = 10^8 octas)
          const aptAmount = book.price / 100; // Convert INR to APT
          const expectedAmount = (aptAmount * 100000000).toString(); // Convert APT to octas

          // Verify transaction
          const tx = await aptos.getTransactionByHash({ transactionHash: txHash });
          console.log('Transaction details:', tx); // Log for debugging
          if (!tx.success) {
              return res.status(400).json({ success: false, message: 'Transaction not successful' });
          }

          const payload = tx.payload;
          if (
              payload.function === '0x1::coin::transfer' &&
              payload.arguments[0] === expectedRecipient &&
              payload.arguments[1] === expectedAmount
          ) {
              const order = await Order.create({
                  bookId,
                  buyerId,
                  sellerId: book.userId,
                  status: 'paid', // Update status directly to paid
                  txHash,
              });

              // Notify seller
              const sellerProfile = await Profile.findOne({ userId: book.userId });
              const notification = {
                  sellerId: book.userId,
                  buyerId,
                  message: `A buyer has paid for your book "${book.title}" via Aptos. Check your orders.`,
                  timestamp: new Date(),
                  seen: false,
              };
              await Notification.create(notification);

              const mailOptions = {
                  from: 'swayam721765@gmail.com',
                  to: sellerProfile.email || 'default@email.com',
                  subject: 'Payment Received',
                  text: `A buyer has paid ₹${book.price} (via Aptos) for your book "${book.title}". Funds will be transferred to you soon.`,
              };
              await transporter.sendMail(mailOptions);

              const orderId = 'ORD' + Math.floor(Math.random() * 1000000);
              return res.json({ success: true, orderId });
          } else {
              return res.status(400).json({ success: false, message: 'Invalid payment details' });
          }
      } else {
          // Existing non-Aptos payment logic
          let order;
          if (bookId) {
              const book = await Ad.findById(bookId);
              if (!book) {
                  return res.status(404).json({ success: false, message: 'Book not found' });
              }

              const existingAction = await UserAction.findOne({ userId: buyerId, bookId });
              if (existingAction) {
                  return res.status(403).json({
                      success: false,
                      message: `You have already ${existingAction.action === 'buy' ? 'purchased' : 'added to cart'} this book`,
                  });
              }

              order = await Order.create({
                  bookId,
                  buyerId,
                  sellerId: book.userId,
                  status: 'pending',
              });

              await UserAction.create({ userId: buyerId, bookId, action: 'buy' });

              const notification = {
                  sellerId: book.userId,
                  buyerId,
                  message: `A buyer has requested to purchase your book "${book.title}". Check your selling orders.`,
                  timestamp: new Date(),
                  seen: false,
              };
              await Notification.create(notification);

              const sellerProfile = await Profile.findOne({ userId: book.userId });
              const mailOptions = {
                  from: 'swayam721765@gmail.com',
                  to: sellerProfile.email || 'default@email.com',
                  subject: 'New Purchase Request',
                  text: `A buyer has requested to buy your book "${book.title}" (₹${book.price}). Respond in your Selling Orders page.`,
              };
              await transporter.sendMail(mailOptions);
          }

          const orderId = 'ORD' + Math.floor(Math.random() * 1000000);
          res.json({ success: true, message: 'Order placed successfully', orderId });
      }
  } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Add this with your other schemas
const userActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ads', required: true },
  action: { type: String, enum: ['buy', 'cart'], required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserAction = mongoose.model('UserAction', userActionSchema);

app.post('/login-signup/register', async (req, res) => {
  const { phone_email, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await Authorization.findOne({ phone_email });
    if (existingUser) {
      return res.status(400).send('Email is already registered.');
    }

    // Create user in Authorization collection
    const newUser = await Authorization.create({ phone_email, password });
    const userId = newUser._id;

    // Create a default profile
    await Profile.create({
      userId,
      name: '',
      phone: '',
      address: '',
    });

    // Store user session after successful signup
    req.session.userId = userId.toString();
    req.session.phone_email = phone_email;

    res.send('Signup successful!');
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).send('Server error during signup.');
  }
});

app.post('/login-signup/login', async (req, res) => {
  const { phone_email, password } = req.body;

  try {
    const user = await Authorization.findOne({ phone_email, password });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Store user ID in session
    req.session.userId = user._id.toString(); // Convert ObjectId to string for session
    req.session.phone_email = phone_email; // Optional: store email in session
    console.log('Session started for user:', req.session.userId);

    res.json({ success: true, userId: user._id });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'swayam721765@gmail.com',
    pass: 'bvkzbspaptcgmalg',
  },
});

app.post('/login-signup/forgotPassword', async (req, res) => {
  const { phone_email } = req.body;

  try {
    const user = await Authorization.findOne({ phone_email });
    if (!user) {
      return res.status(404).send('Email not registered.');
    }

    const resetCode = crypto.randomBytes(3).toString('hex');
    const expiration = Date.now() + 15 * 60 * 1000;

    await Authorization.updateOne(
      { phone_email },
      { $set: { resetCode, resetExpiration: expiration } }
    );

    const mailOptions = {
      from: 'swayam721765@gmail.com',
      to: phone_email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}`,
    };
    await transporter.sendMail(mailOptions);
    res.send('Password reset code sent.');
  } catch (error) {
    console.error('Error during forgot password:', error);
    res.status(500).send('Server error during forgot password.');
  }
});

app.post('/login-signup/resetPassword', async (req, res) => {
  const { phone_email, resetCode, newPassword } = req.body;

  try {
    const user = await Authorization.findOne({
      phone_email,
      resetCode,
      resetExpiration: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).send('Invalid or expired reset code.');
    }

    await Authorization.updateOne(
      { phone_email },
      { $set: { password: newPassword }, $unset: { resetCode: '', resetExpiration: '' } }
    );

    res.send('Password has been reset successfully!');
  } catch (error) {
    console.error('Error during password reset:', error);
    res.status(500).send('Server error during password reset.');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Error logging out.');
    }
    res.clearCookie('connect.sid'); // Clear the session cookie
    res.send('Logged out successfully!');
  });
});


function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).send('You must log in to post an ad.');
  }
}

app.get('/profile', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('You must log in to view your profile.');
  }

  try {
    let userProfile = await Profile.findOne({ userId: req.session.userId });

    if (!userProfile) {
      userProfile = await Profile.create({
        userId: req.session.userId,
        name: '',
        phone: '',
        address: '',
      });
    }

    res.json(userProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).send('Error fetching profile.');
  }
});


// Add a route to update the user's profile
app.post('/profile/update', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('You must log in to update your profile.');
  }

  const { name, phone, address, email, aptosAddress } = req.body;

  try {
    const result = await Profile.updateOne(
      { userId: req.session.userId },
      { $set: { name, phone, address, email, aptosAddress } },
      { upsert: true }
    );

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      throw new Error('No document was updated or created.');
    }

    res.send('Profile updated successfully!');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Server error while updating profile.');
  }
});

app.get('/my-ads', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('You must log in to view your ads.');
  }
  try {
    const userAds = await Ad.find({ userId: req.session.userId });
    res.json(userAds);
  } catch (error) {
    console.error('Error fetching user ads:', error);
    res.status(500).send('Error fetching ads.');
  }
});

// Serve post-ad.html
// app.get('/post-ad.html', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'post-ad.html'));
// });

// // Protect the Post Ad route
// app.post('/post-ad', isAuthenticated, upload.array('adimage[]', 4), async (req, res) => {
//   const formData = req.body;
//   const imagePaths = req.files.map((file) => file.path);
//   const { ObjectId } = require('mongodb'); // Import ObjectId

// const adData = { 
//   ...formData, 
//   images: imagePaths, 
//   userId: new ObjectId(req.session.userId)  // Convert userId to ObjectId
// };


//   const client = await connectToDatabase();
//   try {
//     const database = client.db(ADS_DATABASE);
//     const collection = database.collection(ADS_COLLECTION);
//     await collection.insertOne(adData);

//     res.send('<h1>Ad Submitted Successfully</h1>');
//   } catch (error) {
//     res.status(500).send('Error saving ad to database');
//   } finally {
//     await client.close();
//   }
// });

app.post('/post-ad', isAuthenticated, upload.array('adimage[]', 4), async (req, res) => {
  try {
    const formData = req.body;
    const imagePaths = req.files.map((file) => file.path);
    const adData = {
      ...formData,
      images: imagePaths,
      userId: req.session.userId, // No need for ObjectId conversion here
    };
    const result = await Ad.create(adData);
    res.send('<h1>Ad Submitted Successfully</h1>');
  } catch (error) {
    console.error('Error saving ad:', error);
    res.status(500).send('Error saving ad to database');
  }
});



// Define the schema for books
const newBookSchema = new mongoose.Schema({
    isbn: { type: String, required: true, unique: true },
    title: String,
    author: String,
    publisher: String,
    year: Number,
    description: String,
});

const NewBook = require('./models/newBookModel');

// In server.js, near other schemas
const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true, unique: true },
  items: [{
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ads', required: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
  }],
  updatedAt: { type: Date, default: Date.now },
});

const Cart = mongoose.model('Cart', cartSchema);


mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});


// Endpoint to fetch book details by ISBN
app.get('/api/newBooks/:isbn', async (req, res) => {
  const { isbn } = req.params;
  console.log('Received ISBN:', isbn);

  try {
    const book = await Ad.findOne({ isbn: isbn.trim() }); // Assuming 'Ads' collection holds book data
    console.log('Query result:', book);

    if (book) {
      res.json(book);
    } else {
      res.status(404).json({ message: `Book not found for ISBN: ${isbn}` });
    }
  } catch (error) {
    console.error('Error fetching book details:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});



// Fetch all books to display as ads
app.get('/api/books', async (req, res) => {
  try {
    const books = await Ad.find({}); // Use Mongoose model
    res.json(books);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).send('Error fetching books');
  }
});

// Fetch single book details
const { Types: { ObjectId } } = require('mongoose');

// app.get('/api/book/:id', async (req, res) => {
//   const { id } = req.params;
//   const client = await connectToDatabase();

//   try {
//       const database = client.db(ADS_DATABASE);
//       const collection = database.collection(ADS_COLLECTION);

//       let book = await collection.findOne({ _id: new ObjectId(id) });

//       if (book) {
//           res.json(book);
//       } else {
//           res.status(404).json({ error: "Book not found" });
//       }
//   } catch (error) {
//       console.error("Error fetching book:", error);
//       res.status(500).json({ error: "Internal Server Error" });
//   } finally {
//       await client.close();
//   }
// });


// app.post('/api/cart/add', (req, res) => {
//   const { userId } = req.session;
//   if (!userId) return res.status(401).send('Unauthorized');

//   const { title, price, image } = req.body;
//   const cartKey = `cart_${userId}`;
//   req.session[cartKey] = req.session[cartKey] || [];
//   req.session[cartKey].push({ title, price, image });

//   res.send('Item added to cart');
// });

app.get('/books/:id', (req, res) => {
  const { id } = req.params;
  // Redirect to your book-details.html page with the ID as a query parameter
  res.redirect(`/book-details.html?id=${id}`);
});

app.get('/api/book/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const book = await Ad.findOne({ _id: new ObjectId(id) });

    if (book) {
      res.json(book);
    } else {
      res.status(404).json({ error: 'Book not found' });
    }
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Verify the cart functionality
app.post('/api/cart/add', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { title, price, image, bookId } = req.body;

  try {
    // Verify the book exists
    const book = await Ad.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Check if the user has already acted on this book
    const existingAction = await UserAction.findOne({ userId, bookId });
    if (existingAction) {
      return res.status(403).json({
        success: false,
        message: `You have already ${existingAction.action === 'buy' ? 'requested to buy' : 'added to cart'} this book.`,
      });
    }

    // Find or create the user's cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Add the item to the cart
    cart.items.push({ bookId, title, price, image });
    cart.updatedAt = new Date();
    await cart.save();

    // Record the user action
    await UserAction.create({ userId, bookId, action: 'cart' });

    res.json({ success: true, message: '✅ Book added to cart!' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ success: false, message: 'Error adding to cart' });
  }
});

app.get('/api/user-action/:bookId', isAuthenticated, async (req, res) => {
  const { bookId } = req.params;
  const userId = req.session.userId;

  try {
    const action = await UserAction.findOne({ userId, bookId });
    res.json({ hasActed: !!action, action: action ? action.action : null });
  } catch (error) {
    console.error('Error checking user action:', error);
    res.status(500).json({ success: false, message: 'Error checking action' });
  }
});

app.get('/api/cart', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    const cart = await Cart.findOne({ userId });
    res.json(cart ? cart.items : []);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
});

app.post('/api/cart/update', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { items } = req.body;

  try {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = items; // Replace the items array
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ success: true, message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ success: false, message: 'Error updating cart' });
  }
});


// Add checkout page handling
app.get('/checkout', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// app.get('/api/cart', (req, res) => {
//   const { userId } = req.session;
//   if (!userId) return res.status(401).send('Unauthorized');

//   const cartKey = `cart_${userId}`;
//   res.json(req.session[cartKey] || []);
// });


// Chat Schema (already defined, refined for clarity)
const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true }],
  lastMessage: String,
  updatedAt: { type: Date, default: Date.now },
});
const Chat = mongoose.model('Chat', chatSchema);

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Authorization', required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'You must be logged in.' });
  }
}

// Send a message
app.post('/chat/send', isAuthenticated, async (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.session.userId;

  if (!receiverId || !message) {
    return res.status(400).json({ error: 'Missing receiverId or message' });
  }

  try {
    // Check if a chat exists between these users
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, receiverId],
        lastMessage: message,
      });
    } else {
      chat.lastMessage = message;
      chat.updatedAt = new Date();
      await chat.save();
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      chatId: chat._id,
      message,
    });

    res.status(200).json({ success: true, messageId: newMessage._id });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat list (all conversations for the user)
app.get('/chat/list', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  try {
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'phone_email')
      .sort({ updatedAt: -1 });

    const chatList = await Promise.all(
      chats.map(async (chat) => {
        const otherUser = chat.participants.find((p) => p._id.toString() !== userId);
        const otherUserProfile = await Profile.findOne({ userId: otherUser._id });
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          receiverId: userId,
          createdAt: { $gt: chat.updatedAt }, // Simplified; ideally track read status
        });

        return {
          chatId: chat._id,
          otherUserId: otherUser._id,
          otherUserName: otherUserProfile?.name || otherUser.phone_email || 'Unknown User',
          lastMessage: chat.lastMessage,
          updatedAt: chat.updatedAt,
          unreadCount,
        };
      })
    );

    res.json(chatList);
  } catch (error) {
    console.error('Error fetching chat list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a specific chat
app.get('/chat/messages', isAuthenticated, async (req, res) => {
  const { chatId } = req.query;
  const userId = req.session.userId;

  if (!chatId) {
    return res.status(400).json({ error: 'Missing chatId' });
  }

  try {
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(403).json({ error: 'Chat not found or access denied' });
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/chat/start', isAuthenticated, async (req, res) => {
  const { sellerId } = req.body;
  const buyerId = req.session.userId;

  try {
    let chat = await Chat.findOne({
      participants: { $all: [buyerId, sellerId], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [buyerId, sellerId],
        lastMessage: 'Chat started',
      });
    }

    res.json({ success: true, chatId: chat._id });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/buy-book', async (req, res) => {
  const { bookId } = req.body;
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "You must be logged in to buy a book." });
  }

  try {
    const book = await Ad.findOne({ _id: new ObjectId(bookId) });
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found." });
    }

    const userId = req.session.userId;
    // Check if the user has already acted on this book
    const existingAction = await UserAction.findOne({ userId, bookId });
    if (existingAction) {
      return res.status(403).json({
        success: false,
        message: `You have already ${existingAction.action === 'buy' ? 'requested to buy' : 'added to cart'} this book.`,
      });
    }

    const sellerId = book.userId.toString();
    const buyerId = userId.toString();

    // Create a pending order
    const order = await Order.create({
      bookId: book._id,
      buyerId,
      sellerId,
      status: 'pending',
    });

    // Record the user action
    await UserAction.create({ userId, bookId, action: 'buy' });

    // Notify the seller
    const notification = {
      sellerId,
      buyerId,
      message: `A buyer has requested to purchase your book "${book.title}". Check your selling orders to respond.`,
      timestamp: new Date(),
      seen: false,
    };
    await Notification.create(notification);

    // Send email to seller
    const sellerProfile = await Profile.findOne({ userId: sellerId });
    const mailOptions = {
      from: 'swayam721765@gmail.com',
      to: sellerProfile.email || 'swayamanand2303@gmail.com',
      subject: 'New Purchase Request',
      text: `A buyer has requested to buy your book "${book.title}" (₹${book.price}). Please respond in your Selling Orders page.`,
    };
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "✅ Your order is booked! The seller will respond soon.", orderId: order._id });
  } catch (error) {
    console.error("❌ Error processing purchase request:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

app.get('/selling-orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.session.userId })
      .populate('bookId', 'title price images') // Populate book details
      .populate('buyerId', 'phone_email'); // Populate buyer details

    res.json(orders);
  } catch (error) {
    console.error('Error fetching selling orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching selling orders' });
  }
});

app.post('/selling-orders/accept', isAuthenticated, async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findOne({ _id: orderId, sellerId: req.session.userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or unauthorized.' });
    }

    order.status = 'accepted';
    await order.save();

    // Notify the buyer
    const book = await Ad.findById(order.bookId);
    const buyerProfile = await Profile.findOne({ userId: order.buyerId });
    const notification = {
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      message: `Your purchase request for "${book.title}" has been accepted!`,
      timestamp: new Date(),
      seen: false,
    };
    await Notification.create(notification);

    // Send email to buyer
    const mailOptions = {
      from: 'swayam721765@gmail.com',
      to: buyerProfile.email || 'default@email.com',
      subject: 'Purchase Request Accepted',
      text: `Your request to buy "${book.title}" (₹${book.price}) has been accepted by the seller.`,
    };
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Order accepted successfully.' });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ success: false, message: 'Error accepting order.' });
  }
});

app.post('/selling-orders/reject', isAuthenticated, async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await Order.findOne({ _id: orderId, sellerId: req.session.userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or unauthorized.' });
    }

    order.status = 'rejected';
    await order.save();

    // Notify the buyer
    const book = await Ad.findById(order.bookId);
    const buyerProfile = await Profile.findOne({ userId: order.buyerId });
    const notification = {
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      message: `Your purchase request for "${book.title}" has been rejected.`,
      timestamp: new Date(),
      seen: false,
    };
    await Notification.create(notification);

    // Send email to buyer
    const mailOptions = {
      from: 'swayam721765@gmail.com',
      to: buyerProfile.email || 'default@email.com',
      subject: 'Purchase Request Rejected',
      text: `Your request to buy "${book.title}" (₹${book.price}) has been rejected by the seller.`,
    };
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Order rejected successfully.' });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ success: false, message: 'Error rejecting order.' });
  }
});

app.get('/my-orders', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.session.userId })
      .populate('bookId', 'title price images') // Populate book details
      .populate('sellerId', 'phone_email'); // Populate seller details

    res.json(orders);
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});


// SSE: Real-time notifications for sellers

app.get('/chat/notifications/stream', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const changeStream = Message.watch([
      { $match: { 'fullDocument.receiverId': userId } },
    ]);

    changeStream.on('change', (change) => {
      if (change.operationType === 'insert') {
        const message = change.fullDocument;
        res.write(`data: ${JSON.stringify({
          type: 'newMessage',
          chatId: message.chatId,
          senderId: message.senderId,
          message: message.message,
          createdAt: message.createdAt,
        })}\n\n`);
      }
    });

    req.on('close', () => {
      console.log('SSE connection closed for user:', userId);
      changeStream.close();
      res.end();
    });
  } catch (error) {
    console.error('Error in SSE chat notifications:', error);
    res.status(500).end();
  }
});


app.get('/seller/notifications', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: "You must be logged in." });
  }

  try {
    const notifications = await Notification.find({
      sellerId: req.session.userId,
      seen: false,
    });

    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// Serve React app for /checkout route
app.get('/checkout*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout', 'index.html'));
});

// Enhanced route for searching books with more filtering options
app.get('/api/books/search', async (req, res) => {
  const { q, minPrice, maxPrice, sort } = req.query;

  try {
    const query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { isbn: { $regex: q, $options: 'i' } },
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const sortOptions = {};
    if (sort === 'price-asc') sortOptions.price = 1;
    else if (sort === 'price-desc') sortOptions.price = -1;
    else if (sort === 'title-asc') sortOptions.title = 1;
    else if (sort === 'title-desc') sortOptions.title = -1;

    const books = await Ad.find(query).sort(sortOptions);

    res.json(books);
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Error searching books' });
  }
});

// Serve warehouse.html
app.get('/warehouse', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'warehouse.html'));
});

// Handle warehouse submission
app.post('/warehouse-submit', isAuthenticated, upload.array('images[]', 4), async (req, res) => {
  try {
    const { title, author, isbn, condition, price, delivery_method, pickup_address } = req.body;
    const imagePaths = req.files.map((file) => file.path);

    const commissionRate = delivery_method === 'self' ? 15 : 25;
    const warehouseData = {
      userId: req.session.userId,
      title,
      author: author || '',
      isbn: isbn || '',
      condition,
      images: imagePaths,
      price: parseFloat(price),
      deliveryMethod: delivery_method,
      pickupAddress: delivery_method === 'pickup' ? pickup_address : '',
      commissionRate,
    };

    await Warehouse.create(warehouseData);
    res.send('<h1>Book Submitted to Warehouse Successfully</h1><p>We will contact you soon for further processing.</p>');
  } catch (error) {
    console.error('Error submitting to warehouse:', error);
    res.status(500).send('Error submitting book to warehouse');
  }
});

// Fetch user's warehouse submissions
app.get('/my-warehouse', isAuthenticated, async (req, res) => {
  try {
    const warehouseItems = await Warehouse.find({ userId: req.session.userId });
    res.json(warehouseItems);
  } catch (error) {
    console.error('Error fetching warehouse items:', error);
    res.status(500).json({ success: false, message: 'Error fetching warehouse items' });
  }
});

app.get('/books', async (req, res) => {
  const { q, category, condition } = req.query;
  try {
    let query = {};
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }
    if (category) {
      query.category = category;
    }
    if (condition) {
      query.condition = condition;
    }
    const books = await Ad.find(query); // Use Mongoose model
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.sendFile(path.join(__dirname, 'public', 'browse.html'));
    } else {
      res.json(books);
    }
  } catch (error) {
    console.error('Error fetching book ads:', error);
    res.status(500).json({ error: 'Error fetching book ads' });
  }
});

// Add a route to serve the browse page
app.get('/browse', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'browse.html'));
});

// Add an endpoint to get book categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Ad.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// Add an endpoint to get recent books
app.get('/api/books/recent', async (req, res) => {
  try {
    const recentBooks = await Ad.find({})
      .sort({ _id: -1 })
      .limit(10);
    res.json(recentBooks);
  } catch (error) {
    console.error('Error fetching recent books:', error);
    res.status(500).json({ error: 'Error fetching recent books' });
  }
});

// Add connection error handler
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
  // Attempt to reconnect
  mongoose.connect('mongodb+srv://swayam:Swayam%402303@booksell.bexwk.mongodb.net/');
});

// Add disconnection handler
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
  mongoose.connect('mongodb+srv://swayam:Swayam%402303@booksell.bexwk.mongodb.net/');
});

db.once('open', () => {
  console.log('✅ Mongoose connected to MongoDB');
  console.log('Connected to database:', mongoose.connection.db.databaseName);
  console.log('Available collections:', Object.keys(mongoose.connection.collections));
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
